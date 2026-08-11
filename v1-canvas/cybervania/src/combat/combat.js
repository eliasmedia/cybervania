/* CYBERVANIA — combat/combat.js
   Hitbox resolution, projectiles and the feel systems that sit on top of damage:
   hitstop, knockback, screen shake, sparks and popups (GAME_DESIGN §6).
   Combat here is positional, not attritional: enemies have low HP and telegraphed,
   punishing attacks. The question is never DPS, it is where you need to be. */
(function (CV) {
  'use strict';

  var U = CV.Util, C = CV.Palette.c, FX = CV.FX, G = CV.Gfx;
  var Cb = CV.Combat = {};

  /* --- projectiles --------------------------------------------------------- */

  var proj = new U.Pool(function () {
    return { x: 0, y: 0, vx: 0, vy: 0, life: 0, dmg: 0, hostile: false, r: 2,
             color: '#fff', kind: 0, homing: 0, target: null, pierce: 0, corrupt: 0 };
  }, function (p) {
    p.homing = 0; p.target = null; p.pierce = 0; p.kind = 0; p.corrupt = 0; p.r = 2;
  }, 160);

  Cb.projectiles = proj;

  Cb.fire = function (x, y, vx, vy, dmg, hostile, opts) {
    var p = proj.spawn();
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.dmg = dmg; p.hostile = hostile;
    p.life = (opts && opts.life) || 1.4;
    p.color = (opts && opts.color) || (hostile ? C.red : C.cyanGlow);
    if (opts) {
      if (opts.r) p.r = opts.r;
      if (opts.kind) p.kind = opts.kind;
      if (opts.homing) p.homing = opts.homing;
      if (opts.pierce) p.pierce = opts.pierce;
      if (opts.corrupt) p.corrupt = opts.corrupt;
    }
    return p;
  };

  Cb.clearProjectiles = function () { proj.clear(); };

  /* Bulwark's Polarity Core reflects hostile shots rather than blocking them. */
  Cb.reflectNear = function (x, y, radius) {
    var n = 0;
    for (var i = 0; i < proj.count; i++) {
      var p = proj.items[i];
      if (!p.hostile) continue;
      if (U.dist2(p.x, p.y, x, y) > radius * radius) continue;
      p.hostile = false;
      p.vx = -p.vx * 1.5; p.vy = -p.vy * 1.5;
      p.color = C.cyanGlow;
      p.dmg = Math.round(p.dmg * 1.6);
      FX.sparks(p.x, p.y, 5, C.cyanGlow, 6.283, 120);
      n++;
    }
    return n;
  };

  Cb.updateProjectiles = function (dt, room, layer) {
    var pl = CV.Player;
    for (var i = proj.count - 1; i >= 0; i--) {
      var p = proj.items[i];
      p.life -= dt;
      if (p.life <= 0) { burst(p); proj.release(i); continue; }

      if (p.homing > 0) {
        var tx, ty;
        if (p.hostile) { tx = pl.x + pl.w / 2; ty = pl.y + pl.h / 2; }
        else {
          var e = CV.Enemies.nearest(p.x, p.y, 120);
          if (e) { tx = e.x; ty = e.y - e.h / 2; }
        }
        if (tx !== undefined) {
          var a = Math.atan2(ty - p.y, tx - p.x);
          var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          p.vx = U.lerp(p.vx, Math.cos(a) * sp, p.homing * dt);
          p.vy = U.lerp(p.vy, Math.sin(a) * sp, p.homing * dt);
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      /* Wisps are hazards, not projectiles: they ignore terrain. */
      if (p.kind !== 2 && room.solidAt(p.x, p.y, layer)) {
        FX.sparks(p.x, p.y, 5, p.color, 6.283, 110);
        proj.release(i); continue;
      }

      if (p.hostile) {
        if (!pl.dead && pl.invuln <= 0 &&
            U.rectsOverlap(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2,
                           pl.x, pl.y, pl.w, pl.h)) {
          pl.hurt(p.dmg, U.sign(p.vx) || 1);
          burst(p);
          proj.release(i); continue;
        }
      } else {
        var hit = CV.Enemies.hitAt(p.x, p.y, p.r + 2, p.dmg, U.sign(p.vx) || 1,
                                   { hitstop: 0.03, knockback: 50, corrupt: p.corrupt });
        if (hit) {
          burst(p);
          if (p.pierce > 0) p.pierce--;
          else { proj.release(i); continue; }
        }
      }
    }
  };

  function burst(p) { FX.sparks(p.x, p.y, 6, p.color, 6.283, 140); }

  Cb.renderProjectiles = function (ctx, cam) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < proj.count; i++) {
      var p = proj.items[i];
      var x = (p.x - cam.rx()) | 0, y = (p.y - cam.ry()) | 0;
      if (x < -8 || x > CV.W + 8 || y < -8 || y > CV.H + 8) continue;
      /* A short motion streak reads far better than a dot at these speeds. */
      var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp > 60) {
        var ux = p.vx / sp, uy = p.vy / sp, len = Math.min(9, sp / 45);
        ctx.fillStyle = CV.Palette.alpha(p.color, .45);
        for (var t = 1; t <= len; t++) ctx.fillRect((x - ux * t * 2) | 0, (y - uy * t * 2) | 0, 1, 1);
      }
      ctx.fillStyle = p.color;
      ctx.fillRect(x - p.r, y - p.r, p.r * 2, p.r * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 1, y - 1, 2, 2);
      G.glow(ctx, x, y, 7 + p.r * 2, p.color, .5);
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  };

  /* --- melee hitboxes ------------------------------------------------------ */

  /* Active player hitboxes for this frame; drawn by the debug overlay. */
  Cb.debugBoxes = [];

  /* Sweep a rectangular hitbox against every enemy. `opts` carries the feel
     parameters so a light jab and a Bulwark slam can share one code path. */
  Cb.playerHitbox = function (x, y, w, h, dmg, dir, opts) {
    opts = opts || {};
    Cb.debugBoxes.push({ x: x, y: y, w: w, h: h });
    var hits = CV.Enemies.hitBox(x, y, w, h, dmg, dir, opts);
    if (hits > 0) {
      CV.Engine.addHitstop(opts.hitstop || 0.05);
      CV.Engine.addTrauma(opts.shake || 0.12);
      CV.PostFX.pulse(0.35, 0);
      CV.Audio.sfx(opts.heavy ? 'hitHeavy' : 'hit');
      /* Bulwark and SIPHON turn landed hits into energy — this is the whole
         reason its regen is allowed to be terrible. */
      var gain = CV.Player.frame.gainOnHit + (CV.State.hasAugment('siphon') ? 6 : 0);
      CV.Player.addEnergy(gain * hits);
    } else if (opts.whiff !== false) {
      CV.Audio.sfx('whiff');
    }
    return hits;
  };

  /* Radial burst — EMP, Seismic Slam, boss shockwaves. */
  Cb.radial = function (cx, cy, radius, dmg, opts) {
    opts = opts || {};
    var hits = CV.Enemies.hitRadial(cx, cy, radius, dmg, opts);
    if (opts.fx !== false) {
      FX.ring(cx, cy, opts.color || C.cyanGlow, radius * 3.4, 22);
      CV.Engine.addTrauma(opts.shake || 0.25);
    }
    return hits;
  };

  /* --- damage numbers ------------------------------------------------------ */
  Cb.popDamage = function (x, y, amount, crit) {
    if (!CV.Settings.damageNumbers) return;
    FX.popup(x, y, String(Math.round(amount)), crit ? C.amber : C.white, crit);
  };

  Cb.reset = function () {
    proj.clear();
    Cb.debugBoxes.length = 0;
  };

})(window.CV = window.CV || {});
