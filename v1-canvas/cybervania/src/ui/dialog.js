/* CYBERVANIA — ui/dialog.js
   Two text surfaces: the in-world dialogue strip (ATLAS broadcasts, R-17's rare
   lines) and the full-screen lore terminal. Both type in, both are always skippable,
   both archive what they show into the LOG. */
(function (CV) {
  'use strict';

  var G = CV.Gfx, C = CV.Palette.c, U = CV.Util, In = CV.Input;

  /* Speaker styling. ATLAS is broadcast-white-on-red-tint; R-17 is cyan and lower
     case in spirit; SYSTEM is phosphor green. */
  var SPEAKERS = {
    'ATLAS':     { col: C.white, accent: C.red, tick: 'ui' },
    'R-17':      { col: C.cyanGlow, accent: C.cyan, tick: 'type' },
    'SYSTEM':    { col: C.green, accent: C.greenDim, tick: 'type' },
    'NULL':      { col: C.violet, accent: C.violet, tick: 'ui' },
    'ARCHIVIST': { col: C.cyan, accent: C.cyanDim, tick: 'type' }
  };

  /* =========================================================================
     DIALOGUE STRIP
     ========================================================================= */
  var D = CV.DialogUI = {};
  D.active = false;

  var script = null, index = 0, chars = 0, holdT = 0, doneT = 0;

  D.play = function (lines) {
    if (!lines || !lines.length) return;
    script = lines;
    index = 0; chars = 0; holdT = 0; doneT = 0;
    D.active = true;
    CV.emit('dialogue:start');
  };

  D.stop = function () {
    D.active = false; script = null;
    CV.emit('dialogue:end');
  };

  D.update = function (dt) {
    if (!D.active) return;
    var line = script[index];
    var full = line.t.length;
    var speed = 42 * CV.Settings.textSpeed;

    if (chars < full) {
      var before = Math.floor(chars);
      chars = Math.min(full, chars + speed * dt);
      if (Math.floor(chars) > before && line.t.charAt(Math.floor(chars) - 1) !== ' ') {
        if (Math.floor(chars) % 2 === 0) {
          CV.Audio.sfx((SPEAKERS[line.s] || SPEAKERS.SYSTEM).tick);
        }
      }
      if (In.pressed('jump') || In.pressed('attack') || In.pressed('interact')) chars = full;
    } else {
      doneT += dt;
      /* Empty lines are deliberate beats — auto-advance them. */
      if (line.t === '') { if (doneT > 0.45) advance(); return; }
      if (doneT > 0.25 && (In.pressed('jump') || In.pressed('attack') ||
                           In.pressed('interact') || In.pressed('pause'))) advance();
      /* '...' lines hold on their own; the pause is the performance. */
      if (line.t === '...' && doneT > 1.5) advance();
    }
  };

  function advance() {
    index++;
    chars = 0; doneT = 0;
    if (index >= script.length) D.stop();
    else if (script[index].shake) { CV.Engine.addTrauma(0.6); CV.PostFX.pulse(1, 0.6); }
  }

  D.render = function (ctx) {
    if (!D.active) return;
    var line = script[index];
    var sp = SPEAKERS[line.s] || SPEAKERS.SYSTEM;
    var boxH = 44, y = CV.H - boxH - 8;

    ctx.save();
    /* Letterbox dim so the text always wins against a busy background. */
    ctx.fillStyle = 'rgba(2,4,7,0.55)';
    ctx.fillRect(0, y - 6, CV.W, boxH + 14);

    G.panel(ctx, 10, y, CV.W - 20, boxH, sp.accent, .90);

    /* Speaker tab */
    var nameW = G.textWidth(line.s, 1) + 8;
    G.rect(ctx, 14, y - 5, nameW, 10, sp.accent);
    G.text(ctx, line.s, 18, y - 3, '#04070a', 1);

    var shown = line.t.substring(0, Math.floor(chars));
    var lines = G.wrap(shown, CV.W - 44, 1);
    for (var i = 0; i < lines.length && i < 3; i++) {
      G.text(ctx, lines[i], 20, y + 11 + i * 10, sp.col, 1);
    }

    /* Advance caret */
    if (chars >= line.t.length && line.t !== '') {
      var bob = Math.sin(CV.Engine.realTime * 6) > 0 ? 0 : 1;
      G.text(ctx, '>', CV.W - 24, y + boxH - 11 + bob, sp.accent, 1);
    }
    ctx.restore();
  };

  /* =========================================================================
     LORE TERMINAL — full screen CRT
     ========================================================================= */
  var T = CV.Terminal = {};
  T.open_ = false;

  var entry = null, scroll = 0, revealT = 0, bootT = 0;

  T.open = function (e) {
    entry = e;
    T.open_ = true;
    scroll = 0; revealT = 0; bootT = 0.5;
    CV.emit('terminal:open', e);
  };

  T.close = function () {
    T.open_ = false; entry = null;
    CV.Audio.sfx('uiBack');
  };

  T.update = function (dt) {
    if (!T.open_) return;
    bootT = Math.max(0, bootT - dt);
    if (bootT > 0) return;
    revealT += dt * 30 * CV.Settings.textSpeed;

    var lines = entry.lines;
    var maxScroll = Math.max(0, lines.length - 15);

    if (In.held('down')) scroll = Math.min(maxScroll, scroll + dt * 12);
    if (In.held('up')) scroll = Math.max(0, scroll - dt * 12);
    if (In.pressed('pause') || In.pressed('interact') || In.pressed('map')) T.close();
    if (In.pressed('attack') || In.pressed('jump')) {
      if (revealT < lines.length) revealT = lines.length * 2;
      else if (scroll < maxScroll) scroll = Math.min(maxScroll, scroll + 8);
      else T.close();
    }
  };

  T.render = function (ctx) {
    if (!T.open_) return;

    ctx.fillStyle = 'rgba(1,4,3,0.94)';
    ctx.fillRect(0, 0, CV.W, CV.H);

    /* Phosphor curvature suggestion: a subtle green wash and dense scanlines. */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(10,40,26,0.55)';
    ctx.fillRect(0, 0, CV.W, CV.H);
    ctx.restore();

    var t = CV.Engine.realTime;

    if (bootT > 0) {
      G.textCentered(ctx, 'READING', CV.W / 2, CV.H / 2 - 4, C.green, 1);
      var dots = '.'.repeat(1 + (Math.floor(t * 6) % 3));
      G.text(ctx, dots, CV.W / 2 + 24, CV.H / 2 - 4, C.green, 1);
      return;
    }

    G.panel(ctx, 24, 16, CV.W - 48, CV.H - 32, C.green, .5);

    var kind = entry.kind === 'tape' ? 'AUDIO RECORD'
             : entry.kind === 'graffiti' ? 'PHYSICAL MARK'
             : entry.kind === 'fragment' ? 'DATA FRAGMENT' : 'TERMINAL';
    G.text(ctx, kind, 32, 22, C.greenDim, 1);
    G.textRight(ctx, entry.where || '', CV.W - 32, 22, C.greenDim, 1);
    G.rect(ctx, 32, 32, CV.W - 64, 1, C.greenDim);
    G.text(ctx, entry.title, 32, 38, C.phosphor, 1);
    G.rect(ctx, 32, 48, CV.W - 64, 1, C.greenDim);

    var start = Math.floor(scroll);
    var shown = Math.floor(revealT);
    for (var i = 0; i < 15; i++) {
      var li = start + i;
      if (li >= entry.lines.length) break;
      if (li > shown) break;
      var line = entry.lines[li];
      /* Bracketed stage directions read as archival annotation, not speech. */
      var col = /^\[.*\]$/.test(line.trim()) ? C.greenDim :
                /^\s+/.test(line) ? C.phosphor : C.green;
      G.text(ctx, line, 34, 56 + i * 11, col, 1);
    }

    /* Cursor */
    if (shown < entry.lines.length && Math.sin(t * 8) > 0) {
      var cy = 56 + Math.min(14, shown - start) * 11;
      G.rect(ctx, 34, cy, 5, 7, C.phosphor);
    }

    var maxScroll = Math.max(0, entry.lines.length - 15);
    if (maxScroll > 0) {
      var barH = (CV.H - 76) * (15 / entry.lines.length);
      var barY = 56 + (CV.H - 76 - barH) * (scroll / maxScroll);
      G.rect(ctx, CV.W - 36, 56, 2, CV.H - 76, '#0d2018');
      G.rect(ctx, CV.W - 36, barY, 2, barH, C.green);
    }

    G.textCentered(ctx, '[' + In.labelFor('interact') + '] CLOSE   [' +
                   In.labelFor('up') + In.labelFor('down') + '] SCROLL',
                   CV.W / 2, CV.H - 24, C.greenDim, 1);
  };

})(window.CV = window.CV || {});
