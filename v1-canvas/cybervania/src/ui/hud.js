/* CYBERVANIA — ui/hud.js
   The HUD never flickers. Health pips, energy bar and frame indicator are always
   in the same place, always legible, and animate only when their value changes.
   Style loses to legibility every time (rule 40). */
(function (CV) {
  'use strict';

  var G = CV.Gfx, C = CV.Palette.c, U = CV.Util;
  var H = CV.HUD = {};

  H.bossName = null;

  var toastText = '', toastT = 0;
  var broadcastText = '', broadcastT = 0;
  var energyFlash = 0, damageFlash = 0;
  var areaTitle = null, areaT = 0;
  var acquire = null, acquireT = 0;
  var hpDisplay = 4, enDisplay = 0;
  var bootT = 0;      // the HUD assembles itself over the first two minutes

  H.reset = function () {
    toastT = 0; broadcastT = 0; areaT = 0; acquireT = 0; acquire = null;
    H.bossName = null;
  };

  H.bootIn = function (sec) { bootT = sec; };

  H.toast = function (text) { toastText = text; toastT = 2.6; };
  H.broadcast = function (text) { broadcastText = text; broadcastT = 6.0; };
  H.flashEnergy = function () { energyFlash = 0.5; };
  H.damageFlash = function () { damageFlash = 0.6; };

  H.showArea = function (name, subtitle) {
    areaTitle = { name: name, sub: subtitle || '' };
    areaT = 3.4;
  };

  H.showAcquire = function (kind, name, blurb) {
    acquire = { kind: kind, name: name, blurb: blurb };
    acquireT = 4.2;
    CV.Engine.paused = false;
  };
  H.acquireActive = function () { return acquireT > 0; };

  H.update = function (dt) {
    toastT = Math.max(0, toastT - dt);
    broadcastT = Math.max(0, broadcastT - dt);
    areaT = Math.max(0, areaT - dt);
    acquireT = Math.max(0, acquireT - dt);
    energyFlash = Math.max(0, energyFlash - dt * 2);
    damageFlash = Math.max(0, damageFlash - dt * 2);
    bootT = Math.max(0, bootT - dt);

    var p = CV.Player;
    hpDisplay = U.damp(hpDisplay, p.hp, 12, dt);
    enDisplay = U.damp(enDisplay, p.energy, 14, dt);

    if (acquireT > 0 && (CV.Input.pressed('jump') || CV.Input.pressed('attack'))) {
      acquireT = Math.min(acquireT, 0.3);
    }
  };

  H.render = function (ctx) {
    var p = CV.Player;

    /* --- integrity pips ---------------------------------------------------- */
    if (bootT < 6) {
      for (var i = 0; i < p.maxHp; i++) {
        var x = 8 + i * 9, y = 8;
        var filled = i < Math.ceil(hpDisplay - 0.01);
        var partial = (i === Math.floor(hpDisplay) && hpDisplay % 1 > 0.05);
        G.rect(ctx, x, y, 7, 7, '#0a1018');
        G.frame(ctx, x, y, 7, 7, filled ? C.cyanDim : '#1b2836', 1);
        if (filled) {
          var col = p.hp <= 1 ? C.red : C.cyan;
          G.rect(ctx, x + 1, y + 1, 5, 5, col);
          if (p.hp <= 1 && Math.sin(CV.Engine.realTime * 8) > 0) {
            G.glow(ctx, x + 3.5, y + 3.5, 8, C.red, .5);
          }
        }
        if (partial) { G.rect(ctx, x + 1, y + 1, 5, 5, CV.Palette.alpha(C.cyan, .35)); }
      }
    }

    /* --- energy ------------------------------------------------------------- */
    if (bootT < 4) {
      var maxE = p.maxEnergy();
      var ew = 68;
      var ecol = energyFlash > 0 && Math.sin(CV.Engine.realTime * 30) > 0
                 ? C.red : p.frame.color;
      G.rect(ctx, 7, 19, ew + 2, 7, '#080d14');
      G.meter(ctx, 8, 20, ew, 5, enDisplay / maxE, ecol, '#0d1620');
      /* Cipher drains — mark the direction of travel so it never feels like a bug. */
      if (p.frameId === 'cipher' && CV.DataSphere.layer === 0) {
        G.text(ctx, '-', 8 + ew + 5, 19, C.red, 1);
      }
    }

    /* --- frame indicator ----------------------------------------------------- */
    if (CV.State.frameCount() > 1) {
      var fy = 30;
      var order = CV.Frames.order;
      var slot = 0;
      for (var f = 0; f < order.length; f++) {
        var id = order[f];
        if (!CV.State.hasFrame(id)) continue;
        var fd = CV.Frames.defs[id];
        var fx = 8 + slot * 15;
        var on = p.frameId === id;
        G.rect(ctx, fx, fy, 13, 11, on ? CV.Palette.alpha(fd.color, .25) : '#0a1018');
        G.frame(ctx, fx, fy, 13, 11, on ? fd.color : '#1b2836', 1);
        G.text(ctx, String(f + 1), fx + 2, fy + 2, on ? fd.color : '#3d4c60', 1);
        G.text(ctx, fd.name.charAt(0), fx + 7, fy + 2, on ? C.white : '#3d4c60', 1);
        slot++;
      }
    }

    /* --- active module ------------------------------------------------------- */
    if (p.activeModule) {
      var md = CV.Modules.defs[p.activeModule];
      var mx = CV.W - 30, my = CV.H - 26;
      G.panel(ctx, mx - 2, my - 2, 26, 24, CV.Palette.alpha(p.frame.color, .8), .7);
      CV.Modules.drawIcon(ctx, md.icon, mx + 6, my, p.frame.color,
                          p.energy < CV.Modules.cost(p.activeModule, p.frame));
      G.textCentered(ctx, String(CV.Modules.cost(p.activeModule, p.frame)),
                     mx + 11, my + 13, '#7d94ad', 1);
    }

    /* --- suppression warning (Nullifier) ------------------------------------- */
    if (CV.State.suppress > 0) {
      var sw = 96;
      G.panel(ctx, CV.W / 2 - sw / 2, 22, sw, 12, C.violet, .8);
      G.textCentered(ctx, 'MODULES SUPPRESSED', CV.W / 2, 25, C.violet, 1);
    }

    /* --- boss bar ------------------------------------------------------------ */
    if (H.bossName && CV.Bosses.current) {
      var b = CV.Bosses.current;
      var bw = 240, bx = (CV.W - bw) / 2, by = CV.H - 22;
      G.text(ctx, H.bossName, bx, by - 10, C.white, 1);
      G.textRight(ctx, 'PHASE ' + (b.phase + 1), bx + bw, by - 10, C.redDim, 1);
      G.rect(ctx, bx - 1, by - 1, bw + 2, 6, '#0a0d14');
      G.meter(ctx, bx, by, bw, 4, b.hp / b.maxHp, b.invuln > 0 ? C.chrome : C.red, '#1a0d12');
    }

    /* --- area title ---------------------------------------------------------- */
    if (areaT > 0 && areaTitle) {
      var a = areaT > 3.0 ? (3.4 - areaT) / 0.4 : Math.min(1, areaT / 0.8);
      ctx.globalAlpha = U.clamp(a, 0, 1);
      var slide = (1 - U.easeOut(U.clamp(a, 0, 1))) * 14;
      G.textCentered(ctx, areaTitle.name, CV.W / 2 + slide, CV.H / 2 - 22, C.white, 2);
      G.rect(ctx, CV.W / 2 - 50, CV.H / 2 - 6, 100, 1, CV.Palette.alpha(C.cyan, .6));
      if (areaTitle.sub) {
        G.textCentered(ctx, areaTitle.sub, CV.W / 2 - slide, CV.H / 2 + 1, C.cyanDim, 1);
      }
      ctx.globalAlpha = 1;
    }

    /* --- acquisition card ----------------------------------------------------- */
    if (acquireT > 0 && acquire) {
      var k = acquireT > 3.8 ? (4.2 - acquireT) / 0.4 : Math.min(1, acquireT / 0.5);
      k = U.clamp(k, 0, 1);
      var cw = 240, chh = 62;
      var cx = (CV.W - cw) / 2, cy = CV.H / 2 - 40 + (1 - U.easeOutBack(k)) * 20;
      ctx.globalAlpha = k;
      G.panel(ctx, cx, cy, cw, chh, C.cyan, .92);
      G.text(ctx, acquire.kind, cx + 8, cy + 7, C.cyanDim, 1);
      G.textGlow(ctx, acquire.name, cx + 8, cy + 20, C.white, 2, 1);
      var lines = G.wrap(acquire.blurb, cw - 18, 1);
      for (var li = 0; li < lines.length && li < 2; li++) {
        G.text(ctx, lines[li], cx + 8, cy + 40 + li * 9, C.chrome, 1);
      }
      ctx.globalAlpha = 1;
    }

    /* --- toast ---------------------------------------------------------------- */
    if (toastT > 0) {
      var ta = Math.min(1, toastT / 0.4);
      ctx.globalAlpha = ta;
      var tw = G.textWidth(toastText, 1) + 12;
      G.panel(ctx, CV.W / 2 - tw / 2, CV.H - 46, tw, 13, C.cyanDim, .82);
      G.textCentered(ctx, toastText, CV.W / 2, CV.H - 43, C.cyanGlow, 1);
      ctx.globalAlpha = 1;
    }

    /* --- ATLAS ambient broadcast ----------------------------------------------- */
    if (broadcastT > 0 && !CV.DialogUI.active) {
      var ba = Math.min(1, broadcastT / 0.8) * Math.min(1, (6.0 - broadcastT) / 0.5);
      ctx.globalAlpha = U.clamp(ba, 0, 1) * 0.72;
      G.text(ctx, 'ATLAS', 8, CV.H - 20, C.redDim, 1);
      G.text(ctx, broadcastText, 8, CV.H - 12, '#7d94ad', 1);
      ctx.globalAlpha = 1;
    }

    /* --- damage vignette -------------------------------------------------------- */
    if (damageFlash > 0) {
      ctx.save();
      ctx.globalAlpha = damageFlash * 0.5;
      var g = ctx.createRadialGradient(CV.W / 2, CV.H / 2, CV.H * 0.25,
                                       CV.W / 2, CV.H / 2, CV.H * 0.8);
      g.addColorStop(0, 'rgba(255,68,89,0)');
      g.addColorStop(1, 'rgba(255,68,89,0.9)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CV.W, CV.H);
      ctx.restore();
    }

    /* --- death prompt ------------------------------------------------------------ */
    if (CV.Player.dead) {
      ctx.fillStyle = 'rgba(4,2,4,' + U.clamp(1 - CV.Player.deadTimer / 2, 0, .8) + ')';
      ctx.fillRect(0, 0, CV.W, CV.H);
      G.textCentered(ctx, 'SYSTEM FAILURE', CV.W / 2, CV.H / 2 - 8, C.red, 2);
      G.textCentered(ctx, 'RESTORING FROM LAST DOCK', CV.W / 2, CV.H / 2 + 10, C.redDim, 1);
    }
  };

})(window.CV = window.CV || {});
