/* CYBERVANIA — ui/title.js
   Title screen and slot select. Doubles as the audio unlock gesture (browsers will
   not start WebAudio until the player presses something). */
(function (CV) {
  'use strict';

  var G = CV.Gfx, C = CV.Palette.c, U = CV.Util, In = CV.Input;
  var T = CV.Title = {};

  T.active = false;
  var cursor = 0, t = 0, mode = 0;    // 0 = main, 1 = slot select
  var slots = [null, null, null];
  var pendingNew = false;
  var cam = { x: 0, y: 0, rx: function () { return 0; }, ry: function () { return 0; },
              visible: function () { return true; } };

  T.show = function () {
    T.active = true;
    t = 0; cursor = 0; mode = 0;
    refresh();
    CV.Audio.setRegion('neoncity');
  };

  function refresh() {
    for (var i = 0; i < 3; i++) slots[i] = CV.Save.summary(i + 1);
  }

  T.hasAnySave = function () {
    return !!(CV.Save.exists(1) || CV.Save.exists(2) || CV.Save.exists(3));
  };

  T.update = function (dt) {
    t += dt;
    cam.x = t * 14;

    if (In.anyKeyAt >= In.now() - 0.05) CV.Audio.unlock();

    if (mode === 0) {
      var items = mainItems();
      if (In.pressed('down')) { cursor = (cursor + 1) % items.length; CV.Audio.sfx('ui'); }
      if (In.pressed('up')) { cursor = (cursor + items.length - 1) % items.length; CV.Audio.sfx('ui'); }
      if (In.pressed('jump') || In.pressed('interact') || In.pressed('attack')) {
        items[cursor].run();
      }
    } else {
      if (In.pressed('down')) { cursor = (cursor + 1) % 3; CV.Audio.sfx('ui'); }
      if (In.pressed('up')) { cursor = (cursor + 2) % 3; CV.Audio.sfx('ui'); }
      if (In.pressed('pause')) { mode = 0; cursor = 0; CV.Audio.sfx('uiBack'); }
      if (In.pressed('jump') || In.pressed('interact') || In.pressed('attack')) {
        var slot = cursor + 1;
        if (pendingNew) {
          CV.Audio.sfx('save');
          T.active = false;
          CV.Game.startNew(slot);
        } else if (slots[cursor]) {
          CV.Audio.sfx('save');
          T.active = false;
          CV.Game.startLoad(slot);
        } else {
          CV.Audio.sfx('deny');
        }
      }
      /* Erase a slot: hold DASH and press DOWN-attack is fiddly; use SPECIAL. */
      if (In.pressed('special') && slots[cursor]) {
        CV.Save.erase(cursor + 1);
        refresh();
        CV.Audio.sfx('uiBack');
      }
    }
  };

  function mainItems() {
    var items = [];
    if (T.hasAnySave()) {
      items.push({ label: 'CONTINUE', run: function () {
        pendingNew = false; mode = 1; cursor = firstUsedSlot(); CV.Audio.sfx('ui');
      } });
    }
    items.push({ label: 'NEW UNIT', run: function () {
      pendingNew = true; mode = 1; cursor = 0; CV.Audio.sfx('ui');
    } });
    items.push({ label: 'SETTINGS', run: function () {
      T.active = false; CV.Game.openMenuFromTitle();
    } });
    return items;
  }

  function firstUsedSlot() {
    for (var i = 0; i < 3; i++) if (slots[i]) return i;
    return 0;
  }

  T.render = function (ctx) {
    /* Live parallax behind the title — the city keeps running whether you play or not. */
    CV.Parallax.render(ctx, cam, 'neoncity', false, t);
    CV.Parallax.renderRain(ctx, cam, t, 0.8, 0.35);
    CV.Parallax.renderForeground(ctx, cam, 'neoncity', false);

    ctx.fillStyle = 'rgba(3,5,12,0.38)';
    ctx.fillRect(0, 0, CV.W, CV.H);

    /* Logo. Letter-spaced, with a scan bar sweeping through it. */
    var title = 'CYBERVANIA';
    var scale = 3, sp = 3;
    var tw = title.length * (5 * scale + sp) - sp;
    var lx = (CV.W - tw) / 2, ly = 52;
    for (var i = 0; i < title.length; i++) {
      var jitter = (U.noise1(t * 3 + i * 4) > 0.86) ? Math.round(U.noise1(t * 40 + i) * 2) : 0;
      G.textGlow(ctx, title.charAt(i), lx + i * (5 * scale + sp) + jitter, ly,
                 C.cyanGlow, scale, 1);
    }
    /* Scan bar */
    var sy = ly + ((t * 26) % (7 * scale + 14)) - 4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = C.magenta;
    ctx.fillRect(lx - 10, sy, tw + 20, 2);
    ctx.restore();

    G.textCentered(ctx, 'AN UNREGISTERED UNIT IN A CITY THAT NO LONGER NEEDS PEOPLE',
                   CV.W / 2, ly + 30, CV.Palette.alpha(C.chrome, .85), 1);

    if (mode === 0) {
      var items = mainItems();
      for (var k = 0; k < items.length; k++) {
        var iy = 140 + k * 18;
        var sel = k === cursor;
        var w = 120;
        if (sel) {
          G.panel(ctx, CV.W / 2 - w / 2, iy - 4, w, 15, C.cyan, .55);
          G.text(ctx, '>', CV.W / 2 - w / 2 + 5, iy, C.cyanGlow, 1);
        }
        G.textCentered(ctx, items[k].label, CV.W / 2, iy, sel ? C.white : '#5d7488', 1);
      }
    } else {
      G.textCentered(ctx, pendingNew ? 'SELECT A SLOT — EXISTING DATA WILL BE OVERWRITTEN'
                                     : 'SELECT A SLOT', CV.W / 2, 120, C.cyanDim, 1);
      for (var s = 0; s < 3; s++) {
        var by = 136 + s * 32, bw = 260, bx = (CV.W - bw) / 2;
        var sel2 = s === cursor;
        G.panel(ctx, bx, by, bw, 28, sel2 ? C.cyan : '#1b2a38', .82);
        G.text(ctx, 'SLOT ' + (s + 1), bx + 8, by + 5, sel2 ? C.cyanGlow : '#4d6484', 1);
        if (slots[s]) {
          G.text(ctx, slots[s].area, bx + 60, by + 5, C.white, 1);
          G.text(ctx, slots[s].time, bx + 8, by + 16, '#5d7488', 1);
          G.text(ctx, slots[s].completion + '%   ' + slots[s].frames + ' CHASSIS   ' +
                 slots[s].modules + ' MODULES', bx + 60, by + 16, '#5d7488', 1);
          if (sel2) G.textRight(ctx, '[' + In.labelFor('special') + '] ERASE',
                                bx + bw - 8, by + 16, '#3d4c60', 1);
        } else {
          G.text(ctx, 'EMPTY', bx + 60, by + 10, '#33465c', 1);
        }
      }
      G.textCentered(ctx, '[' + In.labelFor('pause') + '] BACK', CV.W / 2, CV.H - 22,
                     '#33465c', 1);
    }

    if (!CV.Save.storageAvailable()) {
      G.textCentered(ctx, 'BROWSER STORAGE UNAVAILABLE — PROGRESS WILL NOT PERSIST',
                     CV.W / 2, CV.H - 12, C.red, 1);
    } else {
      G.textCentered(ctx, 'F3 DEBUG   -   ARROWS / WASD   -   ' +
                     In.labelFor('jump') + ' CONFIRM', CV.W / 2, CV.H - 12, '#26364a', 1);
    }
  };

})(window.CV = window.CV || {});
