/* CYBERVANIA — render/parallax.js
   The 2.5D depth stack (rule 23). Six layers, each scrolling at its own rate, all
   generated procedurally per region and baked into tiling canvases at boot.
   Cost per frame: ~10 drawImage calls, regardless of how busy the city looks. */
(function (CV) {
  'use strict';

  var P = CV.Parallax = {}, G = CV.Gfx, C = CV.Palette.c, U = CV.Util;
  var W = CV.W, H = CV.H;

  var TILE_W = 512;          // each layer is a horizontally tiling strip
  var cache = {};            // regionId -> baked layers

  /* --- generators ---------------------------------------------------------- */

  /* Far skyline: flat silhouettes, almost no detail. Depth cue only. */
  function bakeSkyline(rng, pal, height, color, density, windowChance) {
    var c = G.makeCanvas(TILE_W, height), x = G.ctxOf(c);
    var px = 0;
    while (px < TILE_W + 40) {
      var w = rng.int(14, 46), h = rng.int(height * 0.25, height * 0.95);
      x.fillStyle = color;
      x.fillRect(px, height - h, w, h);
      /* antenna / spire */
      if (rng.chance(.28)) {
        x.fillRect(px + (w >> 1), height - h - rng.int(4, 14), 1, 14);
        if (rng.chance(.5)) {
          x.fillStyle = CV.Palette.alpha(C.red, .5);
          x.fillRect(px + (w >> 1) - 0, height - h - 12, 1, 1);
        }
      }
      /* lit windows */
      if (windowChance > 0) {
        for (var wy = height - h + 4; wy < height - 3; wy += 4) {
          for (var wx = px + 2; wx < px + w - 2; wx += 3) {
            if (rng.chance(windowChance)) {
              x.fillStyle = rng.chance(.12) ? pal.key : CV.Palette.alpha(pal.key, .35);
              x.fillRect(wx, wy, 1, 2);
            }
          }
        }
      }
      px += w + rng.int(1, 8) * (1 / density);
    }
    /* City glow: the region's neon bounces off the smog and lights the skyline from
       below. Without this the distant layers sit at the same value as the sky and
       the depth stack collapses into one flat plane. */
    var glow = x.createLinearGradient(0, height * 0.25, 0, height);
    glow.addColorStop(0, CV.Palette.alpha(pal.key, 0));
    glow.addColorStop(1, CV.Palette.alpha(pal.key, 0.22));
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = glow;
    x.fillRect(0, 0, TILE_W, height);
    x.globalCompositeOperation = 'source-over';
    return c;
  }

  /* Mid layer: readable structure — pipes, gantries, vents, cooling towers. */
  function bakeStructures(rng, pal, height) {
    var c = G.makeCanvas(TILE_W, height), x = G.ctxOf(c);
    var px = 0;
    while (px < TILE_W + 60) {
      var kind = rng.int(0, 3), w = rng.int(30, 80), h = rng.int(height * .35, height * .9);
      var top = height - h;
      /* Structures read as near-silhouettes: they must be *darker* than the sky
         gradient behind them, or the whole backdrop turns to mush. */
      x.fillStyle = CV.Palette.mix(pal.solid, '#000000', .55);
      x.fillRect(px, top, w, h);
      x.fillStyle = pal.solidEdge;
      x.fillRect(px, top, w, 1);
      x.fillStyle = CV.Palette.alpha('#000000', .5);
      x.fillRect(px + w - 2, top, 2, h);

      if (kind === 0) {                 // vertical pipe bank
        for (var i = px + 4; i < px + w - 4; i += 6) {
          x.fillStyle = pal.solidLit; x.fillRect(i, top + 4, 3, h - 4);
          x.fillStyle = CV.Palette.alpha('#000', .4); x.fillRect(i + 2, top + 4, 1, h - 4);
          for (var j = top + 10; j < height; j += 18) {
            x.fillStyle = pal.solidEdge; x.fillRect(i - 1, j, 5, 2);
          }
        }
      } else if (kind === 1) {          // window grid
        for (var wy = top + 5; wy < height - 4; wy += 7) {
          for (var wx = px + 4; wx < px + w - 5; wx += 6) {
            x.fillStyle = rng.chance(.34) ? CV.Palette.alpha(pal.key, .75)
                                          : 'rgba(0,0,0,0.45)';
            x.fillRect(wx, wy, 4, 4);
          }
        }
      } else if (kind === 2) {          // gantry + rails
        x.fillStyle = pal.solidEdge;
        x.fillRect(px, top + 6, w, 2);
        for (var g = px + 3; g < px + w; g += 9) x.fillRect(g, top + 8, 1, 10);
        x.fillStyle = CV.Palette.alpha(pal.key, .6);
        x.fillRect(px + 2, top + 4, w - 4, 1);
      } else {                          // cooling stack
        x.fillStyle = pal.solidLit;
        x.fillRect(px + w * .2, top - 12, w * .6, 14);
        x.fillStyle = CV.Palette.alpha(pal.key, .25);
        x.fillRect(px + w * .25, top - 16, w * .5, 4);
      }
      px += w + rng.int(6, 30);
    }
    return c;
  }

  /* Near backdrop: the wall directly behind the play space. Dark, textured, quiet. */
  function bakeBackWall(rng, pal) {
    var c = G.makeCanvas(TILE_W, 256), x = G.ctxOf(c);
    /* The back wall must sit clearly *below* the gameplay tiles in value. If the
       backdrop and the platforms are the same brightness the player cannot tell
       what they can stand on, which is the one thing the art must never do. */
    x.fillStyle = CV.Palette.mix(pal.solid, '#000000', .72);
    x.fillRect(0, 0, TILE_W, 256);
    for (var i = 0; i < 260; i++) {
      var bx = rng.int(0, TILE_W), by = rng.int(0, 256);
      x.fillStyle = CV.Palette.alpha(pal.solidLit, rng.range(.03, .10));
      x.fillRect(bx, by, rng.int(6, 26), rng.int(1, 3));
    }
    /* structural ribs every ~48px give scale and keep it from reading as noise */
    for (var r = 0; r < TILE_W; r += 48) {
      x.fillStyle = CV.Palette.alpha('#000000', .40);
      x.fillRect(r, 0, 4, 256);
      x.fillStyle = CV.Palette.alpha(pal.solidLit, .12);
      x.fillRect(r + 4, 0, 1, 256);
    }
    /* an occasional lit conduit */
    for (var k = 0; k < 6; k++) {
      var cy = rng.int(10, 246);
      x.fillStyle = CV.Palette.alpha(pal.key, .16);
      x.fillRect(0, cy, TILE_W, 1);
    }
    return c;
  }

  /* Foreground silhouette strip — pure black shapes at 1.3x parallax. Frames the shot. */
  function bakeForeground(rng) {
    var c = G.makeCanvas(TILE_W, 96), x = G.ctxOf(c);
    var px = 0;
    while (px < TILE_W + 40) {
      var w = rng.int(6, 22), h = rng.int(10, 80);
      x.fillStyle = '#000000';
      x.fillRect(px, 96 - h, w, h);
      if (rng.chance(.35)) x.fillRect(px - 3, 96 - h, w + 6, 3);
      px += w + rng.int(50, 170);
    }
    return c;
  }

  function build(regionId, isData) {
    var pal = isData ? CV.Palette.data : CV.Palette.region(regionId);
    var rng = CV.rngArt.fork(hashStr(regionId) + (isData ? 999 : 0));
    var wc = regionId === 'neoncity' ? .26 : regionId === 'central' ? .02 : .10;
    return {
      pal: pal,
      far: bakeSkyline(rng, pal, 140, CV.Palette.mix(pal.bg[2], '#000', .55), 1, wc * .5),
      mid: bakeSkyline(rng, pal, 170, CV.Palette.mix(pal.bg[2], '#000', .72), 1.4, wc),
      structures: bakeStructures(rng, pal, 190),
      wall: bakeBackWall(rng, pal),
      fore: bakeForeground(rng)
    };
  }

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  P.get = function (regionId, isData) {
    var key = regionId + (isData ? ':data' : '');
    return cache[key] || (cache[key] = build(regionId, isData));
  };

  /* Pre-bake everything used by the built regions so there is no hitch on first entry. */
  P.prebake = function (regionIds) {
    for (var i = 0; i < regionIds.length; i++) { P.get(regionIds[i], false); }
    P.get('servers', true);
  };

  function tileX(ctx, img, x, y, w, h, alpha) {
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    var start = -(((x % TILE_W) + TILE_W) % TILE_W);
    for (var px = start; px < CV.W; px += TILE_W) {
      ctx.drawImage(img, 0, 0, img.width, img.height, px | 0, y | 0, TILE_W, h || img.height);
    }
    ctx.globalAlpha = 1;
  }

  /* --- render -------------------------------------------------------------- */

  P.render = function (ctx, cam, regionId, isData, t) {
    var L = P.get(regionId, isData), pal = L.pal;
    var horizon = CV.H * 0.62;

    // 1. sky gradient — regenerated only when the region changes
    var g = ctx.createLinearGradient(0, 0, 0, CV.H);
    g.addColorStop(0, pal.bg[0]);
    g.addColorStop(.55, pal.bg[1]);
    g.addColorStop(1, pal.bg[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CV.W, CV.H);

    /* A slow-moving vertical light shaft. One line of code, enormous atmosphere. */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .05;
    ctx.fillStyle = pal.key;
    var sx = (Math.sin(t * .12) * .5 + .5) * CV.W;
    ctx.fillRect(sx - 40, 0, 80, CV.H);
    ctx.restore();

    // 2. far skyline
    tileX(ctx, L.far, cam.x * 0.05, horizon - L.far.height + 26, 0, 0, .75);
    // 3. mid skyline
    tileX(ctx, L.mid, cam.x * 0.13, horizon - L.mid.height + 40, 0, 0, .88);
    // 4. structures
    tileX(ctx, L.structures, cam.x * 0.30, horizon - L.structures.height + 78, 0, 0, 1);
    // 5. near back wall — follows y as well, so vertical rooms feel deep
    ctx.save();
    ctx.globalAlpha = .92;
    var wy = -((cam.y * 0.55) % 256) - 128;
    var wx = -(((cam.x * 0.55) % TILE_W) + TILE_W) % TILE_W;
    for (var py = wy; py < CV.H; py += 256) {
      for (var px = wx; px < CV.W; px += TILE_W) ctx.drawImage(L.wall, px | 0, py | 0);
    }
    ctx.restore();

    // regional fog wash sits between backdrop and gameplay layer
    ctx.fillStyle = pal.fog;
    ctx.fillRect(0, 0, CV.W, CV.H);
  };

  P.renderForeground = function (ctx, cam, regionId, isData) {
    var L = P.get(regionId, isData);
    ctx.globalAlpha = .85;
    var x = -(((cam.x * 1.28 % TILE_W) + TILE_W) % TILE_W);
    for (var px = x; px < CV.W; px += TILE_W) {
      ctx.drawImage(L.fore, px | 0, (CV.H - 96 - cam.y * 0.12) | 0);
    }
    ctx.globalAlpha = 1;
  };

  /* --- weather ------------------------------------------------------------- */
  /* Rain is simulated as a scrolling deterministic field rather than particles:
     600 drops for the cost of 600 fillRects and zero state. */
  P.renderRain = function (ctx, cam, t, intensity, wind) {
    if (intensity <= 0) return;
    var n = Math.floor(220 * intensity);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < n; i++) {
      var seed = i * 127.1;
      var speed = 300 + (i % 7) * 70;
      var x = (U.hash11(i * 31) * 0.5 + 0.5) * (CV.W + 120) - 60
              + ((t * wind * speed) % (CV.W + 120)) - cam.x * .3;
      var y = ((U.hash11(i * 17) * 0.5 + 0.5) * CV.H + t * speed) % (CV.H + 40) - 20;
      x = ((x % (CV.W + 120)) + CV.W + 120) % (CV.W + 120) - 60;
      var len = 4 + (i % 5);
      ctx.fillStyle = i % 9 === 0 ? 'rgba(160,240,255,0.30)' : 'rgba(120,180,220,0.14)';
      ctx.fillRect(x | 0, y | 0, 1, len);
    }
    ctx.restore();
  };

  /* Drifting dust/ash motes — used in Undercity, Factory and Reactor. */
  P.renderMotes = function (ctx, cam, t, count, color) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < count; i++) {
      var x = ((U.hash11(i * 53) * .5 + .5) * 900 + Math.sin(t * .3 + i) * 24 - cam.x * .45);
      x = ((x % (CV.W + 40)) + CV.W + 40) % (CV.W + 40) - 20;
      var y = ((U.hash11(i * 91) * .5 + .5) * 700 - t * (6 + (i % 5) * 3) - cam.y * .45);
      y = ((y % (CV.H + 40)) + CV.H + 40) % (CV.H + 40) - 20;
      ctx.globalAlpha = .10 + (i % 4) * .05;
      ctx.fillStyle = color;
      ctx.fillRect(x | 0, y | 0, 1, 1);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  };

})(window.CV = window.CV || {});
