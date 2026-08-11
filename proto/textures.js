/* CYBERVANIA 3D PROTOTYPE — proto/textures.js
   Procedural surface textures, generated with Canvas2D at boot and handed to three.js
   as CanvasTextures. This is the substitute for a Blender/Substance pipeline: no asset
   files, no downloads, and every surface still gets grime, panel lines and wear.

   Everything here is deterministic (seeded), so the city looks identical every run. */
(function (P) {
  'use strict';

  var T = P.Tex = {};
  var cache = {};

  /* --- seeded rng ---------------------------------------------------------- */
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  T.rng = rng;

  function cv(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  /* Grime pass: blotchy darkening + streaks. Applied on top of every material so
     nothing in the world reads as a clean untextured box. */
  function grime(x, w, h, r, amount) {
    amount = amount === undefined ? 1 : amount;
    for (var i = 0; i < 90 * amount; i++) {
      var gx = r() * w, gy = r() * h;
      var rad = 4 + r() * (w * 0.18);
      var g = x.createRadialGradient(gx, gy, 0, gx, gy, rad);
      g.addColorStop(0, 'rgba(0,0,0,' + (0.05 + r() * 0.14) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
    }
    // vertical rust/water streaks from panel seams
    for (var s = 0; s < 22 * amount; s++) {
      var sx = Math.floor(r() * w), sy = r() * h * 0.5;
      var len = h * (0.15 + r() * 0.5);
      var gg = x.createLinearGradient(0, sy, 0, sy + len);
      gg.addColorStop(0, 'rgba(20,12,6,' + (0.10 + r() * 0.18) + ')');
      gg.addColorStop(1, 'rgba(20,12,6,0)');
      x.fillStyle = gg;
      x.fillRect(sx, sy, 1 + Math.floor(r() * 3), len);
    }
  }

  /* --- industrial wall panel ------------------------------------------------ */
  T.panel = function (opts) {
    opts = opts || {};
    var key = 'panel' + JSON.stringify(opts);
    if (cache[key]) return cache[key];
    var S = 256, c = cv(S, S), x = c.getContext('2d');
    var r = rng(opts.seed || 7);
    var base = opts.base || '#3a4250';

    x.fillStyle = base; x.fillRect(0, 0, S, S);

    // large plates with bevels
    var step = opts.plate || 64;
    for (var py = 0; py < S; py += step) {
      for (var px = 0; px < S; px += step) {
        var v = (r() - 0.5) * 16;
        x.fillStyle = shade(base, v);
        x.fillRect(px, py, step, step);
        x.fillStyle = 'rgba(255,255,255,0.07)';
        x.fillRect(px, py, step, 2);
        x.fillStyle = 'rgba(0,0,0,0.35)';
        x.fillRect(px, py + step - 2, step, 2);
        x.fillRect(px + step - 2, py, 2, step);
        // bolts
        for (var b = 0; b < 4; b++) {
          var bx = px + 6 + (b % 2) * (step - 14);
          var by = py + 6 + Math.floor(b / 2) * (step - 14);
          x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(bx, by, 3, 3);
          x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(bx, by, 2, 2);
        }
      }
    }
    // vents / louvres on some plates
    for (var i = 0; i < (opts.vents === undefined ? 3 : opts.vents); i++) {
      var vx = Math.floor(r() * (S - 70)) + 10, vy = Math.floor(r() * (S - 50)) + 10;
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(vx, vy, 56, 34);
      for (var l = 0; l < 6; l++) {
        x.fillStyle = 'rgba(255,255,255,0.10)';
        x.fillRect(vx + 3, vy + 3 + l * 5, 50, 2);
      }
    }
    // stencilled markings — reads as "this is equipment someone maintained"
    if (opts.stencil !== false) {
      x.save();
      x.globalAlpha = 0.35;
      x.fillStyle = opts.stencilColor || '#c8b070';
      x.font = 'bold 22px monospace';
      x.fillText(opts.label || ('SEC-' + (10 + Math.floor(r() * 80))), 14, S - 20);
      x.restore();
    }
    grime(x, S, S, r, opts.grime === undefined ? 1 : opts.grime);
    return (cache[key] = c);
  };

  /* --- background building facade (window grid) ----------------------------- */
  T.facade = function (opts) {
    opts = opts || {};
    var key = 'facade' + JSON.stringify(opts);
    if (cache[key]) return cache[key];
    var W = 128, H = 256, c = cv(W, H), x = c.getContext('2d');
    var r = rng(opts.seed || 11);
    x.fillStyle = opts.base || '#0d1220';
    x.fillRect(0, 0, W, H);

    var cw = 10, ch = 14, gap = 6;
    for (var wy = 8; wy < H - 10; wy += ch + gap) {
      for (var wx = 6; wx < W - 8; wx += cw + gap) {
        var lit = r() < (opts.lit === undefined ? 0.22 : opts.lit);
        if (lit) {
          var warm = r() < 0.6;
          x.fillStyle = warm ? 'rgba(255,190,120,0.95)' : 'rgba(140,220,255,0.9)';
          x.fillRect(wx, wy, cw, ch);
          // occupant silhouette in a few windows — nobody is home, but the light is on
          if (r() < 0.10) {
            x.fillStyle = 'rgba(0,0,0,0.55)';
            x.fillRect(wx + 3, wy + 5, 4, ch - 5);
          }
        } else {
          x.fillStyle = 'rgba(120,170,210,0.06)';
          x.fillRect(wx, wy, cw, ch);
        }
      }
    }
    grime(x, W, H, r, 0.6);
    return (cache[key] = c);
  };

  /* --- neon sign face -------------------------------------------------------- */
  T.sign = function (text, color, opts) {
    opts = opts || {};
    var key = 'sign' + text + color + JSON.stringify(opts);
    if (cache[key]) return cache[key];
    var W = 256, H = opts.tall ? 256 : 96;
    var c = cv(W, H), x = c.getContext('2d');
    x.fillStyle = '#05070c'; x.fillRect(0, 0, W, H);

    x.strokeStyle = color; x.lineWidth = 3;
    x.strokeRect(8, 8, W - 16, H - 16);

    x.font = 'bold ' + (opts.tall ? 44 : 54) + 'px monospace';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    // glow build-up: several blurred passes then a hot core
    x.shadowColor = color;
    for (var i = 0; i < 4; i++) {
      x.shadowBlur = 24 - i * 5;
      x.fillStyle = color;
      if (opts.tall) {
        for (var k = 0; k < text.length; k++) {
          x.fillText(text[k], W / 2, 44 + k * 48);
        }
      } else x.fillText(text, W / 2, H / 2 + 2);
    }
    x.shadowBlur = 0;
    x.fillStyle = '#ffffff';
    if (opts.tall) {
      for (var k2 = 0; k2 < text.length; k2++) x.fillText(text[k2], W / 2, 44 + k2 * 48);
    } else x.fillText(text, W / 2, H / 2 + 2);
    return (cache[key] = c);
  };

  /* --- wet asphalt / floor ---------------------------------------------------- */
  T.ground = function (opts) {
    opts = opts || {};
    var key = 'ground' + JSON.stringify(opts);
    if (cache[key]) return cache[key];
    var S = 256, c = cv(S, S), x = c.getContext('2d');
    var r = rng(opts.seed || 23);
    x.fillStyle = opts.base || '#16181f'; x.fillRect(0, 0, S, S);

    // aggregate speckle
    for (var i = 0; i < 2600; i++) {
      x.fillStyle = 'rgba(' + (120 + r() * 60 | 0) + ',' + (130 + r() * 60 | 0) + ',' +
                    (145 + r() * 60 | 0) + ',' + (0.03 + r() * 0.10) + ')';
      x.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
    }
    // slab seams
    x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 2;
    for (var s = 0; s <= S; s += 64) {
      x.beginPath(); x.moveTo(s, 0); x.lineTo(s, S); x.stroke();
      x.beginPath(); x.moveTo(0, s); x.lineTo(S, s); x.stroke();
    }
    // puddles — darker, and the shader treats dark ground as more reflective
    for (var p = 0; p < 5; p++) {
      var px = r() * S, py = r() * S, rad = 18 + r() * 42;
      var g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, 'rgba(4,8,14,0.75)');
      g.addColorStop(0.7, 'rgba(4,8,14,0.45)');
      g.addColorStop(1, 'rgba(4,8,14,0)');
      x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    grime(x, S, S, r, 0.8);
    return (cache[key] = c);
  };

  /* --- metal grating (catwalks) ----------------------------------------------- */
  T.grate = function () {
    if (cache.grate) return cache.grate;
    var S = 64, c = cv(S, S), x = c.getContext('2d');
    x.clearRect(0, 0, S, S);
    x.fillStyle = '#6a7484';
    for (var i = 0; i < S; i += 8) {
      x.fillRect(i, 0, 3, S);
      x.fillRect(0, i, S, 3);
    }
    x.fillStyle = 'rgba(255,255,255,0.15)';
    for (var j = 0; j < S; j += 8) x.fillRect(j, 0, 1, S);
    return (cache.grate = c);
  };

  /* --- hazard stripes ---------------------------------------------------------- */
  T.hazard = function (colA, colB) {
    var key = 'hz' + colA + colB;
    if (cache[key]) return cache[key];
    var S = 64, c = cv(S, S), x = c.getContext('2d');
    x.fillStyle = colA || '#0d0d10'; x.fillRect(0, 0, S, S);
    x.fillStyle = colB || '#d8a11e';
    x.save(); x.translate(-S, 0); x.rotate(-0.6);
    for (var i = 0; i < 8; i++) x.fillRect(i * 26, -S, 13, S * 4);
    x.restore();
    var r = rng(5);
    grime(x, S, S, r, 0.5);
    return (cache[key] = c);
  };

  function shade(hex, amt) {
    var i = parseInt(hex.slice(1), 16);
    var rr = Math.max(0, Math.min(255, (i >> 16) + amt));
    var gg = Math.max(0, Math.min(255, ((i >> 8) & 255) + amt));
    var bb = Math.max(0, Math.min(255, (i & 255) + amt));
    return 'rgb(' + (rr | 0) + ',' + (gg | 0) + ',' + (bb | 0) + ')';
  }
  T.shade = shade;

  /* Wrap a canvas as a repeating three.js texture.

     Cached by (canvas, repeat, filter). Creating a CanvasTexture forces a GPU upload
     the first time it is drawn, so making a fresh one per chunk was a direct cause of
     the streaming hitch. Identical requests must return the *same* texture object. */
  var texCache = [];
  T.make = function (canvas, repeatX, repeatY, filterNearest) {
    repeatX = repeatX || 1; repeatY = repeatY || 1;
    for (var i = 0; i < texCache.length; i++) {
      var e = texCache[i];
      if (e.c === canvas && e.rx === repeatX && e.ry === repeatY && e.f === filterNearest) {
        return e.t;
      }
    }
    var t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX || 1, repeatY || 1);
    /* Nearest filtering keeps texel edges crisp, which matters once the whole frame
       is downsampled — bilinear here would fight the pixelation pass. */
    t.magFilter = filterNearest === false ? THREE.LinearFilter : THREE.NearestFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = 1;
    texCache.push({ c: canvas, rx: repeatX, ry: repeatY, f: filterNearest, t: t });
    return t;
  };

  T.textureCount = function () { return texCache.length; };

})(window.PROTO = window.PROTO || {});
