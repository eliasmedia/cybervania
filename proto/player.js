/* CYBERVANIA 3D PROTOTYPE — proto/player.js
   R-17 as actual geometry, and an AABB character controller running against the
   streamed chunk colliders.

   Movement is deliberately re-tuned away from the 2D build: slower top speed, more
   air time, longer coyote window, no instant-death precision. The intent is Hollow
   Knight's weight and deliberation rather than Meat Boy's twitch. */
(function (P) {
  'use strict';

  var PL = P.Player = {};

  /* Tuning, in world units (1 unit ~ 1 old tile). */
  var RUN = 9.5, ACCEL = 62, FRICTION = 70, AIR_ACCEL = 40;
  var GRAV = 52, FALL_MAX = 34, JUMP_V = 17.2, JUMP_CUT = 0.45;
  var COYOTE = 0.13, BUFFER = 0.15;
  var DASH_V = 26, DASH_T = 0.17, DASH_CD = 0.42;
  var HW = 0.42, HH = 1.5;             // half-width, half-height of the hurtbox

  PL.x = 0; PL.y = 0; PL.vx = 0; PL.vy = 0;
  PL.grounded = false; PL.facing = 1;
  PL.coyote = 0; PL.jumpBuf = 0; PL.dashBuf = 0;
  PL.dashT = 0; PL.dashCd = 0; PL.dashDir = 1; PL.jumps = 0;
  PL.walk = 0; PL.squash = 0;
  PL.atkState = 0;      // 0 idle, 1 windup, 2 active, 3 recover
  PL.atkTimer = 0; PL.atkIndex = 0; PL.comboTimer = 0; PL.atkSwing = 0;

  var group, torso, head, optic, legL, legR, thruster, glowLight;

  PL.build = function (scene, M) {
    group = new THREE.Group();

    var body = new THREE.MeshStandardMaterial({ color: 0x8fa4bd, roughness: 0.45, metalness: 0.75 });
    var dark = new THREE.MeshStandardMaterial({ color: 0x2b3340, roughness: 0.6, metalness: 0.7 });
    var glow = new THREE.MeshBasicMaterial({ color: 0x4de3ff, toneMapped: false });

    torso = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.86, 0.6), body);
    torso.position.y = 1.02;
    torso.castShadow = true;
    group.add(torso);

    head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.44, 0.55), body);
    head.position.y = 1.66;
    head.castShadow = true;
    group.add(head);

    /* The optic is the read: it is the brightest thing on the character and the only
       cyan in the physical world, so the eye finds the player instantly. */
    optic = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), glow);
    optic.position.set(0.16, 1.68, 0.29);
    group.add(optic);

    glowLight = new THREE.PointLight(0x4de3ff, 1.5, 7, 2);
    glowLight.position.set(0, 1.3, 0.6);
    group.add(glowLight);

    // backpack / heat sink
    var pack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.6, 0.3), dark);
    pack.position.set(-0.44, 1.05, 0);
    group.add(pack);

    legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.62, 0.26), dark);
    legL.position.set(-0.19, 0.32, 0);
    legL.castShadow = true;
    group.add(legL);
    legR = legL.clone();
    legR.position.x = 0.19;
    group.add(legR);

    // arm + service blade. The blade is what the player reads during an attack,
    // so it is the brightest thing on the body after the optic.
    PL.arm = new THREE.Group();
    PL.arm.position.set(0.34, 1.12, 0.12);
    var arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.16), dark);
    arm.position.x = 0.25;
    PL.arm.add(arm);
    PL.blade = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xa8f4ff, toneMapped: false }));
    PL.blade.position.x = 1.0;
    PL.blade.visible = false;
    PL.arm.add(PL.blade);
    group.add(PL.arm);

    thruster = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x4de3ff, transparent: true, opacity: 0, toneMapped: false }));
    thruster.position.set(0, 0.06, 0);
    group.add(thruster);

    scene.add(group);
    PL.group = group;
    void M;
  };

  /* Three-hit blade combo. Short reach, fast recovery, a small forward step on the
     third hit — the commitment is what makes positioning matter. */
  var COMBO = [
    { windup: 0.05, active: 0.10, recover: 0.14, dmg: 7,  reach: 2.0, step: 0 },
    { windup: 0.05, active: 0.10, recover: 0.14, dmg: 7,  reach: 2.0, step: 0 },
    { windup: 0.07, active: 0.12, recover: 0.22, dmg: 11, reach: 2.4, step: 3.5 }
  ];

  function updateAttack(dt, input) {
    PL.comboTimer = Math.max(0, PL.comboTimer - dt);

    if (PL.atkState > 0) {
      PL.atkTimer -= dt;
      var a = COMBO[PL.atkIndex];
      if (PL.atkState === 1 && PL.atkTimer <= 0) {
        PL.atkState = 2; PL.atkTimer = a.active;
        if (PL.blade) PL.blade.visible = true;
        var bx = PL.x + PL.facing * 0.5;
        var hits = P.Enemies ? P.Enemies.hitBox(
          PL.facing > 0 ? bx : bx - a.reach, PL.y + 0.3,
          a.reach, 2.4, a.dmg, PL.facing) : 0;
        if (hits > 0) {
          if (a.step) PL.vx += PL.facing * a.step;
          if (P.Game) { P.Game.shake = Math.max(P.Game.shake || 0, 0.25); }
        }
      } else if (PL.atkState === 2 && PL.atkTimer <= 0) {
        PL.atkState = 3; PL.atkTimer = a.recover;
        if (PL.blade) PL.blade.visible = false;
      } else if (PL.atkState === 3 && PL.atkTimer <= 0) {
        PL.atkState = 0;
        PL.comboTimer = 0.4;
      }
      PL.atkSwing = PL.atkState === 2 ? (1 - PL.atkTimer / a.active) : 0;
      return;
    }

    if (!input.attackPressed) return;
    PL.atkIndex = PL.comboTimer > 0 ? (PL.atkIndex + 1) % COMBO.length : 0;
    PL.atkState = 1;
    PL.atkTimer = COMBO[PL.atkIndex].windup;
  }

  /* --- AABB collision against the live chunk colliders ---------------------- */
  function overlaps(x, y) {
    var c = P.World.colliders;
    var l = x - HW, r = x + HW, b = y, t = y + HH * 2;
    for (var i = 0; i < c.length; i++) {
      var o = c[i];
      if (l < o.x + o.w && r > o.x && b < o.y + o.h && t > o.y) return o;
    }
    return null;
  }

  PL.spawn = function (x, y) {
    PL.x = x; PL.y = y; PL.vx = 0; PL.vy = 0;
    // lift out of any geometry we happened to land inside
    var guard = 0;
    while (overlaps(PL.x, PL.y) && guard++ < 200) PL.y += 0.5;
  };

  PL.update = function (dt, input) {
    PL.dashCd = Math.max(0, PL.dashCd - dt);
    PL.jumpBuf = Math.max(0, PL.jumpBuf - dt);
    PL.dashBuf = Math.max(0, PL.dashBuf - dt);
    PL.squash += (0 - PL.squash) * Math.min(1, dt * 9);

    if (input.jumpPressed) PL.jumpBuf = BUFFER;
    if (input.dashPressed) PL.dashBuf = BUFFER;

    var ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    // --- horizontal ---
    if (PL.dashT <= 0) {
      var target = ix * RUN;
      var a = PL.grounded ? (ix !== 0 ? ACCEL : FRICTION) : (ix !== 0 ? AIR_ACCEL : 14);
      if (PL.vx < target) PL.vx = Math.min(PL.vx + a * dt, target);
      else if (PL.vx > target) PL.vx = Math.max(PL.vx - a * dt, target);
      if (ix !== 0) PL.facing = ix;
    }

    // --- jump ---
    if (PL.grounded) { PL.coyote = COYOTE; PL.jumps = 0; }
    else PL.coyote = Math.max(0, PL.coyote - dt);

    if (PL.jumpBuf > 0) {
      var canGround = PL.coyote > 0 && PL.jumps === 0;
      var canAir = !PL.grounded && PL.coyote <= 0 && PL.jumps < 2;
      if (canGround || canAir) {
        PL.jumpBuf = 0; PL.coyote = 0; PL.jumps++;
        PL.vy = JUMP_V * (PL.jumps > 1 ? 0.88 : 1);
        PL.grounded = false;
        PL.squash = -0.28;
      }
    }
    if (input.jumpReleased && PL.vy > 0) PL.vy *= JUMP_CUT;

    // --- dash ---
    if (PL.dashT > 0) {
      PL.dashT -= dt;
      PL.vx = PL.dashDir * DASH_V;
      PL.vy = 0;
      if (PL.dashT <= 0) PL.vx *= 0.5;
    } else if (PL.dashBuf > 0 && PL.dashCd <= 0) {
      PL.dashBuf = 0;
      PL.dashT = DASH_T; PL.dashCd = DASH_CD;
      PL.dashDir = ix !== 0 ? ix : PL.facing;
      PL.facing = PL.dashDir;
    }

    // --- attack ---
    updateAttack(dt, input);

    // --- gravity ---
    if (PL.dashT <= 0) {
      var g = GRAV;
      if (Math.abs(PL.vy) < 3.2) g *= 0.76;      // float at the apex: reads as weightless
      PL.vy = Math.max(PL.vy - g * dt, -FALL_MAX);
    }

    // --- integrate with swept steps ---
    var steps = Math.max(1, Math.ceil(Math.max(Math.abs(PL.vx), Math.abs(PL.vy)) * dt / 0.25));
    var sdx = PL.vx * dt / steps, sdy = PL.vy * dt / steps;
    var wasGrounded = PL.grounded;
    PL.grounded = false;

    for (var s = 0; s < steps; s++) {
      if (sdx !== 0) {
        var nx = PL.x + sdx;
        var hit = overlaps(nx, PL.y);
        if (hit) {
          /* Step up over knee-height lips instead of catching on them. The threshold
             is deliberately generous: getting snagged on a 1-unit ledge is the single
             most common way a 2.5D platformer feels cheap. */
          var stepped = false;
          for (var up = 0.1; up <= 1.05; up += 0.15) {
            if (!overlaps(nx, PL.y + up)) { PL.y += up; PL.x = nx; stepped = true; break; }
          }
          if (!stepped) { PL.vx = 0; sdx = 0; }
        } else PL.x = nx;
      }
      if (sdy !== 0) {
        var ny = PL.y + sdy;
        var hitY = overlaps(PL.x, ny);
        if (hitY) {
          if (sdy < 0) {
            PL.y = hitY.y + hitY.h;
            PL.grounded = true;
          } else {
            PL.y = hitY.y - HH * 2;
          }
          PL.vy = 0; sdy = 0;
        } else PL.y = ny;
      }
    }

    // ground probe so coyote/landing do not depend on colliding this exact frame
    if (!PL.grounded && PL.vy <= 0 && overlaps(PL.x, PL.y - 0.06)) PL.grounded = true;

    if (PL.grounded && !wasGrounded) PL.squash = 0.35;

    // --- animation ---
    if (PL.grounded && Math.abs(PL.vx) > 0.4) PL.walk += dt * (5 + Math.abs(PL.vx) * 0.85);
    else PL.walk *= (1 - Math.min(1, dt * 6));

    if (group) {
      group.position.set(PL.x, PL.y, 0);
      group.rotation.y = PL.facing > 0 ? 0 : Math.PI;
      var sq = PL.squash;
      group.scale.set(1 + sq * 0.22, 1 - sq * 0.26, 1);

      var swing = Math.sin(PL.walk) * 0.5;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      var bob = PL.grounded ? Math.abs(Math.sin(PL.walk)) * 0.045 : 0;
      torso.position.y = 1.02 + bob;
      head.position.y = 1.66 + bob;
      optic.position.y = 1.68 + bob;

      if (PL.arm) {
        var swing = PL.atkState === 2 ? (-1.1 + PL.atkSwing * 2.2)
                  : PL.atkState === 1 ? -1.2
                  : (PL.grounded ? Math.sin(PL.walk) * 0.25 : -0.3);
        PL.arm.rotation.z = swing;
      }
      thruster.material.opacity = PL.dashT > 0 ? 0.9 : (PL.vy > 2 ? 0.35 : 0);
      glowLight.intensity = 1.5 + (PL.dashT > 0 ? 2.5 : 0);
    }
  };

})(window.PROTO = window.PROTO || {});
