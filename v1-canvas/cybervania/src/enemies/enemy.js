/* CYBERVANIA — enemies/enemy.js
   Enemy manager and shared behaviour. Enemies do not hate R-17; they file it as a
   fault and dispatch a repair crew (GAME_DESIGN §1, pillar 2). Positions use
   x = horizontal centre, y = feet, because that is what the art and the AI both want. */
(function (CV) {
  'use strict';

  var U = CV.Util, C = CV.Palette.c, FX = CV.FX, F = CV.Frames;
  var E = CV.Enemies = {};

  E.list = [];
  E.defs = {};        // filled by types.js

  var _body = { x: 0, y: 0, w: 0, h: 0, vx: 0, vy: 0, grounded: false, wallDir: 0 };

  E.clear = function () { E.list.length = 0; };

  E.spawn = function (typeId, x, y, id, objDef) {
    var def = E.defs[typeId];
    if (!def) { console.warn('CYBERVANIA: unknown enemy', typeId); return null; }
    var e = {
      type: typeId, def: def, id: id || (typeId + '@' + (x | 0) + ',' + (y | 0)),
      x: x, y: y, homeX: x, homeY: y,
      w: def.w, h: def.h,
      vx: 0, vy: 0, facing: -1,
      hp: def.hp, maxHp: def.hp,
      grounded: false, wallDir: 0,
      state: 0, timer: 0, t: 0, seed: CV.rng.range(0, 6.283),
      stunned: 0, flash: 0, alive: true, alerted: false, aggro: 0,
      corrupt: 0, corruptT: 0, allied: 0, windup: 0, healing: 0, charging: false,
      shield: def.shield || 0, aim: 0, scanAngle: 0, dead: 0,
      objDef: objDef || null, layer: (objDef && objDef.layer !== undefined) ? objDef.layer : -1
    };
    if (def.init) def.init(e);
    E.list.push(e);
    return e;
  };

  /* --------------------------------------------------------------------------
     Shared movement helper. Enemies use the same swept collision as the player,
     so nothing ever ends up half inside a wall.
     -------------------------------------------------------------------------- */
  E.move = function (e, room, dt, layer, gravity) {
    _body.x = e.x - e.w / 2; _body.y = e.y - e.h;
    _body.w = e.w; _body.h = e.h;
    _body.vx = e.vx; _body.vy = e.vy;
    _body.noNudge = true;
    if (gravity) _body.vy = Math.min(_body.vy + gravity * dt, 620);
    CV.Collision.move(_body, room, dt, layer);
    e.x = _body.x + e.w / 2; e.y = _body.y + e.h;
    e.vx = _body.vx; e.vy = _body.vy;
    e.grounded = _body.grounded;
    e.wallDir = _body.wallDir;
  };

  /* Would this enemy walk off a ledge if it kept going? Used by every ground patrol. */
  E.ledgeAhead = function (e, room, layer) {
    var ax = e.x + e.facing * (e.w / 2 + 4);
    return !room.solidAt(ax, e.y + 6, layer);
  };

  E.wallAhead = function (e, room, layer) {
    return room.solidAt(e.x + e.facing * (e.w / 2 + 3), e.y - e.h / 2, layer);
  };

  E.canSeePlayer = function (e, room, range) {
    var p = CV.Player;
    if (p.dead) return false;
    var px = p.x + p.w / 2, py = p.y + p.h / 2;
    if (U.dist2(e.x, e.y - e.h / 2, px, py) > range * range) return false;
    return room.lineClear(e.x, e.y - e.h / 2, px, py, CV.DataSphere.layer);
  };

  E.facePlayer = function (e) {
    var p = CV.Player;
    e.facing = (p.x + p.w / 2) < e.x ? -1 : 1;
  };

  /* --------------------------------------------------------------------------
     UPDATE
     -------------------------------------------------------------------------- */
  E.update = function (dt, room) {
    var layer = CV.DataSphere.layer;
    var p = CV.Player;

    for (var i = E.list.length - 1; i >= 0; i--) {
      var e = E.list[i];

      if (!e.alive) {
        e.dead += dt;
        if (e.dead > 0.5) E.list.splice(i, 1);
        continue;
      }

      /* Layer-locked enemies (daemons, glitches) exist in one reading of the room. */
      if (e.layer >= 0 && e.layer !== layer) continue;

      e.t += dt;
      e.flash = Math.max(0, e.flash - dt * 6);
      e.stunned = Math.max(0, e.stunned - dt);
      e.allied = Math.max(0, e.allied - dt);

      /* Corruption: Cipher's damage model. Ticks, amplifies, and at 3 stacks turns
         a unit against its own side. */
      if (e.corrupt > 0) {
        e.corruptT -= dt;
        E.damage(e, F.CORRUPT_TICK * e.corrupt * dt, 0, { silent: true, dot: true });
        if (CV.rngFX.chance(dt * 6)) FX.corrupt(e.x, e.y - e.h / 2);
        if (e.corruptT <= 0) { e.corrupt = 0; }
        if (e.corrupt >= F.CORRUPT_TURN && e.allied <= 0) e.allied = 4;
      }

      if (!CV.Game.camera.visible(e.x - e.w, e.y - e.h * 2, e.w * 3, e.h * 3, 140)) {
        /* Off-screen enemies still fall and still cool down, but skip AI. */
        if (e.def.gravity) E.move(e, room, dt, layer, e.def.gravity);
        continue;
      }

      if (e.stunned > 0) {
        e.vx *= 0.9;
        if (e.def.gravity) E.move(e, room, dt, layer, e.def.gravity);
        continue;
      }

      e.def.ai(e, dt, room, layer);

      /* Contact damage — skipped entirely for Cipher, which phases through bodies. */
      if (e.def.contact && !p.dead && p.invuln <= 0 && e.allied <= 0 &&
          !(p.frame.contactImmune)) {
        if (U.rectsOverlap(p.x, p.y, p.w, p.h, e.x - e.w / 2, e.y - e.h, e.w, e.h)) {
          p.hurt(e.def.contact, U.sign(p.x + p.w / 2 - e.x) || 1);
        }
      }
    }
  };

  /* --------------------------------------------------------------------------
     DAMAGE
     -------------------------------------------------------------------------- */
  E.damage = function (e, amount, dir, opts) {
    if (!e.alive) return false;
    opts = opts || {};

    /* Enforcer shields block from the front only — flank it, dash through it,
       or slam it. That is the entire enemy. */
    if (e.shield > 0 && dir !== 0 && !opts.ignoreShield) {
      var fromFront = (dir === -e.facing);
      if (fromFront && !opts.up && !opts.down) {
        FX.sparks(e.x + e.facing * e.w / 2, e.y - e.h / 2, 6, C.chromeLit, 3, 120);
        CV.Audio.sfx('block');
        e.flash = 0.4;
        return false;
      }
    }

    if (e.corrupt > 0) amount *= (1 + F.CORRUPT_AMP);

    e.hp -= amount;
    if (!opts.dot) {
      e.flash = 1;
      e.alerted = true;
      e.aggro = 6;
      if (opts.knockback && !e.def.fixed) {
        var kb = opts.knockback * (e.def.weight ? 1 / e.def.weight : 1);
        e.vx = dir * kb;
        if (!e.def.flying) e.vy = Math.min(e.vy, -kb * 0.35);
      }
      if (opts.stun) e.stunned = Math.max(e.stunned, opts.stun);
      if (opts.corrupt) {
        e.corrupt = Math.min(4, e.corrupt + opts.corrupt);
        e.corruptT = F.CORRUPT_TIME;
      }
      if (opts.convert && e.stunned > 0) e.allied = opts.convert;
      FX.hitBurst(e.x + dir * 4, e.y - e.h / 2, dir, e.def.color);
      CV.Combat.popDamage(e.x, e.y - e.h - 4, amount, amount >= 20);
    }

    if (e.hp <= 0) E.kill(e, dir);
    return true;
  };

  E.kill = function (e, dir) {
    e.alive = false;
    e.dead = 0;
    CV.Engine.addTrauma(0.28);
    CV.Engine.addHitstop(0.06);
    FX.debris(e.x, e.y, 8 + Math.round(e.w / 3), e.def.color);
    FX.sparks(e.x, e.y - e.h / 2, 16, e.def.color, 6.283, 200);

    /* Energy motes. SCAVENGER doubles them; EXTRACT makes them home to you. */
    var motes = Math.max(2, Math.round(e.maxHp / 8));
    if (CV.State.hasAugment('scavenger')) motes *= 2;
    FX.motes(e.x, e.y - e.h / 2, motes, e.def.color);
    if (CV.State.hasModule('extract')) CV.Player.addEnergy(motes * 3);

    CV.Audio.sfx('destroy');
    CV.PostFX.pulse(0.4, 0.15);
    CV.State.setFlag('killed:' + e.id, 1);
    CV.State.kills++;
    CV.emit('enemy:killed', e);
  };

  /* --------------------------------------------------------------------------
     QUERIES used by combat, modules and AI
     -------------------------------------------------------------------------- */

  E.hitBox = function (x, y, w, h, dmg, dir, opts) {
    var n = 0;
    for (var i = 0; i < E.list.length; i++) {
      var e = E.list[i];
      if (!e.alive || e.allied > 0) continue;
      if (e.layer >= 0 && e.layer !== CV.DataSphere.layer) continue;
      if (U.rectsOverlap(x, y, w, h, e.x - e.w / 2, e.y - e.h, e.w, e.h)) {
        if (E.damage(e, dmg, dir, opts)) n++;
      }
    }
    if (CV.Bosses.current && CV.Bosses.hitBox(x, y, w, h, dmg, dir, opts)) n++;
    return n;
  };

  E.hitAt = function (x, y, r, dmg, dir, opts) {
    return E.hitBox(x - r, y - r, r * 2, r * 2, dmg, dir, opts) > 0;
  };

  E.hitRadial = function (cx, cy, radius, dmg, opts) {
    var n = 0, r2 = radius * radius;
    for (var i = 0; i < E.list.length; i++) {
      var e = E.list[i];
      if (!e.alive || e.allied > 0) continue;
      if (e.layer >= 0 && e.layer !== CV.DataSphere.layer) continue;
      if (U.dist2(cx, cy, e.x, e.y - e.h / 2) <= r2) {
        var o = opts || {};
        o.ignoreShield = true;
        if (E.damage(e, dmg, U.sign(e.x - cx) || 1, o)) n++;
      }
    }
    if (CV.Bosses.current) CV.Bosses.hitRadial(cx, cy, radius, dmg, opts);
    return n;
  };

  E.nearest = function (x, y, range) {
    var best = null, bd = range * range;
    for (var i = 0; i < E.list.length; i++) {
      var e = E.list[i];
      if (!e.alive || e.allied > 0) continue;
      if (e.layer >= 0 && e.layer !== CV.DataSphere.layer) continue;
      var d = U.dist2(x, y, e.x, e.y - e.h / 2);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  };

  E.inCone = function (x, y, dx, dy, range, minDot) {
    var best = null, bs = -1;
    for (var i = 0; i < E.list.length; i++) {
      var e = E.list[i];
      if (!e.alive) continue;
      if (e.layer >= 0 && e.layer !== CV.DataSphere.layer) continue;
      var ex = e.x - x, ey = (e.y - e.h / 2) - y;
      var d = Math.sqrt(ex * ex + ey * ey);
      if (d > range || d < 1) continue;
      var dot = (ex / d) * dx + (ey / d) * dy;
      if (dot < minDot) continue;
      var s = dot - d / range;
      if (s > bs) { bs = s; best = e; }
    }
    return best;
  };

  /* Sentinel Eyes call reinforcements — the region's pressure loop. */
  E.alertAll = function (x, y, radius) {
    for (var i = 0; i < E.list.length; i++) {
      var e = E.list[i];
      if (!e.alive) continue;
      if (U.dist2(x, y, e.x, e.y) < radius * radius) { e.alerted = true; e.aggro = 8; }
    }
  };

  /* --------------------------------------------------------------------------
     RENDER
     -------------------------------------------------------------------------- */
  E.render = function (ctx, cam) {
    var layer = CV.DataSphere.layer;
    for (var i = 0; i < E.list.length; i++) {
      var e = E.list[i];
      if (e.layer >= 0 && e.layer !== layer) continue;
      if (!cam.visible(e.x - e.w, e.y - e.h * 2, e.w * 3, e.h * 3)) continue;

      var x = (e.x - cam.rx()) | 0, y = (e.y - cam.ry()) | 0;
      ctx.save();
      ctx.translate(x, y);

      if (!e.alive) {
        /* Death is a 0.5s collapse, not a pop. */
        var k = 1 - e.dead / 0.5;
        ctx.globalAlpha = k;
        ctx.scale(1 + (1 - k) * .4, k);
      }
      if (e.stunned > 0) ctx.translate(Math.round(U.noise1(e.t * 40) * 1.5), 0);

      var art = CV.Sprites.enemyArt[e.def.art];
      if (art) art(ctx, e, { t: e.t + e.seed });

      if (e.flash > 0) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = Math.min(1, e.flash);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-e.w, -e.h - 8, e.w * 2, e.h * 2 + 8);
      }
      ctx.restore();

      if (!e.alive) continue;

      /* Health pip bar only once damaged — no permanent HUD clutter. */
      if (e.hp < e.maxHp && e.def.showBar !== false) {
        var bw = Math.max(10, e.w);
        CV.Gfx.rect(ctx, x - bw / 2, y - e.h - 6, bw, 2, '#0b0f16');
        CV.Gfx.rect(ctx, x - bw / 2, y - e.h - 6, bw * (e.hp / e.maxHp), 2,
                    e.corrupt > 0 ? C.magenta : C.red);
      }
      if (e.stunned > 0) {
        for (var s = 0; s < 3; s++) {
          var a = e.t * 6 + s * 2.09;
          CV.Gfx.rect(ctx, x + Math.cos(a) * 7 - 1, y - e.h - 10 + Math.sin(a) * 3, 2, 2,
                      C.cyanGlow);
        }
      }
      if (e.allied > 0) {
        CV.Gfx.text(ctx, '+', x - 2, y - e.h - 14, C.green, 1);
      }
    }
  };

})(window.CV = window.CV || {});
