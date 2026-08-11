/* CYBERVANIA — debug/debug.js
   F3 overlay and a backtick console (rule 34). Costs nothing when disabled, never
   touches save data, and never alters gameplay unless a command is typed. */
(function (CV) {
  'use strict';

  var G = CV.Gfx, C = CV.Palette.c, In = CV.Input, U = CV.Util;
  var D = CV.Debug = {};

  D.on = false;
  D.boxes = false;
  D.god = false;
  D.noclip = false;
  D.consoleOpen = false;

  var line = '', history = [], histIdx = -1, output = [];

  D.init = function () {
    window.addEventListener('keydown', function (e) {
      if (e.code === 'F3' && !D.consoleOpen) {
        D.on = !D.on;
        if (D.on) D.boxes = true;
        e.preventDefault();
        return;
      }
      if (e.code === 'Backquote') {
        D.consoleOpen = !D.consoleOpen;
        if (D.consoleOpen) { line = ''; histIdx = -1; }
        CV.Engine.paused = D.consoleOpen || CV.Menu.open_;
        e.preventDefault();
        return;
      }
      if (!D.consoleOpen) return;

      e.preventDefault();
      if (e.key === 'Enter') { run(line); line = ''; histIdx = -1; }
      else if (e.key === 'Backspace') line = line.slice(0, -1);
      else if (e.key === 'ArrowUp') {
        if (history.length) { histIdx = Math.min(history.length - 1, histIdx + 1); line = history[histIdx]; }
      } else if (e.key === 'ArrowDown') {
        histIdx = Math.max(-1, histIdx - 1);
        line = histIdx < 0 ? '' : history[histIdx];
      } else if (e.key === 'Escape') { D.consoleOpen = false; CV.Engine.paused = CV.Menu.open_; }
      else if (e.key.length === 1) line += e.key;
    }, true);
  };

  function log(s) { output.push(s); if (output.length > 8) output.shift(); }

  var COMMANDS = {
    help: function () {
      log('give <module|all> · frame <id> · tp <roomId> · energy <n> · hp <n>');
      log('god · noclip · boxes · killall · flag <name> [0|1] · boss <id>');
      log('layer <phys|data> · map · slow <mult> · spawn <enemy> · rooms · pos');
    },
    give: function (a) {
      if (a === 'all') {
        for (var i = 0; i < CV.Modules.order.length; i++) CV.State.giveModule(CV.Modules.order[i]);
        log('all modules given');
      } else if (CV.Modules.defs[a]) { CV.State.giveModule(a); log('gave ' + a); }
      else log('unknown module: ' + a);
    },
    frame: function (a) {
      if (a === 'all') {
        for (var i = 0; i < CV.Frames.order.length; i++) CV.State.giveFrame(CV.Frames.order[i]);
        log('all chassis given');
      } else if (CV.Frames.defs[a]) {
        CV.State.giveFrame(a); CV.Player.setFrame(a, true); log('chassis ' + a);
      } else log('unknown chassis: ' + a);
    },
    tp: function (a) {
      if (CV.Rooms.get(a)) { CV.World.load(a); log('-> ' + a); }
      else log('unknown room: ' + a);
    },
    rooms: function (a) {
      var ids = CV.Rooms.ids().filter(function (r) { return !a || r.indexOf(a) >= 0; });
      log(ids.slice(0, 12).join(' '));
    },
    energy: function (a) { CV.Player.energy = parseFloat(a) || 0; },
    hp: function (a) {
      var n = parseInt(a, 10);
      if (n > 0) { CV.Player.maxHp = Math.max(CV.Player.maxHp, n); CV.Player.hp = n; }
    },
    god: function () { D.god = !D.god; log('god ' + D.god); },
    noclip: function () { D.noclip = !D.noclip; log('noclip ' + D.noclip); },
    boxes: function () { D.boxes = !D.boxes; log('boxes ' + D.boxes); },
    killall: function () {
      for (var i = CV.Enemies.list.length - 1; i >= 0; i--) {
        if (CV.Enemies.list[i].alive) CV.Enemies.kill(CV.Enemies.list[i], 1);
      }
    },
    flag: function (a, b) {
      if (!a) return log('flag <name> [0|1]');
      if (b === undefined) return log(a + ' = ' + (CV.State.flag(a) ? 1 : 0));
      CV.State.setFlag(a, b !== '0');
      log(a + ' = ' + b);
    },
    boss: function (a) {
      if (a === 'kill' && CV.Bosses.current) {
        CV.Bosses.damage(CV.Bosses.current, 99999, 1, {});
        log('boss killed');
      } else if (CV.Bosses.defs[a]) { CV.State.setFlag('boss:' + a, 1); log('flagged ' + a); }
      else log('boss <id|kill>');
    },
    layer: function (a) {
      CV.DataSphere.forceLayer(a === 'data' ? 1 : 0);
      log('layer ' + (a === 'data' ? 'DATA' : 'PHYS'));
    },
    map: function () {
      var ids = CV.Rooms.ids();
      for (var i = 0; i < ids.length; i++) CV.State.discoverRoom(ids[i]);
      log('map revealed');
    },
    slow: function (a) { CV.Engine.timeScale = parseFloat(a) || 1; },
    spawn: function (a) {
      if (!CV.Enemies.defs[a]) return log('unknown enemy: ' + a);
      CV.Enemies.spawn(a, CV.Player.x + 40, CV.Player.y + CV.Player.h);
      log('spawned ' + a);
    },
    pos: function () {
      log('room ' + CV.World.room.id + '  x ' + (CV.Player.x | 0) + '  y ' + (CV.Player.y | 0) +
          '  tile ' + ((CV.Player.x / 16) | 0) + ',' + ((CV.Player.y / 16) | 0));
    },
    save: function () { CV.Save.write(CV.State.slot); log('saved'); },
    clear: function () { output.length = 0; }
  };

  function run(text) {
    text = text.trim();
    if (!text) return;
    history.unshift(text);
    log('> ' + text);
    var parts = text.split(/\s+/);
    var cmd = COMMANDS[parts[0]];
    if (!cmd) return log('unknown command — try "help"');
    try { cmd.apply(null, parts.slice(1)); }
    catch (e) { log('error: ' + e.message); }
  }

  D.run = run;

  /* --- overlay --------------------------------------------------------------- */
  D.render = function (ctx, cam) {
    if (D.boxes && D.on) renderBoxes(ctx, cam);
    if (D.on) renderStats(ctx);
    if (D.consoleOpen) renderConsole(ctx);
  };

  function renderBoxes(ctx, cam) {
    var p = CV.Player;
    ctx.save();
    ctx.globalAlpha = 0.85;
    G.frame(ctx, p.x - cam.rx(), p.y - cam.ry(), p.w, p.h, C.cyan, 1);

    for (var i = 0; i < CV.Enemies.list.length; i++) {
      var e = CV.Enemies.list[i];
      if (!e.alive) continue;
      G.frame(ctx, e.x - e.w / 2 - cam.rx(), e.y - e.h - cam.ry(), e.w, e.h, C.red, 1);
    }
    var boxes = CV.Combat.debugBoxes;
    for (var b = 0; b < boxes.length; b++) {
      G.frame(ctx, boxes[b].x - cam.rx(), boxes[b].y - cam.ry(), boxes[b].w, boxes[b].h,
              C.amber, 1);
    }
    if (CV.Bosses.current) {
      var bs = CV.Bosses.current;
      G.frame(ctx, bs.x - bs.w / 2 - cam.rx(), bs.y - bs.h - cam.ry(), bs.w, bs.h,
              C.magenta, 1);
    }
    /* Velocity vector — invaluable for tuning dashes and knockback. */
    G.line(ctx, p.x + p.w / 2 - cam.rx(), p.y + p.h / 2 - cam.ry(),
           p.x + p.w / 2 - cam.rx() + p.vx * 0.08,
           p.y + p.h / 2 - cam.ry() + p.vy * 0.08, C.green, 1);
    ctx.restore();
  };

  function renderStats(ctx) {
    var p = CV.Player, E = CV.Engine;
    var lines = [
      'FPS ' + E.fps.toFixed(1) + '   FRAME ' + E.frameMs.toFixed(2) + 'MS',
      'ROOM ' + (CV.World.room ? CV.World.room.id : '-') +
        '  LAYER ' + (CV.DataSphere.layer ? 'DATA' : 'PHYS'),
      'POS ' + (p.x | 0) + ',' + (p.y | 0) + '  TILE ' + ((p.x / 16) | 0) + ',' + ((p.y / 16) | 0),
      'VEL ' + p.vx.toFixed(1) + ',' + p.vy.toFixed(1) +
        (p.grounded ? ' GND' : '') + (p.wallDir ? ' WALL' + p.wallDir : ''),
      'FRAME ' + p.frameId + '  HP ' + p.hp + '/' + p.maxHp +
        '  EN ' + p.energy.toFixed(0) + '/' + p.maxEnergy(),
      'DASH ' + p.dashTimer.toFixed(2) + '/' + p.dashCd.toFixed(2) +
        '  JMP ' + p.jumpsUsed + '  COY ' + p.coyote.toFixed(2),
      'ENT ' + CV.Enemies.list.length + '  PROJ ' + CV.Combat.projectiles.count +
        '  FX ' + CV.FX.pool.count,
      'MODULES ' + Object.keys(CV.State.modules).join(',') || 'MODULES -',
      'GOD ' + (D.god ? 'ON' : 'off') + '  NOCLIP ' + (D.noclip ? 'ON' : 'off') +
        '  ' + CV.State.completion() + '%'
    ];

    var w = 232, h = lines.length * 9 + 34;
    ctx.fillStyle = 'rgba(2,6,10,0.80)';
    ctx.fillRect(CV.W - w - 2, 2, w, h);
    G.frame(ctx, CV.W - w - 2, 2, w, h, CV.Palette.alpha(C.green, .5), 1);
    for (var i = 0; i < lines.length; i++) {
      G.text(ctx, lines[i], CV.W - w + 2, 6 + i * 9, C.green, 1);
    }

    /* Frame-time graph: 120 samples, 16.7ms reference line. */
    var gx = CV.W - w + 2, gy = 6 + lines.length * 9 + 2, gw = w - 8, gh = 22;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(gx, gy, gw, gh);
    ctx.fillStyle = CV.Palette.alpha(C.amber, .4);
    ctx.fillRect(gx, gy + gh - 16.7 / 40 * gh, gw, 1);
    for (var s = 0; s < E.history.length; s++) {
      var v = E.history[s];
      var hh = Math.min(gh, v / 40 * gh);
      ctx.fillStyle = v > 20 ? C.red : v > 17 ? C.amber : C.green;
      ctx.fillRect(gx + s * (gw / E.history.length), gy + gh - hh,
                   Math.max(1, gw / E.history.length), hh);
    }
  }

  function renderConsole(ctx) {
    var h = 96;
    ctx.fillStyle = 'rgba(1,4,3,0.94)';
    ctx.fillRect(0, 0, CV.W, h);
    G.rect(ctx, 0, h, CV.W, 1, C.green);
    for (var i = 0; i < output.length; i++) {
      G.text(ctx, output[i], 6, 6 + i * 9, i === output.length - 1 ? C.phosphor : '#3f7a60', 1);
    }
    var caret = Math.sin(CV.Engine.realTime * 8) > 0 ? '█' : ' ';
    G.text(ctx, '> ' + line + caret, 6, h - 12, C.phosphor, 1);
  }

  /* Called by Game.update so god/noclip take effect without polluting player.js. */
  D.applyCheats = function () {
    /* A large invuln value keeps god mode out of the i-frame blink window, so the
       player stays visible instead of strobing. */
    if (D.god) { CV.Player.hp = CV.Player.maxHp; CV.Player.invuln = 999; }
    else if (CV.Player.invuln > 900) CV.Player.invuln = 0;
    if (D.noclip) {
      var p = CV.Player, sp = 260;
      p.vx = In.axisX() * sp; p.vy = In.axisY() * sp;
      p.x += p.vx * CV.STEP; p.y += p.vy * CV.STEP;
      p.dashTimer = 0; p.grounded = true;
    }
  };

})(window.CV = window.CV || {});
