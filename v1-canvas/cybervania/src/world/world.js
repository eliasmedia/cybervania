/* CYBERVANIA — world/world.js
   The world manager: room loading, doors and transitions, object instantiation,
   interactables, and the additive light pass. Everything the player can touch that
   is not a tile or an enemy lives here. */
(function (CV) {
  'use strict';

  var G = CV.Gfx, C = CV.Palette.c, U = CV.Util, TS = 16, S = CV.Sprites;

  var W = CV.World = {};

  W.room = null;          // live Room instance
  W.regionId = 'undercity';
  W.objects = [];
  W.lights = [];
  W.transition = 0;       // 0..1 wipe amount
  W.transitionDir = 0;    // 1 = out, -1 = in
  W.pendingRoom = null;
  W.prompt = null;        // {text, x, y} nearest interactable
  W.time = 0;
  W.ambientTimer = 22;

  /* ===========================================================================
     OBJECT INSTANTIATION
     Map files declare objects in tile coordinates; we convert to pixels once.
     =========================================================================== */

  function inst(def, room) {
    var o = {
      t: def.t,
      def: def,
      x: (def.x || 0) * TS,
      y: (def.y || 0) * TS,
      w: (def.w || 1) * TS,
      h: (def.h || 1) * TS,
      id: def.id || (def.t + '@' + room.id + ':' + def.x + ',' + def.y),
      seed: (def.x || 0) * 7.13 + (def.y || 0) * 3.71,
      active: true,
      used: false,
      layerOnly: def.layer === undefined ? -1 : def.layer   // -1 = both layers
    };
    if (def.t === 'dock' || def.t === 'divePort' || def.t === 'tram') { o.w = TS * 2; o.h = TS * 2; }
    if (def.t === 'terminal' || def.t === 'graffiti') { o.w = TS; o.h = TS; }
    return o;
  }

  W.load = function (roomId, spawnName, spawnPx) {
    var room = CV.Rooms.instance(roomId);
    if (!room) return false;

    CV.Engine.clearTimers();
    W.room = room;
    W.regionId = room.region;
    W.objects = [];
    W.prompt = null;

    /* Gates the player has permanently opened are per-room state; recompute from
       progression so a reloaded save shows cut barriers as cut. */
    room.opened = {};

    var defs = room.def.objects || [];
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      if (d.t === 'spawn') continue;
      /* Collected pickups and read terminals persist across visits. */
      var o = inst(d, room);
      /* `gate` holds an object back until a flag is set — a boss reward sitting in
         the arena it drops in, for example. */
      if (d.gate && !CV.State.flag(d.gate)) continue;
      if (d.t === 'pickup' && CV.State.hasPickup(o.id)) continue;
      if (d.t === 'enemy' && d.once && CV.State.flag('killed:' + o.id)) continue;
      if (d.t === 'boss' && CV.State.flag('boss:' + d.boss)) continue;
      W.objects.push(o);
    }

    /* Clear before arming: the Compiler leaves compiled terrain behind, and a stale
       boss from the previous room must not survive the transition. */
    CV.Enemies.clear();
    if (CV.Bosses.current && CV.Bosses.current.def.onLeave) {
      CV.Bosses.current.def.onLeave(CV.Bosses.current, room);
    }
    CV.Bosses.clear();

    for (var j = 0; j < W.objects.length; j++) {
      var ob = W.objects[j];
      if (ob.t === 'enemy') CV.Enemies.spawn(ob.def.e, ob.x + TS / 2, ob.y + TS, ob.id, ob.def);
      if (ob.t === 'boss') CV.Bosses.arm(ob);
    }

    W.lights = room.getLights();
    CV.FX.clear();

    CV.State.discoverRoom(roomId);
    CV.Audio.setRegion(room.music || room.region);

    /* Position the player. */
    var p = CV.Player;
    if (spawnPx) { p.x = spawnPx.x; p.y = spawnPx.y; }
    else {
      var sp = CV.Rooms.spawnPoint(room.def, spawnName);
      if (sp) { p.x = sp.x * TS + (TS - p.w) / 2; p.y = sp.y * TS + TS - p.h; }
    }
    p.vx = 0; p.vy = 0;
    CV.Collision.resolveOverlap(p, room, CV.DataSphere.layer);

    CV.Game.camera.setRoom(room);
    CV.Game.camera.snapTo(p.x + p.w / 2, p.y + p.h / 2);

    /* Arm doors only once the player has stepped clear of them. Spawn points sit
       next to (and sometimes inside) the door that produced them; without this a
       room transition can bounce straight back the way it came. */
    for (var k = 0; k < W.objects.length; k++) {
      var dr = W.objects[k];
      if (dr.t !== 'door') continue;
      dr.armed = !U.rectsOverlap(p.x - 4, p.y - 4, p.w + 8, p.h + 8,
                                 dr.x, dr.y, dr.w, dr.h);
    }

    CV.Game.showAreaTitle(room);
    CV.emit('room:enter', room);

    /* Rooms can fire a one-shot script the first time they are entered. */
    if (room.def.onEnter && !CV.State.flag('entered:' + roomId)) {
      CV.State.setFlag('entered:' + roomId, 1);
      var sc = CV.Dialogue.get(room.def.onEnter);
      if (sc) CV.Engine.after(0.6, function () { CV.DialogUI.play(sc); });
    }
    return true;
  };

  /* Queue a transition; the wipe plays, then the room swaps at the midpoint. */
  W.goTo = function (roomId, spawnName, spawnPx) {
    if (W.pendingRoom) return;
    W.pendingRoom = { room: roomId, spawn: spawnName, px: spawnPx };
    W.transitionDir = 1;
    CV.Audio.sfx('door');
  };

  W.updateTransition = function (dt) {
    if (W.transitionDir === 1) {
      W.transition = Math.min(1, W.transition + dt * 5.5);
      if (W.transition >= 1 && W.pendingRoom) {
        var t = W.pendingRoom;
        W.pendingRoom = null;
        W.load(t.room, t.spawn, t.px);
        W.transitionDir = -1;
      }
    } else if (W.transitionDir === -1) {
      W.transition = Math.max(0, W.transition - dt * 4.0);
      if (W.transition <= 0) W.transitionDir = 0;
    }
  };

  /* ===========================================================================
     UPDATE
     =========================================================================== */

  W.update = function (dt) {
    W.time += CV.Engine.realTime === 0 ? 0 : 0;   // (time advances below on real clock)
    W.time += dt;
    if (!W.room) return;

    var p = CV.Player, layer = CV.DataSphere.layer;
    var best = null, bestD = 1e9;

    for (var i = 0; i < W.objects.length; i++) {
      var o = W.objects[i];
      if (!o.active) continue;
      if (o.layerOnly >= 0 && o.layerOnly !== layer) continue;

      var overlap = U.rectsOverlap(p.x, p.y, p.w, p.h, o.x, o.y, o.w, o.h);

      switch (o.t) {
        case 'door':
          if (!o.armed) {
            /* Re-arm as soon as the player is clear, with a little hysteresis. */
            if (!U.rectsOverlap(p.x - 4, p.y - 4, p.w + 8, p.h + 8, o.x, o.y, o.w, o.h)) {
              o.armed = true;
            }
          } else if (overlap && !W.pendingRoom && !p.dead) {
            /* Carry the player's velocity through the door so momentum survives. */
            W.goTo(o.def.to, o.def.spawn || null, null);
            CV.Player.carryVx = p.vx;
          }
          break;

        case 'trigger':
          if (overlap && !o.used) {
            o.used = true;
            if (o.def.once !== false) CV.State.setFlag('trigger:' + o.id, 1);
            W.fireTrigger(o);
          }
          break;

        case 'dock': case 'terminal': case 'divePort': case 'tram': case 'graffiti': {
          var cx = o.x + o.w / 2, cy = o.y + o.h / 2;
          var d = U.dist(p.x + p.w / 2, p.y + p.h / 2, cx, cy);
          if (d < 30 && d < bestD) {
            /* Dive ports only offer a dive if the player can actually dive. */
            if (o.t === 'divePort' && !CV.State.hasModule('datashift')) break;
            bestD = d;
            best = { o: o, x: cx, y: o.y - 6 };
          }
          break;
        }

        case 'pickup':
          if (overlap) { W.collect(o); }
          break;
      }
    }

    W.prompt = best;

    if (best && CV.Input.pressed('interact')) W.interact(best.o);

    /* Ambient ATLAS broadcasts — rare, banal, unprompted. */
    W.ambientTimer -= dt;
    if (W.ambientTimer <= 0) {
      W.ambientTimer = 40 + CV.rng.range(0, 50);
      var lines = CV.Dialogue.ambient[W.regionId];
      if (lines && !CV.DialogUI.active && !CV.Bosses.current) {
        CV.HUD.broadcast(CV.rng.pick(lines));
      }
    }
  };

  W.interact = function (o) {
    switch (o.t) {
      case 'dock':
        CV.State.setDock(W.room.id, o.x, o.y);
        CV.Player.heal(999);
        CV.Player.energy = CV.Player.maxEnergy();
        CV.Save.autosave();
        CV.Audio.sfx('save');
        CV.HUD.toast('DOCKED — SYSTEM SAVED');
        CV.PostFX.whiteFlash(.25, C.cyan);
        CV.Menu.open('frames');
        break;

      case 'terminal': case 'graffiti': {
        var entry = CV.Lore.entries[o.def.lore];
        if (entry) {
          CV.State.readLore(o.def.lore);
          CV.Terminal.open(entry);
          CV.Audio.sfx('terminal');
        }
        break;
      }

      case 'divePort':
        CV.DataSphere.diveAtPort(o);
        break;

      case 'tram':
        CV.State.unlockTram(o.def.id, W.room.id, o.def.name || W.room.name);
        CV.Menu.open('map', { travelFrom: o });
        break;
    }
  };

  W.collect = function (o) {
    o.active = false;
    CV.State.takePickup(o.id);
    var k = o.def.kind;
    CV.Audio.sfx('pickup');
    CV.PostFX.whiteFlash(.3, C.cyan);
    CV.FX.ring(o.x + o.w / 2, o.y + o.h / 2 - 8, C.cyan, 150, 18);

    if (k === 'module') {
      CV.State.giveModule(o.def.mod);
      CV.Game.showAcquire('MODULE ACQUIRED', CV.Modules.defs[o.def.mod].name,
                          CV.Modules.defs[o.def.mod].blurb);
    } else if (k === 'frame') {
      CV.State.giveFrame(o.def.frame);
      CV.Game.showAcquire('CHASSIS PATTERN', CV.Frames.defs[o.def.frame].name,
                          CV.Frames.defs[o.def.frame].blurb);
    } else if (k === 'shard') {
      CV.State.addShard();
      CV.HUD.toast('CORE SHARD  ' + (CV.State.shards % 3) + '/3');
      if (CV.State.shards % 3 === 0) {
        CV.Player.maxHp++; CV.Player.hp = CV.Player.maxHp;
        CV.Game.showAcquire('INTEGRITY UP', 'CORE SHARD', 'MAXIMUM INTEGRITY INCREASED.');
      }
    } else if (k === 'capacitor') {
      CV.State.capacitors++;
      CV.Game.showAcquire('CAPACITOR', 'ENERGY CELL', 'MAXIMUM ENERGY +10 ON ALL FRAMES.');
    } else if (k === 'augment') {
      CV.State.giveAugment(o.def.aug);
      CV.Game.showAcquire('AUGMENT', CV.Player.augmentName(o.def.aug),
                          CV.Player.augmentBlurb(o.def.aug));
    } else if (k === 'fragment') {
      CV.State.addFragment(o.def.lore);
      CV.HUD.toast('DATA FRAGMENT  ' + CV.State.fragments.length + '/24');
      if (o.def.lore && CV.Lore.entries[o.def.lore]) {
        CV.State.readLore(o.def.lore);
        CV.Terminal.open(CV.Lore.entries[o.def.lore]);
      }
    }
  };

  W.fireTrigger = function (o) {
    var d = o.def;
    if (d.script) {
      var sc = CV.Dialogue.get(d.script);
      if (sc) CV.DialogUI.play(sc);
    }
    if (d.flag) CV.State.setFlag(d.flag, 1);
    if (d.alarm) { CV.PostFX.pulse(1, .8); CV.Engine.addTrauma(.5); CV.Audio.sfx('alarm'); }
    if (d.music) CV.Audio.setRegion(d.music);
  };

  /* ===========================================================================
     RENDER
     =========================================================================== */

  W.renderBack = function (ctx, cam) {
    var layer = CV.DataSphere.layer;
    /* Props that sit behind the tile layer: signs, structures, environmental beats. */
    for (var i = 0; i < W.objects.length; i++) {
      var o = W.objects[i];
      if (o.t !== 'sign' && o.t !== 'prop') continue;
      if (!o.active) continue;
      if (o.layerOnly >= 0 && o.layerOnly !== layer) continue;
      if (!cam.visible(o.x - 40, o.y - 40, o.w + 80, o.h + 80)) continue;
      ctx.save();
      ctx.translate((o.x + o.w / 2 - cam.rx()) | 0, (o.y + o.h - cam.ry()) | 0);
      if (o.t === 'sign') {
        S.props.sign(ctx, { w: (o.def.w || 4) * TS, h: (o.def.h || 2) * TS,
                            label: o.def.label, color: o.def.color || C.magenta,
                            seed: o.seed }, W.time);
      } else {
        W.drawProp(ctx, o);
      }
      ctx.restore();
    }
  };

  W.renderFront = function (ctx, cam) {
    var layer = CV.DataSphere.layer;
    for (var i = 0; i < W.objects.length; i++) {
      var o = W.objects[i];
      if (!o.active) continue;
      if (o.t === 'sign' || o.t === 'prop' || o.t === 'enemy' || o.t === 'boss' ||
          o.t === 'door' || o.t === 'trigger') continue;
      if (o.layerOnly >= 0 && o.layerOnly !== layer) continue;
      if (!cam.visible(o.x - 32, o.y - 40, o.w + 64, o.h + 64)) continue;

      ctx.save();
      ctx.translate((o.x + o.w / 2 - cam.rx()) | 0, (o.y + o.h - cam.ry()) | 0);
      switch (o.t) {
        case 'dock':
          S.props.dock(ctx, o, W.time, CV.State.dockRoom === W.room.id);
          break;
        case 'terminal':
          S.props.terminal(ctx, o, W.time, CV.State.hasLore(o.def.lore));
          break;
        case 'divePort':
          S.props.divePort(ctx, o, W.time);
          break;
        case 'tram':
          S.props.tram(ctx, o, W.time, CV.State.hasTram(o.def.id));
          break;
        case 'graffiti':
          W.drawGraffiti(ctx, o);
          break;
        case 'pickup':
          S.props.pickup(ctx, o.def.kind, W.time + o.seed);
          break;
        case 'echo':
          W.drawEcho(ctx, o);
          break;
      }
      ctx.restore();
    }

    /* Interact prompt — a small bracketed key hint above the nearest thing. */
    if (W.prompt && !CV.DialogUI.active && !CV.Menu.open_) {
      var px = (W.prompt.x - cam.rx()) | 0, py = (W.prompt.y - cam.ry()) | 0;
      var bob = Math.round(Math.sin(W.time * 4) * 1.5);
      var label = '[' + CV.Input.labelFor('interact') + ']';
      var tw = G.textWidth(label, 1);
      G.panel(ctx, px - tw / 2 - 3, py - 10 + bob, tw + 6, 11, C.cyan, .8);
      G.text(ctx, label, px - tw / 2, py - 7 + bob, C.cyanGlow, 1);
    }
  };

  W.drawProp = function (ctx, o) {
    var k = o.def.kind;
    if (k === 'body') {
      /* Dr. Halder. Still in the chair. The game does not comment. */
      S.plate(ctx, -9, -14, 18, 3, '#2a2530');
      S.plate(ctx, -7, -11, 3, 11, '#221d28');
      S.plate(ctx, 4, -11, 3, 11, '#221d28');
      S.plate(ctx, -6, -26, 12, 13, '#3a3038');
      ctx.fillStyle = '#4a3f46'; ctx.fillRect(-4, -32, 8, 7);
      ctx.fillStyle = '#1a1418'; ctx.fillRect(-3, -30, 6, 4);
      ctx.fillStyle = CV.Palette.alpha(C.cyanDim, .35);
      ctx.fillRect(-1, -33, 2, 3);
      G.glow(ctx, 0, -24, 26, '#4a3f56', .18);
    } else if (k === 'rig') {
      S.plate(ctx, -14, -30, 28, 30, C.steelDark, C.steel, C.ink);
      ctx.fillStyle = '#04120c'; ctx.fillRect(-11, -27, 22, 14);
      ctx.fillStyle = CV.Palette.alpha(C.green, .5 + Math.sin(W.time * 2) * .2);
      for (var i = 0; i < 4; i++) ctx.fillRect(-9, -25 + i * 3, 6 + (i * 5) % 13, 1);
      G.glow(ctx, 0, -20, 24, C.green, .3);
    } else if (k === 'vending') {
      S.plate(ctx, -8, -28, 16, 28, '#2a2038', '#463a58', C.ink);
      ctx.fillStyle = '#0a0a12'; ctx.fillRect(-6, -25, 12, 15);
      ctx.fillStyle = CV.Palette.alpha(C.magenta, .7);
      ctx.fillRect(-6, -25, 12, 1);
      for (var r = 0; r < 3; r++) {
        ctx.fillStyle = ['#ff5a7a', '#5affa0', '#5aa0ff'][r];
        ctx.fillRect(-5, -23 + r * 5, 3, 3);
        ctx.fillRect(0, -23 + r * 5, 3, 3);
      }
      ctx.fillStyle = CV.Palette.alpha(C.green, .8);
      G.text(ctx, 'OK', -5, -8, C.green, 1);
      G.glow(ctx, 0, -18, 20, C.magenta, .25);
    } else if (k === 'busbot') {
      /* Unit 6. Waiting at stop 114 for people who are not coming. */
      var sway = Math.sin(W.time * .7) * 1;
      ctx.save(); ctx.translate(sway, 0);
      S.plate(ctx, -4, -6, 3, 6, C.steelDark);
      S.plate(ctx, 1, -6, 3, 6, C.steelDark);
      S.plate(ctx, -5, -15, 10, 9, C.rust, '#a8683e', C.ink);
      S.plate(ctx, -4, -20, 8, 5, '#6b4030');
      S.optic(ctx, -1, -18, 3, 2, CV.Palette.alpha(C.amber, .55));
      ctx.restore();
    } else if (k === 'crate') {
      S.plate(ctx, -8, -16, 16, 16, '#3a2e1c', '#5c4a2c', C.ink);
      ctx.fillStyle = CV.Palette.alpha(C.amber, .4);
      ctx.fillRect(-6, -12, 12, 1); ctx.fillRect(-6, -6, 12, 1);
    } else if (k === 'chair') {
      S.plate(ctx, -6, -4, 12, 3, '#2a2530');
      S.plate(ctx, -6, -16, 3, 12, '#221d28');
      S.plate(ctx, 3, -16, 3, 12, '#221d28');
    } else if (k === 'plant') {
      S.plate(ctx, -4, -6, 8, 6, '#4a3a2c');
      ctx.fillStyle = '#2c4a30';
      for (var p = 0; p < 5; p++) {
        var a = -1.6 + p * .65;
        ctx.fillRect(Math.round(Math.cos(a) * 5), -6 + Math.round(Math.sin(a) * 5) - 2, 2, 4);
      }
    }
  };

  W.drawGraffiti = function (ctx, o) {
    var read = CV.State.hasLore(o.def.lore);
    var col = o.def.color || C.magenta;
    ctx.globalAlpha = read ? .55 : .8;
    /* A hand-made mark: deliberately irregular, unlike anything ATLAS renders. */
    ctx.fillStyle = col;
    var seed = o.seed;
    for (var i = 0; i < 14; i++) {
      var n = U.noise1(seed + i * 2.7);
      ctx.fillRect(Math.round(-10 + i * 1.5), Math.round(-14 + n * 8),
                   1 + Math.abs(Math.round(n * 3)), 1);
    }
    ctx.globalAlpha = 1;
    if (!read) G.glow(ctx, 0, -10, 14, col, .18 + Math.sin(W.time * 2) * .06);
  };

  /* Data echo — a figure replaying a fixed moment. Only visible in the data layer. */
  W.drawEcho = function (ctx, o) {
    var t = W.time + o.seed;
    var walk = o.def.walk ? Math.sin(t * 1.4) * 14 : 0;
    ctx.save();
    ctx.translate(walk, 0);
    ctx.globalAlpha = .40 + Math.sin(t * 1.7) * .12;
    ctx.fillStyle = C.cyan;
    /* Human silhouette — the only human-shaped thing in the game. */
    ctx.fillRect(-2, -20, 4, 5);          // head
    ctx.fillRect(-3, -15, 6, 8);          // torso
    var l = Math.round(Math.sin(t * 3) * 2);
    ctx.fillRect(-3, -7, 2, 7 + l);
    ctx.fillRect(1, -7, 2, 7 - l);
    ctx.fillRect(-5, -14, 2, 6);
    ctx.fillRect(3, -14, 2, 6);
    ctx.globalAlpha = 1;
    for (var i = 0; i < 4; i++) {
      ctx.fillStyle = CV.Palette.alpha(C.cyanGlow, .3);
      ctx.fillRect(Math.round(U.noise1(t * 3 + i) * 5), Math.round(-18 + (i * 5)), 1, 1);
    }
    G.glow(ctx, 0, -12, 16, C.cyan, .18);
    ctx.restore();
  };

  /* Additive light pass — the thing that sells "neon". Drawn into a separate buffer
     and composited with 'lighter'. */
  W.renderLights = function (ctx, cam) {
    var layer = CV.DataSphere.layer;
    var pal = layer === 1 ? CV.Palette.data : CV.Palette.region(W.regionId);

    for (var i = 0; i < W.lights.length; i++) {
      var l = W.lights[i];
      if (!cam.visible(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2)) continue;
      G.glow(ctx, l.x - cam.rx(), l.y - cam.ry(), l.r, pal.key, .5);
    }

    for (var j = 0; j < W.objects.length; j++) {
      var o = W.objects[j];
      if (!o.active) continue;
      if (o.layerOnly >= 0 && o.layerOnly !== layer) continue;
      if (!cam.visible(o.x - 60, o.y - 60, o.w + 120, o.h + 120)) continue;
      var cx = o.x + o.w / 2 - cam.rx(), cy = o.y + o.h / 2 - cam.ry();
      if (o.t === 'sign') {
        G.glow(ctx, cx, cy, (o.def.w || 4) * TS * .8, o.def.color || C.magenta, .38);
      } else if (o.t === 'dock') {
        G.glow(ctx, cx, cy - 8, 34, C.cyan, .34);
      } else if (o.t === 'divePort') {
        G.glow(ctx, cx, cy - 8, 40, C.cyan, .40);
      } else if (o.t === 'terminal') {
        G.glow(ctx, cx, cy - 6, 22, C.green, .28);
      } else if (o.t === 'pickup') {
        G.glow(ctx, cx, cy - 8, 26, C.cyan, .34);
      }
    }
  };

  /* Screen wipe for room transitions — horizontal shutter bands, CRT-style. */
  W.renderTransition = function (ctx) {
    if (W.transition <= 0) return;
    var t = U.easeInOut(W.transition);
    ctx.fillStyle = '#000';
    var bands = 12, bh = CV.H / bands;
    for (var i = 0; i < bands; i++) {
      var w = CV.W * U.clamp(t * 1.5 - (i % 3) * .12, 0, 1);
      var fromLeft = (i & 1) === 0;
      ctx.fillRect(fromLeft ? 0 : CV.W - w, i * bh, w, bh + 1);
    }
    if (t > .8) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CV.W, CV.H); }
  };

})(window.CV = window.CV || {});
