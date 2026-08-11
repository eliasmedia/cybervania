/* CYBERVANIA — render/particles.js
   Pooled particle system. Zero allocation during play (TECHNICAL_DESIGN §2).
   Particles are 1-3px rects, never textures — cheap, and it keeps the pixel look. */
(function (CV) {
  'use strict';

  var C = CV.Palette.c, U = CV.Util, R = CV.rngFX;
  var FX = CV.FX = {};

  function make() {
    return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, col: '#fff',
             grav: 0, drag: 0, add: false, shrink: true, collide: false, spin: 0, kind: 0 };
  }
  function reset(p) {
    p.grav = 0; p.drag = 0; p.add = false; p.shrink = true; p.collide = false;
    p.spin = 0; p.kind = 0; p.size = 1;
  }

  var pool = new U.Pool(make, reset, 900);
  FX.pool = pool;

  FX.clear = function () { pool.clear(); };

  function emit(x, y, vx, vy, life, col, size, opts) {
    var p = pool.spawn();
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = p.max = life; p.col = col; p.size = size;
    if (opts) {
      if (opts.grav !== undefined) p.grav = opts.grav;
      if (opts.drag !== undefined) p.drag = opts.drag;
      if (opts.add) p.add = true;
      if (opts.shrink === false) p.shrink = false;
      if (opts.collide) p.collide = true;
      if (opts.kind) p.kind = opts.kind;
    }
    return p;
  }
  FX.emit = emit;

  /* --- authored effects ---------------------------------------------------- */

  FX.dust = function (x, y, amount, dir) {
    for (var i = 0; i < amount; i++) {
      emit(x + R.range(-4, 4), y, R.range(-26, 26) + (dir || 0) * 18, R.range(-26, -4),
           R.range(.22, .45), i % 3 ? '#6a7484' : '#98a4b4', 1, { grav: 90, drag: 2.4 });
    }
  };

  FX.land = function (x, y, force) {
    var n = Math.min(14, 3 + force * 9);
    for (var i = 0; i < n; i++) {
      var s = R.sign();
      emit(x + R.range(-3, 3), y, s * R.range(30, 30 + force * 90), R.range(-40, -6),
           R.range(.2, .45), '#8d99aa', 1, { grav: 200, drag: 3.4 });
    }
  };

  /* Sparks: hot, additive, gravity-bound. Every impact in the game uses these. */
  FX.sparks = function (x, y, amount, col, spread, speed) {
    col = col || C.cyanGlow; spread = spread === undefined ? 6.283 : spread;
    var base = R.range(0, 6.283);
    for (var i = 0; i < amount; i++) {
      var a = base + R.range(-spread / 2, spread / 2);
      var sp = R.range(40, speed || 190);
      emit(x, y, Math.cos(a) * sp, Math.sin(a) * sp, R.range(.14, .38), col, 1,
           { grav: 300, drag: 2.2, add: true });
    }
  };

  FX.hitBurst = function (x, y, dir, col) {
    col = col || C.white;
    FX.sparks(x, y, 9, col, 2.2, 230);
    for (var i = 0; i < 4; i++) {
      emit(x, y, dir * R.range(60, 200), R.range(-70, 70), R.range(.1, .22), col, 2,
           { add: true, drag: 5 });
    }
  };

  /* Enemy death: the body falls apart into colliding debris. Nothing vanishes. */
  FX.debris = function (x, y, amount, col) {
    for (var i = 0; i < amount; i++) {
      emit(x + R.range(-4, 4), y + R.range(-8, 0), R.range(-90, 90), R.range(-150, -40),
           R.range(.7, 1.5), i % 2 ? col : C.steelDark, R.next() < .3 ? 2 : 1,
           { grav: 420, drag: .4, collide: true, shrink: false });
    }
  };

  /* Energy motes: released on kill, homed by the player in enemy.js. */
  FX.motes = function (x, y, amount, col) {
    for (var i = 0; i < amount; i++) {
      emit(x, y, R.range(-60, 60), R.range(-90, -20), R.range(.5, .9), col || C.cyan, 1,
           { grav: 120, drag: 1.2, add: true, shrink: false });
    }
  };

  FX.trail = function (x, y, col, life, size) {
    emit(x, y, 0, 0, life || .22, col, size || 2, { add: true, drag: 1 });
  };

  /* Dash afterimage — a fading silhouette rect, cheap stand-in for a ghost sprite. */
  FX.afterimage = function (x, y, w, h, col) {
    var p = emit(x, y, 0, 0, .22, col, 1, { add: true, shrink: false });
    p.kind = 1; p.size = w; p.spin = h;
  };

  FX.ring = function (x, y, col, speed, count) {
    for (var i = 0; i < (count || 14); i++) {
      var a = i / (count || 14) * 6.283;
      emit(x, y, Math.cos(a) * (speed || 130), Math.sin(a) * (speed || 130),
           .3, col, 1, { add: true, drag: 3.2 });
    }
  };

  /* Data-layer glyph rain — the visual signature of the Data Sphere. */
  FX.glyph = function (x, y, col) {
    var p = emit(x, y, R.range(-8, 8), R.range(20, 70), R.range(.5, 1.1), col || C.cyan, 1,
                 { add: true, shrink: false });
    p.kind = 2;
  };

  FX.corrupt = function (x, y) {
    for (var i = 0; i < 6; i++) {
      var p = emit(x + R.range(-6, 6), y + R.range(-10, 2), R.range(-20, 20), R.range(-30, 10),
                   R.range(.3, .7), i % 2 ? C.cyan : C.magenta, 1, { add: true });
      p.kind = 2;
    }
  };

  /* --- simulation ---------------------------------------------------------- */

  FX.update = function (dt, room) {
    var items = pool.items;
    for (var i = pool.count - 1; i >= 0; i--) {
      var p = items[i];
      p.life -= dt;
      if (p.life <= 0) { pool.release(i); continue; }

      if (p.drag) {
        var d = 1 - p.drag * dt;
        if (d < 0) d = 0;
        p.vx *= d; p.vy *= d;
      }
      p.vy += p.grav * dt;

      if (p.collide && room) {
        var nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
        if (room.solidAt(nx, p.y)) { p.vx *= -0.35; nx = p.x; }
        if (room.solidAt(p.x, ny)) {
          p.vy *= -0.3; ny = p.y;
          p.vx *= 0.6;
          if (Math.abs(p.vy) < 24) { p.vy = 0; p.grav = 0; p.vx *= .5; }
        }
        p.x = nx; p.y = ny;
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
    }
  };

  FX.render = function (ctx) {
    var items = pool.items, prevAdd = false;
    ctx.save();
    for (var i = 0; i < pool.count; i++) {
      var p = items[i], t = p.life / p.max;
      if (p.add !== prevAdd) {
        ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
        prevAdd = p.add;
      }
      ctx.globalAlpha = p.shrink ? Math.min(1, t * 1.6) : (t > .35 ? 1 : t / .35);
      ctx.fillStyle = p.col;
      if (p.kind === 1) {
        /* afterimage silhouette */
        ctx.globalAlpha *= .35;
        ctx.fillRect((p.x - p.size / 2) | 0, (p.y - p.spin) | 0, p.size | 0, p.spin | 0);
      } else if (p.kind === 2) {
        /* glyph: a 1x3 tick, reads as falling data */
        ctx.fillRect(p.x | 0, p.y | 0, 1, 3);
      } else {
        var s = p.shrink ? Math.max(1, Math.round(p.size * t)) : p.size;
        ctx.fillRect(p.x | 0, p.y | 0, s, s);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  /* --- floating combat text ------------------------------------------------ */
  var popPool = new U.Pool(
    function () { return { x: 0, y: 0, vy: 0, life: 0, max: 1, text: '', col: '#fff', big: 0 }; },
    function (p) { p.big = 0; }, 40);

  FX.popup = function (x, y, text, col, big) {
    var p = popPool.spawn();
    p.x = x; p.y = y; p.vy = -34; p.life = p.max = .75;
    p.text = text; p.col = col || C.white; p.big = big ? 1 : 0;
  };

  FX.updatePopups = function (dt) {
    for (var i = popPool.count - 1; i >= 0; i--) {
      var p = popPool.items[i];
      p.life -= dt;
      if (p.life <= 0) { popPool.release(i); continue; }
      p.y += p.vy * dt;
      p.vy += 52 * dt;
    }
  };

  FX.renderPopups = function (ctx) {
    for (var i = 0; i < popPool.count; i++) {
      var p = popPool.items[i], t = p.life / p.max;
      ctx.globalAlpha = t > .6 ? 1 : t / .6;
      CV.Gfx.textCentered(ctx, p.text, p.x, p.y, p.col, p.big ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  };

  FX.clearPopups = function () { popPool.clear(); };

})(window.CV = window.CV || {});
