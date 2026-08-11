/* CYBERVANIA — render/postfx.js
   The CRT pass. Scanlines, vignette, phosphor bleed, chromatic split and glitch
   bursts. Everything here is individually switchable in SYSTEM settings — a style
   effect that can make the game unplayable for someone gets a switch (PROGRESSION §7). */
(function (CV) {
  'use strict';

  var PF = CV.PostFX = {}, G = CV.Gfx, U = CV.Util;

  var scanlines = null, vignette = null, noise = null, noiseFrames = 4, nIdx = 0;

  PF.chroma = 0;       // transient chromatic split — damage, boss hits, layer swaps
  PF.glitch = 0;       // transient block-glitch intensity
  PF.flash = 0;        // full-screen white flash amount
  PF.flashColor = '#ffffff';
  PF.desat = 0;        // 0..1 desaturation dip on player damage

  PF.init = function () {
    // scanline overlay: baked once, blitted every frame
    scanlines = G.makeCanvas(CV.W, CV.H);
    var s = G.ctxOf(scanlines);
    /* Kept deliberately gentle. A heavier grille looks better in a still and makes
       a 14px robot unreadable in motion — legibility wins (rule 40). */
    for (var y = 0; y < CV.H; y += 2) {
      s.fillStyle = 'rgba(0,0,0,0.13)';
      s.fillRect(0, y, CV.W, 1);
    }
    // faint vertical phosphor mask — the "aperture grille" cue
    for (var x = 0; x < CV.W; x += 3) {
      s.fillStyle = 'rgba(0,0,0,0.03)';
      s.fillRect(x, 0, 1, CV.H);
    }

    vignette = G.makeCanvas(CV.W, CV.H);
    var v = G.ctxOf(vignette);
    var g = v.createRadialGradient(CV.W / 2, CV.H / 2, CV.H * 0.30,
                                   CV.W / 2, CV.H / 2, CV.H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.65, 'rgba(0,0,0,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0.46)');
    v.fillStyle = g;
    v.fillRect(0, 0, CV.W, CV.H);
    // slight corner tint — old tubes never had neutral corners
    v.globalCompositeOperation = 'lighter';
    var g2 = v.createRadialGradient(CV.W / 2, CV.H / 2, CV.H * .5, CV.W / 2, CV.H / 2, CV.H);
    g2.addColorStop(0, 'rgba(0,0,0,0)');
    g2.addColorStop(1, 'rgba(20,40,60,0.10)');
    v.fillStyle = g2;
    v.fillRect(0, 0, CV.W, CV.H);

    // pre-baked animated noise — avoids per-frame random pixel work
    noise = [];
    for (var f = 0; f < noiseFrames; f++) {
      var c = G.makeCanvas(CV.W >> 1, CV.H >> 1), n = G.ctxOf(c);
      var img = n.createImageData(c.width, c.height), d = img.data;
      for (var i = 0; i < d.length; i += 4) {
        var v2 = (CV.rngArt.next() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v2;
        d[i + 3] = 14;
      }
      n.putImageData(img, 0, 0);
      noise.push(c);
    }
  };

  PF.pulse = function (chroma, glitch) {
    PF.chroma = Math.max(PF.chroma, chroma || 0);
    PF.glitch = Math.max(PF.glitch, glitch || 0);
  };

  PF.whiteFlash = function (amount, color) {
    PF.flash = Math.max(PF.flash, amount);
    PF.flashColor = color || '#ffffff';
  };

  PF.update = function (dt) {
    PF.chroma = Math.max(0, PF.chroma - dt * 3.2);
    PF.glitch = Math.max(0, PF.glitch - dt * 2.6);
    PF.flash = Math.max(0, PF.flash - dt * 4.5);
    PF.desat = Math.max(0, PF.desat - dt * 2.0);
  };

  /* `src` is the finished game frame; we composite effects onto `dst` (the visible
     canvas) at the display resolution. Chromatic split is done with two additive
     draws of the source, offset — a genuine RGB split would need getImageData
     every frame, which is the one thing Canvas2D is actually slow at. */
  PF.render = function (dst, src, t) {
    var S = CV.Settings;
    var dw = dst.width, dh = dst.height;
    var ctx = dst.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, dw, dh);

    var scale = dw / CV.W;
    var ch = PF.chroma * (S.chromatic ? 1 : 0);

    if (ch > 0.01) {
      var off = Math.max(1, ch * 4) * scale;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(src, 0, 0, dw, dh);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.34 * Math.min(1, ch * 2);
      ctx.filter = 'url(#none)';
      /* Cheap approximation: draw the frame twice, offset left/right, additively.
         At 1px-ish offsets this is visually indistinguishable from a channel split. */
      ctx.drawImage(src, -off, 0, dw, dh);
      ctx.drawImage(src, off, 0, dw, dh);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(src, 0, 0, dw, dh);
    }

    // horizontal tear bands
    if (PF.glitch > 0.01 && S.glitch) {
      var bands = 2 + Math.floor(PF.glitch * 6);
      for (var i = 0; i < bands; i++) {
        var by = Math.floor((U.hash11(Math.floor(t * 34) * 7 + i * 13) * .5 + .5) * CV.H);
        var bh = 2 + Math.floor((U.hash11(i * 91 + Math.floor(t * 30)) * .5 + .5) * 9);
        var bx = U.hash11(i * 3 + Math.floor(t * 41)) * 16 * PF.glitch;
        ctx.drawImage(src, 0, by, CV.W, bh,
                      bx * scale, by * scale, dw, bh * scale);
      }
      // occasional colour bar
      if (PF.glitch > .5) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = .12 * PF.glitch;
        ctx.fillStyle = CV.Palette.c.magenta;
        var gy = (U.hash11(Math.floor(t * 20)) * .5 + .5) * dh;
        ctx.fillRect(0, gy, dw, 3 * scale);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    if (S.scanlines) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(scanlines, 0, 0, dw, dh);
      ctx.globalAlpha = 1;
      // rolling brightness bar — the thing that makes it read as a real tube
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.035;
      ctx.fillStyle = '#9fd8ff';
      var ry = ((t * 60) % (CV.H + 60) - 30) * scale;
      ctx.fillRect(0, ry, dw, 22 * scale);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    if (S.noise) {
      nIdx = (nIdx + 1) % noiseFrames;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(noise[nIdx], 0, 0, dw, dh);
      ctx.globalAlpha = 1;
    }

    if (S.vignette) ctx.drawImage(vignette, 0, 0, dw, dh);

    if (PF.flash > 0.005) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, PF.flash);
      ctx.fillStyle = PF.flashColor;
      ctx.fillRect(0, 0, dw, dh);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    if (PF.desat > 0.01) {
      ctx.globalCompositeOperation = 'saturation';
      ctx.globalAlpha = Math.min(.9, PF.desat);
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, dw, dh);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  };

})(window.CV = window.CV || {});
