/* CYBERVANIA — ui/menu.js
   The pause menu is R-17 opening its own service interface: a CRT maintenance
   terminal with a boot sequence, five tabs and no browser-dashboard energy anywhere
   (rule 27). Gameplay legibility still wins: nothing here flickers while you read it. */
(function (CV) {
  'use strict';

  var G = CV.Gfx, C = CV.Palette.c, U = CV.Util, In = CV.Input;
  var M = CV.Menu = {};

  var TABS = ['MAP', 'FRAMES', 'MODULES', 'LOG', 'SYSTEM'];
  M.open_ = false;
  var tab = 0, cursor = 0, scroll = 0, bootT = 0, sub = 0, rebinding = null;
  var logFilter = 0;
  var LOG_TAGS = ['ALL', 'ATLAS', 'HALDER', 'HUMAN', 'FRAGMENT'];

  M.open = function (which, opts) {
    if (M.open_) return;
    M.open_ = true;
    bootT = CV.State.flag('menu_seen') ? 0.18 : 1.1;
    CV.State.setFlag('menu_seen', 1);
    tab = which ? Math.max(0, TABS.indexOf(which.toUpperCase())) : 0;
    cursor = 0; scroll = 0; sub = 0; rebinding = null;
    CV.Engine.paused = true;
    CV.Audio.sfx('terminal');
    CV.MapUI.centreOnPlayer();
    CV.MapUI.travelMode = !!(opts && opts.travelFrom);
    CV.MapUI.travelTarget = 0;
  };

  M.close = function () {
    M.open_ = false;
    CV.Engine.paused = false;
    CV.MapUI.travelMode = false;
    CV.Settings.save();
    CV.Audio.sfx('uiBack');
    In.clear();
  };

  M.toggle = function (which) { M.open_ ? M.close() : M.open(which); };

  /* =========================================================================
     UPDATE
     ========================================================================= */
  M.update = function (dt) {
    if (!M.open_) return;
    bootT = Math.max(0, bootT - dt);
    if (bootT > 0) return;

    if (rebinding) {
      if (In.lastCode && In.anyKeyAt >= In.now() - 0.05) {
        if (In.lastCode !== 'Escape') In.rebind(rebinding, In.lastCode);
        rebinding = null;
        CV.Audio.sfx('ui');
      }
      return;
    }

    if (In.pressed('pause') || In.pressed('map')) { M.close(); return; }

    /* Tab switching with Q/R, or left/right at the edge of a list. */
    if (In.pressed('cycleL')) { tab = (tab + TABS.length - 1) % TABS.length; cursor = 0; scroll = 0; CV.Audio.sfx('ui'); }
    if (In.pressed('cycleR')) { tab = (tab + 1) % TABS.length; cursor = 0; scroll = 0; CV.Audio.sfx('ui'); }

    switch (TABS[tab]) {
      case 'MAP': CV.MapUI.handleInput(dt); break;
      case 'FRAMES': updateFrames(); break;
      case 'MODULES': updateModules(); break;
      case 'LOG': updateLog(); break;
      case 'SYSTEM': updateSystem(); break;
    }
  };

  function listNav(count, cols) {
    cols = cols || 1;
    if (In.pressed('down')) { cursor = Math.min(count - 1, cursor + cols); CV.Audio.sfx('ui'); }
    if (In.pressed('up')) { cursor = Math.max(0, cursor - cols); CV.Audio.sfx('ui'); }
    if (cols > 1) {
      if (In.pressed('right')) { cursor = Math.min(count - 1, cursor + 1); CV.Audio.sfx('ui'); }
      if (In.pressed('left')) { cursor = Math.max(0, cursor - 1); CV.Audio.sfx('ui'); }
    }
  }

  function ownedFrames() {
    var out = [];
    for (var i = 0; i < CV.Frames.order.length; i++) {
      if (CV.State.hasFrame(CV.Frames.order[i])) out.push(CV.Frames.order[i]);
    }
    return out;
  }

  function updateFrames() {
    var frames = ownedFrames();
    var augs = Object.keys(CV.State.augments);
    var total = frames.length + augs.length;
    listNav(total);
    if (In.pressed('interact') || In.pressed('jump')) {
      if (cursor < frames.length) {
        CV.Player.setFrame(frames[cursor]);
        CV.Audio.sfx('morph');
      } else {
        var id = augs[cursor - frames.length];
        if (CV.State.toggleAugment(id)) CV.Audio.sfx('pickup');
        else CV.Audio.sfx('uiBack');
      }
    }
  }

  function ownedModules() {
    var out = [];
    for (var i = 0; i < CV.Modules.order.length; i++) {
      if (CV.State.rawModule(CV.Modules.order[i])) out.push(CV.Modules.order[i]);
    }
    return out;
  }

  function updateModules() {
    var mods = ownedModules();
    listNav(Math.max(1, mods.length));
    if ((In.pressed('interact') || In.pressed('jump')) && mods.length) {
      var id = mods[cursor];
      if (CV.State.activeModules().indexOf(id) >= 0) {
        CV.Player.activeModule = id;
        CV.Audio.sfx('ui');
      }
    }
  }

  function logEntries() {
    var out = [];
    for (var i = 0; i < CV.Lore.order.length; i++) {
      var id = CV.Lore.order[i];
      if (!CV.State.hasLore(id)) continue;
      var e = CV.Lore.entries[id];
      if (logFilter > 0 && e.tag !== LOG_TAGS[logFilter]) continue;
      out.push(e);
    }
    return out;
  }

  function updateLog() {
    var list = logEntries();
    listNav(Math.max(1, list.length));
    if (In.pressed('left')) { logFilter = (logFilter + LOG_TAGS.length - 1) % LOG_TAGS.length; cursor = 0; }
    if (In.pressed('right')) { logFilter = (logFilter + 1) % LOG_TAGS.length; cursor = 0; }
    if ((In.pressed('interact') || In.pressed('jump')) && list.length) {
      CV.Terminal.open(list[cursor]);
    }
  }

  /* --- SYSTEM ---------------------------------------------------------------- */
  function systemRows() {
    var S = CV.Settings;
    return [
      { t: 'head', label: 'AUDIO' },
      { t: 'slider', label: 'MASTER', get: function () { return S.masterVolume; },
        set: function (v) { S.masterVolume = v; CV.Audio.setVolumes(); } },
      { t: 'slider', label: 'MUSIC', get: function () { return S.musicVolume; },
        set: function (v) { S.musicVolume = v; CV.Audio.setVolumes(); } },
      { t: 'slider', label: 'EFFECTS', get: function () { return S.sfxVolume; },
        set: function (v) { S.sfxVolume = v; CV.Audio.setVolumes(); CV.Audio.sfx('ui'); } },

      { t: 'head', label: 'DISPLAY' },
      { t: 'toggle', label: 'SCANLINES', get: function () { return S.scanlines; },
        set: function (v) { S.scanlines = v; } },
      { t: 'toggle', label: 'VIGNETTE', get: function () { return S.vignette; },
        set: function (v) { S.vignette = v; } },
      { t: 'toggle', label: 'CHROMATIC SPLIT', get: function () { return S.chromatic; },
        set: function (v) { S.chromatic = v; } },
      { t: 'toggle', label: 'GLITCH EFFECTS', get: function () { return S.glitch; },
        set: function (v) { S.glitch = v; } },
      { t: 'toggle', label: 'SIGNAL NOISE', get: function () { return S.noise; },
        set: function (v) { S.noise = v; } },
      { t: 'slider', label: 'SCREEN SHAKE', get: function () { return S.shake; },
        set: function (v) { S.shake = v; } },
      { t: 'toggle', label: 'DAMAGE NUMBERS', get: function () { return S.damageNumbers; },
        set: function (v) { S.damageNumbers = v; } },
      { t: 'slider', label: 'TEXT SPEED', get: function () { return S.textSpeed / 2; },
        set: function (v) { S.textSpeed = Math.max(0.1, v * 2); } },

      { t: 'head', label: 'ASSIST — NOTHING IS WITHHELD' },
      { t: 'choice', label: 'DAMAGE TAKEN', opts: ['100%', '50%', 'NONE'],
        get: function () { return S.assistDamage === 1 ? 0 : S.assistDamage === 0.5 ? 1 : 2; },
        set: function (i) { S.assistDamage = [1, 0.5, 0][i]; } },
      { t: 'toggle', label: 'INFINITE ENERGY', get: function () { return S.assistEnergy; },
        set: function (v) { S.assistEnergy = v; } },

      { t: 'head', label: 'CONTROLS' },
      { t: 'bind', label: 'MOVE LEFT', action: 'left' },
      { t: 'bind', label: 'MOVE RIGHT', action: 'right' },
      { t: 'bind', label: 'LOOK UP', action: 'up' },
      { t: 'bind', label: 'CROUCH / DOWN', action: 'down' },
      { t: 'bind', label: 'JUMP', action: 'jump' },
      { t: 'bind', label: 'ATTACK', action: 'attack' },
      { t: 'bind', label: 'DASH', action: 'dash' },
      { t: 'bind', label: 'TETHER', action: 'grapple' },
      { t: 'bind', label: 'MODULE', action: 'special' },
      { t: 'bind', label: 'DATA SHIFT', action: 'shift' },
      { t: 'bind', label: 'INTERACT', action: 'interact' },
      { t: 'action', label: 'RESET ALL SETTINGS', run: function () {
          CV.Settings.reset(); CV.Audio.setVolumes(); CV.HUD.toast('SETTINGS RESET'); } },

      { t: 'head', label: 'SYSTEM' },
      { t: 'action', label: 'SAVE TO SLOT ' + CV.State.slot, run: function () {
          CV.Save.write(CV.State.slot); CV.HUD.toast('SAVED'); } },
      { t: 'action', label: 'RETURN TO TITLE', run: function () {
          M.close(); CV.Game.toTitle(); } }
    ];
  }

  function updateSystem() {
    var rows = systemRows();
    /* Skip headers when navigating — they are not selectable. */
    function step(dir) {
      var i = cursor;
      do { i += dir; } while (i >= 0 && i < rows.length && rows[i].t === 'head');
      if (i >= 0 && i < rows.length) { cursor = i; CV.Audio.sfx('ui'); }
    }
    if (In.pressed('down')) step(1);
    if (In.pressed('up')) step(-1);
    while (rows[cursor] && rows[cursor].t === 'head') cursor++;

    var row = rows[cursor];
    if (!row) return;

    if (row.t === 'slider') {
      if (In.held('left')) row.set(U.clamp(row.get() - 0.9 * (1 / 60), 0, 1));
      if (In.held('right')) row.set(U.clamp(row.get() + 0.9 * (1 / 60), 0, 1));
    } else if (row.t === 'toggle') {
      if (In.pressed('left') || In.pressed('right') || In.pressed('interact') ||
          In.pressed('jump')) { row.set(!row.get()); CV.Audio.sfx('ui'); }
    } else if (row.t === 'choice') {
      if (In.pressed('right')) { row.set((row.get() + 1) % row.opts.length); CV.Audio.sfx('ui'); }
      if (In.pressed('left')) { row.set((row.get() + row.opts.length - 1) % row.opts.length); CV.Audio.sfx('ui'); }
    } else if (row.t === 'bind') {
      if (In.pressed('interact') || In.pressed('jump')) { rebinding = row.action; }
    } else if (row.t === 'action') {
      if (In.pressed('interact') || In.pressed('jump')) row.run();
    }

    /* Keep the cursor on screen. */
    var visible = 15;
    if (cursor < scroll) scroll = cursor;
    if (cursor > scroll + visible - 1) scroll = cursor - visible + 1;
  }

  /* =========================================================================
     RENDER
     ========================================================================= */
  M.render = function (ctx) {
    if (!M.open_) return;

    ctx.fillStyle = 'rgba(2,5,9,0.90)';
    ctx.fillRect(0, 0, CV.W, CV.H);

    if (bootT > 0) {
      /* First open plays a short boot sequence. It never plays again. */
      var k = 1 - bootT / 1.1;
      G.textCentered(ctx, 'MAINTENANCE INTERFACE', CV.W / 2, CV.H / 2 - 14, C.green, 1);
      G.rect(ctx, CV.W / 2 - 60, CV.H / 2, 120 * U.clamp(k * 1.4, 0, 1), 2, C.green);
      G.textCentered(ctx, 'UNIT R-17', CV.W / 2, CV.H / 2 + 8,
                     Math.sin(bootT * 30) > 0 ? C.greenDim : C.green, 1);
      return;
    }

    G.panel(ctx, 6, 6, CV.W - 12, CV.H - 12, C.cyanDim, .70);

    /* Tab bar */
    var tx = 12;
    for (var i = 0; i < TABS.length; i++) {
      var on = i === tab;
      var w = G.textWidth(TABS[i], 1) + 10;
      if (on) G.rect(ctx, tx, 10, w, 11, CV.Palette.alpha(C.cyan, .22));
      G.frame(ctx, tx, 10, w, 11, on ? C.cyan : '#1b2a38', 1);
      G.text(ctx, TABS[i], tx + 5, 12, on ? C.cyanGlow : '#4d6484', 1);
      tx += w + 3;
    }
    G.textRight(ctx, CV.Util.timeString(CV.State.playtime) + '   ' +
                CV.State.completion() + '%', CV.W - 12, 12, '#3d5468', 1);
    G.rect(ctx, 12, 24, CV.W - 24, 1, '#1b2a38');

    var bx = 12, by = 30, bw = CV.W - 24, bh = CV.H - 48;

    switch (TABS[tab]) {
      case 'MAP': renderMap(ctx, bx, by, bw, bh); break;
      case 'FRAMES': renderFrames(ctx, bx, by, bw, bh); break;
      case 'MODULES': renderModules(ctx, bx, by, bw, bh); break;
      case 'LOG': renderLog(ctx, bx, by, bw, bh); break;
      case 'SYSTEM': renderSystem(ctx, bx, by, bw, bh); break;
    }

    G.text(ctx, '[' + In.labelFor('cycleL') + '/' + In.labelFor('cycleR') + '] TAB   [' +
           In.labelFor('interact') + '] SELECT   [' + In.labelFor('pause') + '] CLOSE',
           12, CV.H - 14, '#33465c', 1);
  };

  function renderMap(ctx, x, y, w, h) {
    CV.MapUI.render(ctx, x, y, w - 84, h);
    G.frame(ctx, x, y, w - 84, h, '#1b2a38', 1);

    var px = x + w - 78;
    var room = CV.World.room;
    G.text(ctx, room ? room.name : '', px, y + 2, C.cyanGlow, 1);
    var region = CV.Regions.get(CV.World.regionId);
    G.text(ctx, region.name, px, y + 12, CV.Palette.alpha(region.mapColor, .9), 1);
    G.rect(ctx, px, y + 22, 74, 1, '#1b2a38');

    G.text(ctx, 'DISCOVERED', px, y + 28, '#3d5468', 1);
    G.text(ctx, Object.keys(CV.State.discovered).length + ' / ' + CV.Rooms.ids().length,
           px, y + 37, C.white, 1);

    CV.MapUI.legend(ctx, px, y + 52);

    if (CV.MapUI.travelMode) {
      var trams = CV.MapUI.tramList();
      G.rect(ctx, px, y + 112, 74, 1, '#1b2a38');
      G.text(ctx, 'TRAM NETWORK', px, y + 118, C.magenta, 1);
      if (!trams.length) G.text(ctx, 'NO NODES', px, y + 128, '#3d5468', 1);
      else {
        var t = trams[CV.MapUI.travelTarget % trams.length];
        G.text(ctx, t.name || t.id, px, y + 128, C.white, 1);
        G.text(ctx, '[' + In.labelFor('attack') + '] NEXT', px, y + 140, '#3d5468', 1);
        G.text(ctx, '[' + In.labelFor('interact') + '] BOARD', px, y + 149, '#3d5468', 1);
      }
    } else {
      G.text(ctx, 'ZOOM', px, y + h - 28, '#33465c', 1);
      G.text(ctx, '[' + In.labelFor('dash') + ']', px, y + h - 19, '#33465c', 1);
    }
  }

  function renderFrames(ctx, x, y, w, h) {
    var frames = ownedFrames();
    var augs = Object.keys(CV.State.augments);
    var listW = 108;

    G.text(ctx, 'CHASSIS', x, y, '#3d5468', 1);
    for (var i = 0; i < frames.length; i++) {
      var fd = CV.Frames.defs[frames[i]];
      var iy = y + 12 + i * 15;
      var sel = cursor === i;
      var eq = CV.Player.frameId === frames[i];
      if (sel) G.rect(ctx, x, iy - 2, listW, 14, CV.Palette.alpha(fd.color, .20));
      G.rect(ctx, x + 2, iy + 1, 4, 8, fd.color);
      G.text(ctx, fd.name, x + 10, iy + 1, eq ? C.white : '#8ba0b8', 1);
      if (eq) G.text(ctx, 'ACTIVE', x + listW - 38, iy + 1, fd.color, 1);
    }

    var ay = y + 12 + frames.length * 15 + 10;
    G.text(ctx, 'AUGMENTS  ' + CV.State.equipped.length + '/' + CV.State.augmentSlots(),
           x, ay - 10, '#3d5468', 1);
    for (var a = 0; a < augs.length; a++) {
      var iy2 = ay + a * 11;
      var sel2 = cursor === frames.length + a;
      var on = CV.State.hasAugment(augs[a]);
      if (sel2) G.rect(ctx, x, iy2 - 1, listW, 10, CV.Palette.alpha(C.violet, .22));
      G.rect(ctx, x + 2, iy2 + 1, 5, 5, on ? C.violet : '#26303f');
      G.text(ctx, CV.Player.augmentName(augs[a]), x + 11, iy2, on ? C.white : '#5d7488', 1);
    }

    /* Detail pane — the per-frame reinterpretation table is the interesting part. */
    var dx = x + listW + 10, dw = w - listW - 10;
    G.rect(ctx, dx - 5, y, 1, h - 4, '#1b2a38');
    if (cursor < frames.length) {
      var f = CV.Frames.defs[frames[cursor]];
      G.textGlow(ctx, f.name, dx, y, f.color, 2, 1);
      var ty = y + 18;
      var longL = G.wrap(f.long, dw, 1);
      for (var q = 0; q < longL.length; q++, ty += 9) G.text(ctx, longL[q], dx, ty, '#7d94ad', 1);
      ty += 3;
      var lines = G.wrap(f.blurb, dw, 1);
      for (var l = 0; l < lines.length; l++, ty += 9) G.text(ctx, lines[l], dx, ty, '#8ba0b8', 1);

      var sy = ty + 8;
      stat(ctx, dx, sy, 'SPEED', f.runSpeed / 230, f.color);
      stat(ctx, dx, sy + 11, 'JUMP', f.jumpVel / 380, f.color);
      stat(ctx, dx, sy + 22, 'ENERGY', f.maxEnergy / 170, f.color);
      stat(ctx, dx, sy + 33, 'REGEN', Math.min(1, f.regen / 42), f.color);
      stat(ctx, dx, sy + 44, 'RESILIENCE', 1 - (f.damageTaken - .6) / 1.0, f.color);

      G.text(ctx, 'ATK  ' + f.attack.damage.join('/') +
             '   ARMOUR ' + Math.round((1 - f.damageTaken) * 100) + '%',
             dx, sy + 58, '#5d7488', 1);
      G.text(ctx, '[' + In.labelFor('interact') + '] EQUIP', dx, y + h - 16, '#33465c', 1);
    } else if (augs.length) {
      var id = augs[cursor - frames.length];
      G.textGlow(ctx, CV.Player.augmentName(id), dx, y, C.violet, 2, 1);
      var bl = G.wrap(CV.Player.augmentBlurb(id), dw, 1);
      for (var b = 0; b < bl.length; b++) G.text(ctx, bl[b], dx, y + 22 + b * 9, '#8ba0b8', 1);
      G.text(ctx, CV.State.hasAugment(id) ? 'INSTALLED' : 'NOT INSTALLED',
             dx, y + 48, CV.State.hasAugment(id) ? C.green : '#5d7488', 1);
      G.text(ctx, '[' + In.labelFor('interact') + '] TOGGLE', dx, y + h - 16, '#33465c', 1);
    }
  }

  function stat(ctx, x, y, label, frac, col) {
    G.text(ctx, label, x, y, '#5d7488', 1);
    G.meter(ctx, x + 66, y + 1, 74, 4, U.clamp(frac, 0, 1), col, '#0f1822');
  }

  function renderModules(ctx, x, y, w, h) {
    var mods = ownedModules();
    var listW = 116;
    if (!mods.length) {
      G.text(ctx, 'NO MODULES INSTALLED.', x, y + 10, '#3d5468', 1);
      return;
    }
    for (var i = 0; i < mods.length; i++) {
      var md = CV.Modules.defs[mods[i]];
      var iy = y + i * 13;
      var sel = cursor === i;
      var active = CV.Player.activeModule === mods[i];
      if (sel) G.rect(ctx, x, iy - 1, listW, 12, CV.Palette.alpha(C.cyan, .18));
      CV.Modules.drawIcon(ctx, md.icon, x + 1, iy, active ? C.cyanGlow : '#6d84a0');
      G.text(ctx, md.name, x + 14, iy + 1, active ? C.white : '#8ba0b8', 1);
    }

    var dx = x + listW + 10, dw = w - listW - 10;
    G.rect(ctx, dx - 5, y, 1, h - 4, '#1b2a38');
    var m = CV.Modules.defs[mods[cursor]];
    G.textGlow(ctx, m.name, dx, y, C.cyan, 2, 1);
    var bl = G.wrap(m.blurb, dw, 1);
    for (var b = 0; b < bl.length; b++) G.text(ctx, bl[b], dx, y + 20 + b * 9, '#8ba0b8', 1);

    /* The reinterpretation table: this is the game's combinatorial core, so the
       menu shows all four readings at once. */
    G.text(ctx, 'BY CHASSIS', dx, y + 44, '#3d5468', 1);
    var oy = y + 55;
    for (var f = 0; f < CV.Frames.order.length; f++) {
      var fid = CV.Frames.order[f];
      var known = CV.State.hasFrame(fid);
      var fd = CV.Frames.defs[fid];
      G.text(ctx, fd.name, dx, oy, known ? fd.color : '#26303f', 1);
      var txt = known ? m.per[fid] : '- CHASSIS NOT RECOVERED -';
      var wl = G.wrap(txt, dw - 56, 1);
      for (var k = 0; k < wl.length; k++) {
        G.text(ctx, wl[k], dx + 54, oy + k * 9, known ? '#8ba0b8' : '#26303f', 1);
      }
      oy += Math.max(11, wl.length * 9 + 3);
    }

    if (CV.State.activeModules().indexOf(mods[cursor]) >= 0) {
      G.text(ctx, '[' + In.labelFor('interact') + '] BIND TO ' + In.labelFor('special'),
             dx, y + h - 16, '#33465c', 1);
    }
  }

  function renderLog(ctx, x, y, w, h) {
    var list = logEntries();
    var listW = 140;

    G.text(ctx, 'FILTER: ' + LOG_TAGS[logFilter], x, y, C.greenDim, 1);
    G.text(ctx, CV.State.loreCount() + '/' + CV.Lore.order.length + ' RECOVERED',
           x + listW - 66, y, '#3d5468', 1);

    if (!list.length) {
      G.text(ctx, 'NOTHING RECOVERED YET.', x, y + 16, '#3d5468', 1);
      return;
    }

    var visible = 13;
    if (cursor < scroll) scroll = cursor;
    if (cursor > scroll + visible - 1) scroll = cursor - visible + 1;

    for (var i = 0; i < visible; i++) {
      var idx = scroll + i;
      if (idx >= list.length) break;
      var e = list[idx];
      var iy = y + 14 + i * 11;
      var sel = cursor === idx;
      if (sel) G.rect(ctx, x, iy - 1, listW, 10, CV.Palette.alpha(C.green, .18));
      var tagCol = e.tag === 'ATLAS' ? C.red : e.tag === 'HALDER' ? C.phosphor :
                   e.tag === 'FRAGMENT' ? C.magenta : C.amber;
      G.rect(ctx, x + 2, iy + 2, 3, 3, tagCol);
      var title = e.title.length > 21 ? e.title.substring(0, 20) + '.' : e.title;
      G.text(ctx, title, x + 8, iy, sel ? C.white : '#8ba0b8', 1);
    }

    var dx = x + listW + 10, dw = w - listW - 10;
    G.rect(ctx, dx - 5, y, 1, h - 4, '#1b2a38');
    var sel2 = list[cursor];
    G.text(ctx, sel2.tag, dx, y, '#3d5468', 1);
    var tl = G.wrap(sel2.title, dw, 1);
    for (var t = 0; t < tl.length; t++) G.text(ctx, tl[t], dx, y + 11 + t * 10, C.phosphor, 1);
    G.text(ctx, sel2.where || '', dx, y + 11 + tl.length * 10 + 4, '#3d5468', 1);

    var py = y + 11 + tl.length * 10 + 18;
    for (var p = 0; p < 8 && p < sel2.lines.length; p++) {
      G.text(ctx, sel2.lines[p].substring(0, 40), dx, py + p * 9, '#5d7488', 1);
    }
    G.text(ctx, '[' + In.labelFor('interact') + '] READ IN FULL', dx, y + h - 16, '#33465c', 1);
  }

  function renderSystem(ctx, x, y, w, h) {
    var rows = systemRows();
    var visible = 15;

    if (rebinding) {
      G.panel(ctx, CV.W / 2 - 70, CV.H / 2 - 16, 140, 32, C.amber, .95);
      G.textCentered(ctx, 'PRESS A KEY', CV.W / 2, CV.H / 2 - 8, C.amber, 1);
      G.textCentered(ctx, 'ESC TO CANCEL', CV.W / 2, CV.H / 2 + 4, '#5d7488', 1);
      return;
    }

    for (var i = 0; i < visible; i++) {
      var idx = scroll + i;
      if (idx >= rows.length) break;
      var r = rows[idx];
      var iy = y + i * 12;
      var sel = cursor === idx;

      if (r.t === 'head') {
        G.text(ctx, r.label, x, iy + 2, C.cyanDim, 1);
        G.rect(ctx, x, iy + 10, w - 20, 1, '#16222e');
        continue;
      }
      if (sel) G.rect(ctx, x - 2, iy - 1, w - 16, 11, CV.Palette.alpha(C.cyan, .16));
      G.text(ctx, (sel ? '>' : ' ') + ' ' + r.label, x, iy + 1, sel ? C.white : '#8ba0b8', 1);

      var vx = x + 190;
      if (r.t === 'slider') {
        G.meter(ctx, vx, iy + 3, 80, 4, r.get(), C.cyan, '#0f1822');
        G.text(ctx, Math.round(r.get() * 100) + '%', vx + 86, iy + 1, '#5d7488', 1);
      } else if (r.t === 'toggle') {
        G.text(ctx, r.get() ? 'ON' : 'OFF', vx, iy + 1, r.get() ? C.green : '#4d5f70', 1);
      } else if (r.t === 'choice') {
        G.text(ctx, '< ' + r.opts[r.get()] + ' >', vx, iy + 1, C.cyanGlow, 1);
      } else if (r.t === 'bind') {
        G.text(ctx, In.labelFor(r.action), vx, iy + 1, C.amber, 1);
      }
    }

    if (rows.length > visible) {
      var barH = (h - 8) * (visible / rows.length);
      var barY = y + (h - 8 - barH) * (scroll / (rows.length - visible));
      G.rect(ctx, x + w - 14, y, 2, h - 8, '#101a24');
      G.rect(ctx, x + w - 14, barY, 2, barH, C.cyanDim);
    }

    if (!CV.Save.storageAvailable()) {
      G.text(ctx, 'WARNING: BROWSER STORAGE UNAVAILABLE — PROGRESS WILL NOT PERSIST',
             x, y + h - 6, C.red, 1);
    }
  }

})(window.CV = window.CV || {});
