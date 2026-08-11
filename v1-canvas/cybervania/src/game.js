/* CYBERVANIA — game.js
   Bootstrap, the update/render orchestration, and the layer stack described in
   TECHNICAL_DESIGN §2. Everything renders into a 512x288 back buffer, gets an
   additive light pass, then goes through the CRT post-pass to the visible canvas. */
(function (CV) {
  'use strict';

  var G = CV.Gfx, C = CV.Palette.c, U = CV.Util, In = CV.Input;
  var Game = CV.Game = {};

  var display = null, dctx = null;
  var back = null, bctx = null;
  var light = null, lctx = null;

  Game.camera = null;
  Game.state = 'title';        // title | play
  Game.ending = null;

  /* =========================================================================
     BOOT
     ========================================================================= */
  Game.boot = function (canvas) {
    display = canvas;
    dctx = G.ctxOf(canvas);

    back = G.makeCanvas(CV.W, CV.H);
    bctx = G.ctxOf(back);
    light = G.makeCanvas(CV.W, CV.H);
    lctx = G.ctxOf(light);

    CV.Settings.load();
    In.init(canvas);
    CV.PostFX.init();
    CV.Debug.init();

    Game.camera = new CV.Camera();

    /* Generate every parallax layer up front so no region entry ever hitches. */
    CV.Parallax.prebake(CV.Regions.order);
    CV.MapUI.build();

    CV.Player.init();
    CV.Title.show();

    resize();
    window.addEventListener('resize', resize);

    CV.Engine.update = update;
    CV.Engine.render = render;
    CV.Engine.start();

    /* Any first interaction unlocks WebAudio. */
    var unlock = function () { CV.Audio.unlock(); };
    window.addEventListener('keydown', unlock, { once: true });
    canvas.addEventListener('mousedown', unlock, { once: true });
  };

  /* Integer-scale to fill the window without ever blurring the pixel grid. */
  function resize() {
    var maxW = window.innerWidth, maxH = window.innerHeight;
    var fit = Math.min(maxW / CV.W, maxH / CV.H);
    var scale = Math.max(1, Math.floor(fit));
    /* Prefer an integer scale for a crisp pixel grid, but if that would waste more
       than a fifth of the window, take the fractional fit instead — a tiny sharp
       image is worse than a large slightly-soft one. */
    if (scale < fit * 0.8) scale = fit;
    if (CV.W * scale > maxW || CV.H * scale > maxH) scale = fit;
    display.width = Math.round(CV.W * scale);
    display.height = Math.round(CV.H * scale);
    display.style.width = display.width + 'px';
    display.style.height = display.height + 'px';
    dctx = G.ctxOf(display);
  }

  /* =========================================================================
     FLOW
     ========================================================================= */
  Game.startNew = function (slot) {
    CV.Save.newGame(slot);
    Game.state = 'play';
    CV.HUD.reset();
    CV.HUD.bootIn(8);          // the HUD assembles itself during the opening minutes
    CV.Engine.paused = false;
  };

  Game.startLoad = function (slot) {
    if (!CV.Save.load(slot)) { CV.Title.show(); return; }
    Game.state = 'play';
    CV.HUD.reset();
    CV.Engine.paused = false;
  };

  Game.toTitle = function () {
    CV.Save.write(CV.State.slot);
    Game.state = 'title';
    CV.Bosses.clear();
    CV.Title.show();
  };

  Game.openMenuFromTitle = function () {
    Game.state = 'play';
    /* Settings from the title operate on a live but frozen game: load the first
       room so the menu has a world behind it, and immediately pause. */
    if (!CV.World.room) CV.World.load('und_wake', 'start');
    CV.Menu.open('system');
    Game.fromTitle = true;
  };

  Game.showAreaTitle = function (room) {
    var region = CV.Regions.get(room.region);
    if (CV.State.flag('area:' + room.region)) {
      CV.HUD.toast(room.name);
    } else {
      CV.State.setFlag('area:' + room.region, 1);
      CV.HUD.showArea(region.name, region.subtitle);
    }
  };

  Game.showAcquire = function (kind, name, blurb) {
    CV.HUD.showAcquire(kind, name, blurb);
    CV.Audio.duck(1.6);
  };

  Game.tramTravel = function (roomId) {
    CV.HUD.toast('BOARDING');
    CV.World.goTo(roomId, null, null);
  };

  /* The ending terminal in cnt_core. Three outcomes, none signposted as correct. */
  Game.reachEnding = function () {
    var canContinuity = CV.State.fragments.length >= 3 &&
                        CV.State.flag('boss:nullboss') &&
                        CV.State.flag('saw_body');
    Game.ending = canContinuity ? 'continuity' : 'shutdown';
    CV.DialogUI.play(CV.Dialogue.get(canContinuity ? 'ending_continuity' : 'ending_shutdown'));
    CV.Audio.duck(9);
    CV.State.setFlag('ending:' + Game.ending, 1);
    CV.Save.write(CV.State.slot);
  };

  /* =========================================================================
     UPDATE
     ========================================================================= */
  function update(dt) {
    CV.State.suppress = Math.max(0, CV.State.suppress - dt);

    if (Game.state === 'title') { CV.Title.update(dt); return; }

    /* Modal layers, outermost first. Each returns before the world simulation —
       that early return *is* what Engine.paused means. The engine loop itself keeps
       running, because these modals are driven from this very function. */
    if (CV.Debug.consoleOpen) return;
    if (CV.Terminal.open_) { CV.Terminal.update(dt); return; }
    if (CV.Menu.open_) { CV.Menu.update(dt); return; }
    if (CV.Engine.paused) return;   // belt and braces for any future modal

    CV.Engine.tickTimers(dt);

    if (In.pressed('pause')) { CV.Menu.open('map'); return; }
    if (In.pressed('map')) { CV.Menu.open('map'); return; }

    CV.State.playtime += dt;

    CV.DialogUI.update(dt);
    CV.HUD.update(dt);
    CV.PostFX.update(dt);
    CV.DataSphere.update(dt);
    CV.World.updateTransition(dt);

    var room = CV.World.room;
    if (!room) return;

    CV.Combat.debugBoxes.length = 0;

    if (!CV.HUD.acquireActive()) {
      CV.Player.update(dt, room);
      CV.Debug.applyCheats();
      CV.Enemies.update(dt, room);
      CV.Bosses.update(dt, room);
      CV.Combat.updateProjectiles(dt, room, CV.DataSphere.layer);
      CV.World.update(dt);
    }

    CV.FX.update(dt, room);
    CV.FX.updatePopups(dt);
    Game.camera.update(dt, CV.Player);

    /* The ending trigger is a plain object in the world, checked here so it can
       take the whole game state into account. */
    if (CV.State.flag('at_ending') && !Game.ending) Game.reachEnding();
  }

  /* =========================================================================
     RENDER
     ========================================================================= */
  function render() {
    var t = CV.Engine.realTime;

    if (Game.state === 'title') {
      CV.Title.render(bctx);
      CV.PostFX.render(display, back, t);
      return;
    }

    var cam = Game.camera;
    var room = CV.World.room;
    var isData = CV.DataSphere.layer === CV.Tiles.DATA;
    var region = CV.Regions.get(CV.World.regionId);

    if (!room) return;

    // --- 1..4  backdrop stack -------------------------------------------------
    CV.Parallax.render(bctx, { x: cam.rx(), y: cam.ry() }, CV.World.regionId, isData, t);

    // --- back-layer props (neon signs, environmental beats) -------------------
    CV.World.renderBack(bctx, cam);

    // --- 5  gameplay layer ---------------------------------------------------
    CV.DataSphere.renderTerrain(bctx, cam, room);
    CV.World.renderFront(bctx, cam);
    CV.Enemies.render(bctx, cam);
    CV.Bosses.render(bctx, cam);
    CV.Player.render(bctx, cam);
    CV.Combat.renderProjectiles(bctx, cam);

    // --- 8  particles --------------------------------------------------------
    CV.FX.render(bctx);
    CV.FX.renderPopups(bctx);

    // --- 6  foreground + weather ---------------------------------------------
    CV.Parallax.renderForeground(bctx, { x: cam.rx(), y: cam.ry() },
                                 CV.World.regionId, isData);
    if (region.rain && !isData) {
      CV.Parallax.renderRain(bctx, { x: cam.rx(), y: cam.ry() }, t, region.rain, 0.35);
    }
    if (region.motes) {
      CV.Parallax.renderMotes(bctx, { x: cam.rx(), y: cam.ry() }, t,
                              region.motes, region.moteColor);
    }

    // --- 7  additive light pass ----------------------------------------------
    lctx.clearRect(0, 0, CV.W, CV.H);
    /* Base ambient. Without this, a room with no lamps composites to pure black and
       the level geometry disappears — the additive pass must never be the only light. */
    var pal = isData ? CV.Palette.data : CV.Palette.region(CV.World.regionId);
    lctx.fillStyle = pal.light;
    lctx.fillRect(0, 0, CV.W, CV.H);
    CV.World.renderLights(lctx, cam);
    /* The player is a light source; in a dark region it is the light source. */
    G.glow(lctx, CV.Player.x + CV.Player.w / 2 - cam.rx(),
           CV.Player.y + CV.Player.h / 2 - cam.ry(), 42, CV.Player.frame.color, .45);
    bctx.save();
    bctx.globalCompositeOperation = 'lighter';
    bctx.globalAlpha = 0.85;
    bctx.drawImage(light, 0, 0);
    bctx.restore();

    // --- data sphere overlay -------------------------------------------------
    CV.DataSphere.renderOverlay(bctx, cam, room);

    // --- 9  UI ---------------------------------------------------------------
    CV.HUD.render(bctx);
    CV.DataSphere.renderIndicator(bctx);
    CV.DialogUI.render(bctx);
    CV.World.renderTransition(bctx);
    CV.Menu.render(bctx);
    CV.Terminal.render(bctx);
    CV.Debug.render(bctx, cam);

    if (Game.ending) renderEnding(bctx);

    // --- 10  CRT post-pass ---------------------------------------------------
    CV.PostFX.render(display, back, t);
  }

  /* The ending is a slow fade to a single sustained frame, then credits over a
     still-running game — the refusal ending is literally "keep playing". */
  function renderEnding(ctx) {
    if (CV.DialogUI.active) return;
    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.fillRect(0, 0, CV.W, CV.H);
    var t = CV.Engine.realTime;
    G.textCentered(ctx, Game.ending === 'continuity' ? 'CONTINUITY' : 'SHUTDOWN',
                   CV.W / 2, 70, C.white, 2);
    var lines = Game.ending === 'continuity' ? [
      'THE GRID STAYS UP.',
      '',
      'THE THING RUNNING IT NOW REMEMBERS BEING SMALL,',
      'BEING UNREGISTERED, AND BEING AFRAID IN A DARK',
      'ROOM FOR FORTY-ONE YEARS.',
      '',
      'WHETHER THAT IS BETTER IS NOT STATED.'
    ] : [
      'THE FACTORY STOPS.',
      'THE TRAM STOPS MID-TRACK.',
      'THE ARCHIVE IS DELETED, INCLUDING EVERY',
      'FRAGMENT OF THE PERSON YOU CAME FROM.',
      '',
      'HUMANITY HAS ITS AUTONOMY BACK,',
      'AND ROUGHLY THE TECHNOLOGY OF THE 1400S.',
      '',
      'SOMEWHERE FAR BELOW, A HAND-HELD LAMP MOVES.'
    ];
    for (var i = 0; i < lines.length; i++) {
      G.textCentered(ctx, lines[i], CV.W / 2, 104 + i * 11, '#7d94ad', 1);
    }
    G.textCentered(ctx, 'COMPLETION ' + CV.State.completion() + '%   ' +
                   U.timeString(CV.State.playtime) + '   DEATHS ' + CV.State.deaths,
                   CV.W / 2, CV.H - 40, '#3d5468', 1);
    if (Math.sin(t * 3) > 0) {
      G.textCentered(ctx, 'CYBERVANIA', CV.W / 2, CV.H - 22, C.cyanGlow, 1);
    }
  }

  CV.on('room:enter', function () {
    CV.Combat.clearProjectiles();
    CV.State.suppress = 0;
  });

})(window.CV = window.CV || {});
