/* CYBERVANIA — proto/enemies.js
   Enemies as 3D actors. The AI is ported from the v1 build (same behaviours, same
   design intent); only the body and the collision query are new.

   Design note carried over from v1: enemies are not HP sponges. The Crawler teaches
   timing, the Sentinel Eye does no damage at all — it reports you, which is what makes
   ATLAS feel like a system rather than a monster. */
(function (P) {
  'use strict';

  var E = P.Enemies = {};
  var K = P.Kit;

  E.list = [];
  var scene = null, M = null;

  E.init = function (sc, mats) { scene = sc; M = mats; };

  E.clear = function () {
    for (var i = 0; i < E.list.length; i++) {
      if (E.list[i].group.parent) scene.remove(E.list[i].group);
    }
    E.list.length = 0;
  };

  /* Remove enemies belonging to a chunk that is being disposed. */
  E.dropOutside = function (minX, maxX, minY, maxY) {
    for (var i = E.list.length - 1; i >= 0; i--) {
      var e = E.list[i];
      if (e.x < minX || e.x > maxX || e.y < minY || e.y > maxY) {
        if (P.Lights && e.glow && e.glow.obj) P.Lights.drop(e.glow);
        scene.remove(e.group);
        E.list.splice(i, 1);
      }
    }
  };

  /* --- shared physics ------------------------------------------------------- */
  function solidAt(x, y, w, h) {
    var c = P.World.colliders;
    var l = x - w / 2, r = x + w / 2, b = y, t = y + h;
    for (var i = 0; i < c.length; i++) {
      var o = c[i];
      if (l < o.x + o.w && r > o.x && b < o.y + o.h && t > o.y) return o;
    }
    return null;
  }

  function moveBody(e, dt, gravity) {
    if (gravity) e.vy = Math.max(e.vy - gravity * dt, -34);
    var nx = e.x + e.vx * dt;
    if (!solidAt(nx, e.y, e.w, e.h)) e.x = nx; else { e.vx = 0; e.turn = true; }
    var ny = e.y + e.vy * dt;
    var hit = solidAt(e.x, ny, e.w, e.h);
    if (hit) {
      if (e.vy < 0) { e.y = hit.y + hit.h; e.grounded = true; }
      else e.y = hit.y - e.h;
      e.vy = 0;
    } else { e.y = ny; e.grounded = false; }
  }

  /* Is there floor just ahead? Ground patrols turn at ledges rather than walking off. */
  function ledgeAhead(e) {
    return !solidAt(e.x + e.facing * (e.w / 2 + 0.6), e.y - 0.4, 0.2, 0.3);
  }

  /* --- types ----------------------------------------------------------------- */
  var TYPES = {};

  /* CRAWLER — low four-legged patrol. Teaches basic timing. */
  TYPES.crawler = {
    w: 1.6, h: 1.0, hp: 20, contact: 1, gravity: 52, speed: 2.4,
    build: function (e) {
      var g = new THREE.Group();
      var body = new THREE.Mesh(K.box(1.6, 0.8, 1.2), M.metal);
      body.position.y = 0.7; body.castShadow = true;
      g.add(body);
      var shell = new THREE.Mesh(K.box(1.2, 0.5, 1.0), M.metalDark);
      shell.position.y = 1.15;
      g.add(shell);
      e.optic = new THREE.Mesh(K.box(0.5, 0.5, 0.5), K.mat('crawlerEye', function () {
        return new THREE.MeshBasicMaterial({ color: 0xffb23d, toneMapped: false });
      }));
      e.optic.scale.set(0.6, 0.3, 0.2);
      e.optic.position.set(0.75, 0.75, 0.5);
      g.add(e.optic);
      e.legs = [];
      for (var i = 0; i < 4; i++) {
        var l = new THREE.Mesh(K.box(0.5, 0.5, 0.5), M.metalDark);
        l.scale.set(0.24, 1.2, 0.24);
        l.position.set(-0.6 + i * 0.4, 0.3, i % 2 ? 0.35 : -0.35);
        g.add(l); e.legs.push(l);
      }
      var ga = new THREE.Object3D(); ga.position.set(0.6, 0.8, 0.8); g.add(ga);
      e.glow = P.Lights ? P.Lights.attach(ga, 0xffb23d, 0.8, 6) : { color: new THREE.Color(), intensity: 0 };
      return g;
    },
    ai: function (e, dt) {
      var p = P.Player;
      var dist = Math.abs(p.x - e.x);
      if (!e.alerted && dist < 11 && Math.abs(p.y - e.y) < 5) e.alerted = true;

      if (e.grounded) {
        e.vx = e.facing * (e.alerted ? 4.2 : 2.0);
        if (e.turn || ledgeAhead(e)) { e.facing *= -1; e.vx = 0; e.turn = false; }
      }
      /* Lunge: the only reason to respect it. Telegraphed by stopping first. */
      e.timer -= dt;
      if (e.alerted && e.grounded && dist < 6 && e.timer <= 0) {
        e.timer = 2.4;
        e.facing = p.x < e.x ? -1 : 1;
        e.vx = e.facing * 9;
        e.vy = 8;
      }
      e.walk += dt * Math.abs(e.vx) * 2.2;
      for (var i = 0; i < e.legs.length; i++) {
        e.legs[i].position.y = 0.3 + Math.abs(Math.sin(e.walk + i * 1.6)) * 0.18;
      }
      if (e.optic) e.optic.material.color.setHex(e.alerted ? 0xff4459 : 0xffb23d);
      if (e.glow) e.glow.color.setHex(e.alerted ? 0xff4459 : 0xffb23d);
    }
  };

  /* SENTINEL EYE — does no damage. It reports you, and that is worse. */
  TYPES.eye = {
    w: 1.2, h: 1.2, hp: 14, contact: 0, gravity: 0, fixed: true,
    build: function (e) {
      var g = new THREE.Group();
      var mount = new THREE.Mesh(K.box(0.5, 1.5, 0.5), M.metalDark);
      mount.position.y = 1.6;
      g.add(mount);
      var ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), M.metal);
      ball.position.y = 0.7; ball.castShadow = true;
      g.add(ball);
      e.head = new THREE.Group();
      e.head.position.y = 0.7;
      g.add(e.head);
      e.optic = new THREE.Mesh(K.box(0.5, 0.5, 0.5), K.mat('eyeOptic', function () {
        return new THREE.MeshBasicMaterial({ color: 0xffb23d, toneMapped: false });
      }));
      e.optic.scale.set(0.4, 0.4, 0.3);
      e.optic.position.set(0, 0, 0.55);
      e.head.add(e.optic);
      var ea = new THREE.Object3D(); ea.position.set(0, 0.8, 1); g.add(ea);
      e.glow = P.Lights ? P.Lights.attach(ea, 0xffb23d, 1.4, 9) : { color: new THREE.Color(), intensity: 0 };
      return g;
    },
    ai: function (e, dt) {
      var p = P.Player;
      var dx = p.x - e.x, dy = (p.y + 1) - (e.y + 0.7);
      var dist = Math.sqrt(dx * dx + dy * dy);
      var sees = dist < 13;

      if (sees) {
        e.head.rotation.y = Math.atan2(dx, 3) * 0.6;
        e.head.rotation.x = -Math.atan2(dy, Math.abs(dx) + 3) * 0.5;
        e.scan += dt;
        /* A deliberate pause before it reports — long enough that a player who
           reacts can break line of sight. */
        if (!e.reported && e.scan > 1.1) {
          e.reported = true;
          e.alerted = true;
          if (P.Game) P.Game.onSentinelReport(e);
        }
      } else {
        e.scan = Math.max(0, e.scan - dt * 0.7);
        e.head.rotation.y = Math.sin(e.t * 0.7) * 0.5;
        e.head.rotation.x = 0;
      }
      var warm = e.reported ? 0xff4459 : (e.scan > 0.3 ? 0xffd070 : 0xffb23d);
      e.optic.material.color.setHex(warm);
      e.glow.color.setHex(warm);
      e.glow.intensity = e.reported ? 2.4 + Math.sin(e.t * 14) : 1.4;
    }
  };

  E.types = TYPES;

  /* --- lifecycle --------------------------------------------------------------- */
  E.spawn = function (type, x, y, opts) {
    var def = TYPES[type];
    if (!def || !scene) return null;
    var e = {
      type: type, def: def, x: x, y: y, vx: 0, vy: 0,
      w: def.w, h: def.h, hp: def.hp, maxHp: def.hp,
      facing: (opts && opts.facing) || -1,
      grounded: false, alerted: false, turn: false,
      timer: 0, t: 0, walk: 0, scan: 0, reported: false,
      flash: 0, dead: false, deadT: 0, hurtCd: 0, recoil: 0, recoilDir: 1
    };
    e.group = def.build(e);
    e.group.position.set(x, y, 0);
    scene.add(e.group);
    E.list.push(e);
    return e;
  };

  E.hurt = function (e, dmg, dir, opts) {
    if (e.dead || e.hurtCd > 0) return false;
    opts = opts || {};
    e.hp -= dmg;
    e.flash = 1;
    e.hurtCd = 0.12;
    e.alerted = true;
    /* Knockback is what makes a hit feel like it landed. Light enemies fly, fixed
       ones only recoil in place. */
    var kb = opts.knockback === undefined ? 10 : opts.knockback;
    e.recoil = 1;
    e.recoilDir = dir;
    if (!e.def.fixed) {
      e.vx = dir * kb;
      e.vy = Math.max(e.vy, opts.up === undefined ? 3 : opts.up);
    }
    if (P.FX) P.FX.sparks(e.x + dir * 0.3, e.y + e.h * 0.6, dir, e.hp <= 0 ? 16 : 9);
    if (e.hp <= 0) {
      e.dead = true; e.deadT = 0;
      if (P.Game) P.Game.onKill(e);
    }
    return true;
  };

  E.update = function (dt) {
    var p = P.Player;
    for (var i = E.list.length - 1; i >= 0; i--) {
      var e = E.list[i];
      e.t += dt;
      e.hurtCd = Math.max(0, e.hurtCd - dt);
      e.flash = Math.max(0, e.flash - dt * 5);

      if (e.dead) {
        e.deadT += dt;
        e.group.rotation.z += dt * 3;
        e.group.position.y -= dt * 2;
        e.group.scale.setScalar(Math.max(0.01, 1 - e.deadT * 1.6));
        if (e.deadT === dt && P.FX) P.FX.burst(e.x, e.y + e.h * 0.5, 22);
        if (e.deadT > 0.7) {
          if (P.Lights && e.glow && e.glow.obj) P.Lights.drop(e.glow);
          scene.remove(e.group); E.list.splice(i, 1);
        }
        continue;
      }

      /* A hit enemy stops thinking for a moment: it is being knocked about, not
         patrolling. Without this the knockback is immediately fought by the AI. */
      if (e.recoil > 0) e.recoil = Math.max(0, e.recoil - dt * 3.5);
      if (e.recoil < 0.55) e.def.ai(e, dt);
      if (!e.def.fixed) moveBody(e, dt, e.def.gravity);
      e.group.position.set(e.x, e.y, 0);
      if (!e.def.fixed) e.group.rotation.y = e.facing > 0 ? 0 : Math.PI;

      /* Recoil pose: squashed along the hit direction and tipped back. */
      var rc = e.recoil;
      e.group.scale.set(1 + rc * 0.25, 1 - rc * 0.22, 1 + rc * 0.15);
      e.group.rotation.z = -e.recoilDir * rc * 0.35 * (e.facing > 0 ? 1 : -1);
      if (e.optic && e.flash > 0) {
        e.optic.material.color.setRGB(1, 1 - e.flash * 0.6, 1 - e.flash * 0.6);
      }

      /* Contact damage. */
      if (e.def.contact && !p.dead) {
        if (Math.abs(p.x - e.x) < (e.w / 2 + 0.5) &&
            p.y < e.y + e.h && p.y + 3 > e.y) {
          if (P.Game) P.Game.hurtPlayer(e.def.contact, p.x < e.x ? -1 : 1);
        }
      }
    }
  };

  /* Melee query used by the player's attack. */
  E.hitBox = function (x, y, w, h, dmg, dir, opts) {
    var n = 0;
    for (var i = 0; i < E.list.length; i++) {
      var e = E.list[i];
      if (e.dead) continue;
      if (x < e.x + e.w / 2 && x + w > e.x - e.w / 2 &&
          y < e.y + e.h && y + h > e.y) {
        if (E.hurt(e, dmg, dir, opts)) n++;
      }
    }
    return n;
  };

  E.count = function () { return E.list.length; };

})(window.PROTO = window.PROTO || {});
