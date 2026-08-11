/* CYBERVANIA — enemies/types.js
   The roster (WORLD_DESIGN §6). Every enemy has a gameplay function, not just an HP
   value: one teaches timing, one punishes standing still, one calls reinforcements,
   one removes your modules. They are placed as sentences, never as decoration. */
(function (CV) {
  'use strict';

  var E = CV.Enemies, U = CV.Util, C = CV.Palette.c, FX = CV.FX;

  function def(o) { E.defs[o.id] = o; return o; }

  /* --- CRAWLER — ground patrol. Teaches basic timing. --------------------- */
  def({
    id: 'crawler', art: 'crawler', color: C.amber,
    w: 16, h: 10, hp: 18, contact: 1, gravity: 1500, weight: 1,
    ai: function (e, dt, room, layer) {
      if (e.grounded) {
        e.vx = e.facing * (e.alerted ? 62 : 34);
        if (E.ledgeAhead(e, room, layer) || E.wallAhead(e, room, layer)) {
          e.facing *= -1;
          e.vx = 0;
        }
      }
      /* Lunges when the player is close and in front — the only reason to respect it. */
      if (e.alerted && e.grounded && E.canSeePlayer(e, room, 70)) {
        e.timer -= dt;
        if (e.timer <= 0) {
          e.timer = 1.8;
          E.facePlayer(e);
          e.vx = e.facing * 190;
          e.vy = -180;
          CV.Audio.sfx('enemyLunge');
        }
      }
      if (!e.alerted && E.canSeePlayer(e, room, 110)) e.alerted = true;
      E.move(e, room, dt, layer, 1500);
    }
  });

  /* --- SENTINEL EYE — does no damage. Calls things that do. --------------- */
  def({
    id: 'eye', art: 'eye', color: C.amber,
    w: 12, h: 12, hp: 14, contact: 0, gravity: 0, fixed: true, weight: 3,
    ai: function (e, dt, room, layer) {
      var p = CV.Player;
      var see = E.canSeePlayer(e, room, 150);
      if (see) {
        var a = Math.atan2(p.y + p.h / 2 - (e.y - e.h / 2), p.x + p.w / 2 - e.x);
        e.scanAngle = a;
        e.timer += dt;
        if (!e.alerted && e.timer > 0.7) {
          e.alerted = true;
          e.timer = 0;
          E.alertAll(e.x, e.y, 260);
          CV.Audio.sfx('alarm');
          CV.HUD.toast('FAULT REPORTED');
          CV.PostFX.pulse(0.5, 0.2);
        }
        if (e.alerted) {
          e.timer += dt;
          if (e.timer > 3.2) {
            /* It keeps escalating: reinforcements arrive on a timer until it dies. */
            e.timer = 0;
            var side = CV.rng.sign();
            var sx = e.x + side * 60;
            if (!room.solidAt(sx, e.y - 20, layer)) {
              var ne = E.spawn('drone', sx, e.y - 8);
              if (ne) { ne.alerted = true; FX.ring(sx, e.y - 8, C.red, 130, 12); }
            }
          }
        }
      } else {
        e.scanAngle = Math.sin(e.t * 0.8 + e.seed) * 0.9;
        e.timer = Math.max(0, e.timer - dt * 0.6);
        if (e.timer <= 0) e.alerted = false;
      }
    }
  });

  /* --- SWEEPER — charges in a straight line and cannot stop. -------------- */
  def({
    id: 'sweeper', art: 'sweeper', color: C.red,
    w: 20, h: 14, hp: 26, contact: 2, gravity: 1600, weight: 1.4,
    ai: function (e, dt, room, layer) {
      if (e.state === 0) {
        e.vx = U.approach(e.vx, e.facing * 40, 300 * dt);
        e.charging = false;
        if (E.ledgeAhead(e, room, layer) || E.wallAhead(e, room, layer)) e.facing *= -1;
        if (E.canSeePlayer(e, room, 150)) {
          E.facePlayer(e);
          e.state = 1; e.timer = 0.55;   // visible wind-up: the fight is the telegraph
          CV.Audio.sfx('charge');
        }
      } else if (e.state === 1) {
        e.vx *= 0.85;
        e.timer -= dt;
        e.charging = true;
        if (e.timer <= 0) { e.state = 2; e.timer = 1.6; e.vx = e.facing * 300; }
      } else {
        e.timer -= dt;
        e.charging = true;
        e.vx = e.facing * 300;
        FX.emit(e.x, e.y - 2, -e.facing * 40, -20, .3, C.amberDim, 1, { grav: 90 });
        if (E.wallAhead(e, room, layer)) {
          /* Slamming into a wall stuns it. This is the intended kill window. */
          e.stunned = 1.6; e.state = 0; e.vx = 0;
          CV.Engine.addTrauma(0.35); CV.Audio.sfx('slam');
          FX.dust(e.x + e.facing * 10, e.y, 10, -e.facing);
        }
        if (e.timer <= 0 || E.ledgeAhead(e, room, layer)) { e.state = 0; e.charging = false; }
      }
      E.move(e, room, dt, layer, 1600);
    }
  });

  /* --- ENFORCER — shield + gun. Must be flanked, dashed through, or slammed. */
  def({
    id: 'enforcer', art: 'enforcer', color: C.magenta,
    w: 14, h: 18, hp: 34, contact: 1, gravity: 1500, weight: 1.2, shield: 1,
    ai: function (e, dt, room, layer) {
      var see = E.canSeePlayer(e, room, 190);
      if (see) { e.alerted = true; E.facePlayer(e); }

      if (!e.alerted) {
        e.vx = e.facing * 26;
        if (E.ledgeAhead(e, room, layer) || E.wallAhead(e, room, layer)) e.facing *= -1;
      } else {
        var p = CV.Player, d = Math.abs(p.x + p.w / 2 - e.x);
        /* Keeps its preferred range: shields are only useful at distance. */
        e.vx = U.approach(e.vx, d < 60 ? -e.facing * 55 : (d > 120 ? e.facing * 45 : 0), 500 * dt);
        e.timer -= dt;
        if (e.timer <= 0 && see) {
          e.state = 1; e.windup = U.clamp(e.windup + dt * 3, 0, 1);
          if (e.windup >= 1) {
            e.windup = 0; e.timer = 1.5; e.state = 0;
            var py = p.y + p.h / 2 - (e.y - e.h + 8);
            CV.Combat.fire(e.x + e.facing * 8, e.y - e.h + 8,
                           e.facing * 250, U.clamp(py * 1.2, -90, 90), 2, true,
                           { color: C.red, life: 1.6 });
            CV.Audio.sfx('enemyShoot');
          }
        }
        if (E.ledgeAhead(e, room, layer)) e.vx = 0;
      }
      E.move(e, room, dt, layer, 1500);
    }
  });

  /* --- DRONE — weak flier. Rewards AoE, punishes single-target focus. ----- */
  def({
    id: 'drone', art: 'drone', color: C.red,
    w: 12, h: 10, hp: 10, contact: 1, gravity: 0, flying: true, weight: .7,
    ai: function (e, dt, room, layer) {
      var p = CV.Player;
      var see = E.canSeePlayer(e, room, 200);
      if (see) e.alerted = true;
      if (e.alerted && !p.dead) {
        var tx = p.x + p.w / 2, ty = p.y + p.h / 2 - 26;
        var a = Math.atan2(ty - e.y, tx - e.x);
        e.vx = U.damp(e.vx, Math.cos(a) * 92, 3, dt);
        e.vy = U.damp(e.vy, Math.sin(a) * 92, 3, dt);
        e.timer -= dt;
        if (e.timer <= 0 && Math.abs(ty - e.y) < 40) {
          e.timer = 2.2;
          e.vy = 320;                    // dive-bomb
          CV.Audio.sfx('enemyLunge');
        }
      } else {
        e.vx = Math.cos(e.t * .9 + e.seed) * 40;
        e.vy = Math.sin(e.t * 1.4 + e.seed) * 26;
      }
      E.move(e, room, dt, layer, 0);
      if (e.wallDir) e.vx *= -1;
    }
  });

  /* --- RELAY WASP — erratic sine flier that shoots. Air-control test. ----- */
  def({
    id: 'wasp', art: 'wasp', color: C.green,
    w: 12, h: 10, hp: 14, contact: 1, gravity: 0, flying: true, weight: .6,
    ai: function (e, dt, room, layer) {
      var p = CV.Player;
      E.facePlayer(e);
      var see = E.canSeePlayer(e, room, 220);
      if (see) e.alerted = true;
      var baseX = e.alerted ? (p.x + p.w / 2 - e.facing * 70) : e.homeX;
      e.vx = U.damp(e.vx, (baseX - e.x) * 1.6, 3, dt);
      e.vy = Math.sin(e.t * 3.2 + e.seed) * 78 + (e.alerted ? (p.y - e.y) * 0.7 : 0);
      if (e.alerted) {
        e.timer -= dt;
        if (e.timer <= 0 && see) {
          e.timer = 1.7;
          var a = Math.atan2(p.y + p.h / 2 - e.y, p.x + p.w / 2 - e.x);
          CV.Combat.fire(e.x, e.y - e.h / 2, Math.cos(a) * 190, Math.sin(a) * 190,
                         2, true, { color: C.green, life: 2 });
          CV.Audio.sfx('enemyShoot');
        }
      }
      E.move(e, room, dt, layer, 0);
    }
  });

  /* --- SPLICER — teleports along cables. Must be fought positionally. ----- */
  def({
    id: 'splicer', art: 'daemon', color: C.green,
    w: 14, h: 16, hp: 24, contact: 2, gravity: 0, flying: true, weight: 1,
    ai: function (e, dt, room, layer) {
      var p = CV.Player;
      e.timer -= dt;
      if (e.timer <= 0) {
        e.timer = 2.4;
        /* Blink to a clear spot flanking the player. */
        for (var tries = 0; tries < 8; tries++) {
          var ang = CV.rng.range(0, 6.283), r = CV.rng.range(40, 90);
          var nx = p.x + p.w / 2 + Math.cos(ang) * r;
          var ny = p.y + p.h / 2 + Math.sin(ang) * r;
          if (!CV.Collision.solidBox(room, nx - e.w / 2, ny - e.h, e.w, e.h, layer)) {
            FX.ring(e.x, e.y - e.h / 2, C.green, 120, 12);
            e.x = nx; e.y = ny + e.h / 2;
            FX.ring(e.x, e.y - e.h / 2, C.green, 120, 12);
            CV.Audio.sfx('blink');
            break;
          }
        }
      }
      e.vx *= 0.9; e.vy *= 0.9;
      E.move(e, room, dt, layer, 0);
    }
  });

  /* --- ASSEMBLER — repairs other units. Kill order matters. --------------- */
  def({
    id: 'assembler', art: 'support', color: C.cyan,
    w: 12, h: 16, hp: 20, contact: 0, gravity: 1500, weight: 1,
    ai: function (e, dt, room, layer) {
      var target = null, bd = 1e9;
      for (var i = 0; i < E.list.length; i++) {
        var o = E.list[i];
        if (o === e || !o.alive || o.hp >= o.maxHp) continue;
        var d = U.dist2(e.x, e.y, o.x, o.y);
        if (d < 110 * 110 && d < bd) { bd = d; target = o; }
      }
      e.healing = 0;
      if (target) {
        e.healing = 1;
        target.hp = Math.min(target.maxHp, target.hp + 9 * dt);
        e.vx = U.approach(e.vx, U.sign(target.x - e.x) * 40, 400 * dt);
        if (CV.rngFX.chance(dt * 8)) {
          FX.emit(e.x, e.y - e.h / 2, (target.x - e.x) * .8, (target.y - e.y) * .8,
                  .4, C.green, 1, { add: true });
        }
      } else {
        /* No patient: it retreats from the player. Killing it is a choice. */
        var p = CV.Player;
        e.vx = U.approach(e.vx, U.sign(e.x - (p.x + p.w / 2)) * 55, 400 * dt);
        if (E.ledgeAhead(e, room, layer)) e.vx = 0;
      }
      e.facing = U.sign(e.vx) || e.facing;
      E.move(e, room, dt, layer, 1500);
    }
  });

  /* --- WELDER — area denial. Paints the floor with a burning line. -------- */
  def({
    id: 'welder', art: 'crawler', color: '#ff6a2b',
    w: 16, h: 12, hp: 22, contact: 1, gravity: 1500, weight: 1.1,
    ai: function (e, dt, room, layer) {
      var see = E.canSeePlayer(e, room, 150);
      if (see) { e.alerted = true; E.facePlayer(e); }
      if (e.state === 0) {
        e.vx = e.facing * (e.alerted ? 50 : 28);
        if (E.ledgeAhead(e, room, layer) || E.wallAhead(e, room, layer)) e.facing *= -1;
        if (e.alerted && see) { e.timer -= dt; if (e.timer <= 0) { e.state = 1; e.timer = 1.1; } }
      } else {
        e.vx *= 0.8;
        e.timer -= dt;
        /* A slow horizontal beam sweep — you go over it or behind it. */
        if (CV.rngFX.chance(dt * 24)) {
          var dx = e.facing * CV.rng.range(10, 70);
          CV.Combat.fire(e.x + dx, e.y - 4, 0, 40, 2, true,
                         { color: '#ff6a2b', life: .5, kind: 2, r: 3 });
        }
        if (e.timer <= 0) { e.state = 0; e.timer = 2.4; }
      }
      E.move(e, room, dt, layer, 1500);
    }
  });

  /* --- HAULER — slow, huge HP, shoves you into hazards. ------------------- */
  def({
    id: 'hauler', art: 'heavy', color: C.amber,
    w: 26, h: 20, hp: 70, contact: 2, gravity: 1700, weight: 3,
    ai: function (e, dt, room, layer) {
      var see = E.canSeePlayer(e, room, 190);
      if (see) { e.alerted = true; E.facePlayer(e); }
      e.vx = U.approach(e.vx, e.facing * (e.alerted ? 62 : 30), 260 * dt);
      if (E.ledgeAhead(e, room, layer) || E.wallAhead(e, room, layer)) {
        e.facing *= -1; e.vx = 0;
      }
      /* Its shove is a knockback attack, not a damage attack: it kills by geometry. */
      var p = CV.Player;
      if (e.alerted && Math.abs(p.x + p.w / 2 - e.x) < e.w / 2 + 10 &&
          Math.abs(p.y + p.h - e.y) < e.h) {
        e.timer -= dt;
        if (e.timer <= 0) {
          e.timer = 1.4;
          p.vx = e.facing * 420; p.vy = -160;
          CV.Engine.addTrauma(0.3);
          CV.Audio.sfx('slam');
        }
      }
      E.move(e, room, dt, layer, 1700);
    }
  });

  /* --- SENTRY TURRET — fixed, tracking, telegraphed. Cover-based. --------- */
  def({
    id: 'turret', art: 'turret', color: C.red,
    w: 16, h: 14, hp: 30, contact: 0, gravity: 0, fixed: true, weight: 4,
    ai: function (e, dt, room, layer) {
      var p = CV.Player;
      var see = E.canSeePlayer(e, room, 230);
      var tx = p.x + p.w / 2, ty = p.y + p.h / 2;
      if (see) {
        e.alerted = true;
        var want = Math.atan2(ty - (e.y - e.h + 3), tx - e.x);
        e.aim = U.damp(e.aim, want, 6, dt);
        e.windup = U.clamp(e.windup + dt * 0.8, 0, 1);
        if (e.windup >= 1) {
          e.windup = 0;
          /* Fires a fast piercing bolt: you must be behind cover, not just moving. */
          CV.Combat.fire(e.x + Math.cos(e.aim) * 12, e.y - e.h + 3 + Math.sin(e.aim) * 12,
                         Math.cos(e.aim) * 420, Math.sin(e.aim) * 420, 3, true,
                         { color: C.red, life: 1.4, r: 2 });
          CV.Audio.sfx('turret');
          CV.Engine.addTrauma(0.1);
        }
      } else {
        e.windup = Math.max(0, e.windup - dt);
        e.aim = U.damp(e.aim, Math.sin(e.t * .7) * .5, 2, dt);
      }
    }
  });

  /* --- DAEMON — only exists in the data layer, and follows you between them. */
  def({
    id: 'daemon', art: 'daemon', color: C.cyan,
    w: 16, h: 16, hp: 22, contact: 2, gravity: 0, flying: true, weight: .8,
    ai: function (e, dt, room, layer) {
      var p = CV.Player;
      var a = Math.atan2(p.y + p.h / 2 - (e.y - e.h / 2), p.x + p.w / 2 - e.x);
      var speed = 78 + Math.sin(e.t * 2 + e.seed) * 30;
      e.vx = U.damp(e.vx, Math.cos(a) * speed, 2.2, dt);
      e.vy = U.damp(e.vy, Math.sin(a) * speed, 2.2, dt);
      if (CV.rngFX.chance(dt * 5)) FX.glyph(e.x + CV.rng.range(-8, 8), e.y - e.h, C.cyan);
      E.move(e, room, dt, layer, 0);
    }
  });

  /* --- NULLIFIER — suppresses your modules. Forces raw movement. ---------- */
  def({
    id: 'nullifier', art: 'support', color: C.violet,
    w: 14, h: 18, hp: 40, contact: 1, gravity: 1500, weight: 1.6,
    ai: function (e, dt, room, layer) {
      var p = CV.Player;
      var d = U.dist(e.x, e.y - e.h / 2, p.x + p.w / 2, p.y + p.h / 2);
      e.healing = 0;
      if (d < 110) {
        /* The suppression field is the enemy. Everything you rely on turns off. */
        CV.State.suppress = 0.2;
        if (CV.rngFX.chance(dt * 10)) {
          FX.emit(e.x + CV.rng.range(-30, 30), e.y - CV.rng.range(0, 30),
                  0, -20, .5, C.violet, 1, { add: true });
        }
      }
      e.vx = U.approach(e.vx, U.sign((p.x + p.w / 2) - e.x) * 42, 300 * dt);
      if (E.ledgeAhead(e, room, layer) || E.wallAhead(e, room, layer)) e.vx = 0;
      e.facing = U.sign(e.vx) || e.facing;
      E.move(e, room, dt, layer, 1500);
    }
  });

  /* --- FURNACE UNIT — melee that leaves a persistent heat field. ---------- */
  def({
    id: 'furnace', art: 'furnace', color: '#ff8a2b',
    w: 18, h: 18, hp: 48, contact: 2, gravity: 1600, weight: 1.8,
    ai: function (e, dt, room, layer) {
      var see = E.canSeePlayer(e, room, 170);
      if (see) { e.alerted = true; E.facePlayer(e); }
      e.vx = U.approach(e.vx, e.facing * (e.alerted ? 74 : 28), 400 * dt);
      if (E.ledgeAhead(e, room, layer) || E.wallAhead(e, room, layer)) {
        e.facing *= -1; e.vx = 0;
      }
      e.timer -= dt;
      if (e.alerted && e.timer <= 0) {
        e.timer = 2.6;
        for (var i = 0; i < 5; i++) {
          var a = -2.6 + i * 0.55;
          CV.Combat.fire(e.x, e.y - e.h / 2, Math.cos(a) * 130, Math.sin(a) * 130,
                         2, true, { color: '#ff8a2b', life: 1.1 });
        }
        CV.Audio.sfx('enemyShoot');
      }
      E.move(e, room, dt, layer, 1600);
    }
  });

  /* --- PLASMA WISP — indestructible moving hazard, not an enemy. ---------- */
  def({
    id: 'wisp', art: 'glitch', color: '#7dff9d',
    w: 10, h: 10, hp: 99999, contact: 3, gravity: 0, flying: true, weight: 10,
    showBar: false,
    ai: function (e, dt, room, layer) {
      var p = CV.Player;
      var a = Math.atan2(p.y + p.h / 2 - e.y, p.x + p.w / 2 - e.x);
      e.vx = U.damp(e.vx, Math.cos(a) * 46, 1.1, dt);
      e.vy = U.damp(e.vy, Math.sin(a) * 46, 1.1, dt);
      e.x += e.vx * dt; e.y += e.vy * dt;       // passes through terrain: it is a hazard
      if (CV.rngFX.chance(dt * 14)) FX.trail(e.x, e.y - 4, '#7dff9d', .4, 1);
    }
  });

  /* --- GLITCH — data corruption made hostile. Splits when killed wrong. --- */
  def({
    id: 'glitch', art: 'glitch', color: C.magenta,
    w: 14, h: 14, hp: 16, contact: 2, gravity: 0, flying: true, weight: .6,
    ai: function (e, dt, room, layer) {
      var p = CV.Player;
      e.timer -= dt;
      if (e.timer <= 0) {
        e.timer = CV.rng.range(0.5, 1.1);
        var a = Math.atan2(p.y + p.h / 2 - e.y, p.x + p.w / 2 - e.x) + CV.rng.range(-1, 1);
        e.vx = Math.cos(a) * 190; e.vy = Math.sin(a) * 190;
      }
      e.vx *= (1 - dt * 1.4); e.vy *= (1 - dt * 1.4);
      if (CV.rngFX.chance(dt * 8)) FX.glyph(e.x, e.y - 10, C.magenta);
      E.move(e, room, dt, layer, 0);
      if (e.wallDir) e.vx *= -1;
    },
    /* Splits unless the killing blow was corruption — CIPHER is the clean answer. */
    onKill: function (e) {
      if (e.corrupt > 0 || e.generation >= 1) return;
      for (var i = 0; i < 2; i++) {
        var c = E.spawn('glitch', e.x + (i ? 10 : -10), e.y, e.id + ':s' + i);
        if (c) { c.hp = c.maxHp = 8; c.w = 10; c.h = 10; c.generation = 1; }
      }
    }
  });

  /* Route the split behaviour through the manager's kill hook. */
  CV.on('enemy:killed', function (e) {
    if (e.def.onKill) e.def.onKill(e);
  });

})(window.CV = window.CV || {});
