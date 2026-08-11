/* CYBERVANIA — proto/player.js
   R-17: a jointed rig, procedurally animated.

   The previous version was a stack of rigid boxes and read, correctly, as a glued
   Lego figure. This one is a hierarchy — hips, torso, head, two-segment arms,
   two-segment legs with feet — and every state drives those joints rather than moving
   the body as a block. Nothing is keyframed; it is all phase-driven, which is what lets
   a run blend into a jump into a landing crouch with no transitions to author.

   The rules that make it read as alive:
     - counter-rotation: arms swing against the legs, the head counters the torso
     - lead with the hips: the torso leans into acceleration, the head stays level
     - follow-through: limbs overshoot and settle instead of snapping
     - weight on contact: landing bends the knees deeply and recovers over ~0.3 s
     - anticipation: every attack winds back before it goes forward
*/
(function (P) {
  'use strict';

  var PL = P.Player = {};

  var RUN = 9.5, ACCEL = 62, FRICTION = 70, AIR_ACCEL = 40;
  var GRAV = 52, FALL_MAX = 34, JUMP_V = 17.2, JUMP_CUT = 0.45;
  var COYOTE = 0.13, BUFFER = 0.15;
  var DASH_V = 26, DASH_T = 0.17, DASH_CD = 0.42;
  var HW = 0.42, HH = 1.5;

  /* Ledge grab: if the hands clear a lip while the feet do not, R-17 catches it. */
  var LEDGE_REACH = 0.55, LEDGE_HANG = 0.14, LEDGE_PULL = 0.28;

  PL.x = 0; PL.y = 0; PL.vx = 0; PL.vy = 0;
  PL.grounded = false; PL.facing = 1;
  PL.coyote = 0; PL.jumpBuf = 0; PL.dashBuf = 0;
  PL.dashT = 0; PL.dashCd = 0; PL.dashDir = 1; PL.jumps = 0;
  PL.walk = 0; PL.squash = 0; PL.land = 0; PL.jumpKick = 0;
  PL.atkState = 0; PL.atkTimer = 0; PL.atkIndex = 0; PL.comboTimer = 0; PL.atkPhase = 0;
  PL.ledge = 0; PL.ledgeT = 0; PL.ledgeX = 0; PL.ledgeY = 0;
  PL.lean = 0;

  var J = {}, group, glowLight, thrusterL, thrusterR, opticMat;

  /* A box pivoted at its top end, so rotating the joint swings the limb rather than
     spinning it about its middle. */
  function limb(w, h, d, mat) {
    var g = new THREE.Group();
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.y = -h / 2;
    m.castShadow = true;
    g.add(m);
    return g;
  }

  PL.build = function (scene) {
    group = new THREE.Group();

    var body = new THREE.MeshStandardMaterial({ color: 0x93a8c0, roughness: 0.42, metalness: 0.78 });
    var dark = new THREE.MeshStandardMaterial({ color: 0x2b3340, roughness: 0.6, metalness: 0.72 });
    var trim = new THREE.MeshStandardMaterial({ color: 0x5a6a80, roughness: 0.5, metalness: 0.8 });
    opticMat = new THREE.MeshBasicMaterial({ color: 0x4de3ff, toneMapped: false });

    J.hips = new THREE.Group();
    J.hips.position.y = 0.95;
    group.add(J.hips);
    J.hips.add(new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.30, 0.46), dark));

    J.torso = new THREE.Group();
    J.torso.position.y = 0.16;
    J.hips.add(J.torso);
    var chest = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.62, 0.54), body);
    chest.position.y = 0.32; chest.castShadow = true;
    J.torso.add(chest);
    var collar = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.14, 0.5), trim);
    collar.position.y = 0.63;
    J.torso.add(collar);
    var core = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.06), opticMat);
    core.position.set(0, 0.34, 0.28);
    J.torso.add(core);
    var pack = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.52, 0.26), dark);
    pack.position.set(-0.02, 0.34, -0.34);
    J.torso.add(pack);

    J.head = new THREE.Group();
    J.head.position.y = 0.78;
    J.torso.add(J.head);
    var skull = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.40, 0.50), body);
    skull.castShadow = true;
    J.head.add(skull);
    var visor = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.13, 0.06), opticMat);
    visor.position.set(0.06, 0.03, 0.26);
    J.head.add(visor);
    var ant = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.05), dark);
    ant.position.set(-0.18, 0.30, -0.10); ant.rotation.z = 0.3;
    J.head.add(ant);

    function arm(side) {
      var sh = new THREE.Group();
      sh.position.set(side * 0.44, 0.52, 0);
      J.torso.add(sh);
      var upper = limb(0.20, 0.42, 0.20, dark);
      sh.add(upper);
      var el = new THREE.Group();
      el.position.y = -0.42;
      upper.add(el);
      var fore = limb(0.18, 0.40, 0.18, trim);
      el.add(fore);
      return { sh: sh, upper: upper, fore: fore };
    }
    J.armR = arm(1);
    J.armL = arm(-1);

    J.blade = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.15, 0.10),
      new THREE.MeshBasicMaterial({ color: 0xa8f4ff, toneMapped: false }));
    J.blade.position.y = -0.92;
    J.blade.visible = false;
    J.armR.fore.add(J.blade);

    /* Slash arc: a quad that sweeps with the swing. Cheap, and it is what sells the
       attack as a motion rather than a hitbox. */
    J.arc = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6),
      new THREE.MeshBasicMaterial({ color: 0xa8f4ff, transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    J.arc.position.set(0.9, 0.45, 0.2);
    J.torso.add(J.arc);

    function leg(side) {
      var hp = new THREE.Group();
      hp.position.set(side * 0.19, -0.12, 0);
      J.hips.add(hp);
      var thigh = limb(0.22, 0.42, 0.22, dark);
      hp.add(thigh);
      var kn = new THREE.Group();
      kn.position.y = -0.42;
      thigh.add(kn);
      var shin = limb(0.19, 0.40, 0.19, trim);
      kn.add(shin);
      var foot = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.13, 0.40), dark);
      foot.position.set(0, -0.46, 0.07);
      shin.add(foot);
      return { thigh: thigh, knee: kn, shin: shin, foot: foot };
    }
    J.legR = leg(1);
    J.legL = leg(-1);

    var thrMat = new THREE.MeshBasicMaterial({ color: 0x4de3ff, transparent: true,
      opacity: 0, depthWrite: false, toneMapped: false });
    thrusterR = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.7, 6), thrMat.clone());
    thrusterR.rotation.x = Math.PI; thrusterR.position.y = -0.78;
    J.legR.shin.add(thrusterR);
    thrusterL = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.7, 6), thrMat.clone());
    thrusterL.rotation.x = Math.PI; thrusterL.position.y = -0.78;
    J.legL.shin.add(thrusterL);

    var ga = new THREE.Object3D();
    ga.position.set(0, 1.2, 0.5);
    group.add(ga);
    glowLight = P.Lights ? P.Lights.attach(ga, 0x4de3ff, 1.5, 7) : { intensity: 0 };

    scene.add(group);
    PL.group = group;
    PL.joints = J;
  };

  /* ======================================================================== */
  function solidAt(x, y, w, h) {
    var c = P.World.colliders;
    var l = x - w / 2, r = x + w / 2, b = y, t = y + h;
    for (var i = 0; i < c.length; i++) {
      var o = c[i];
      if (l < o.x + o.w && r > o.x && b < o.y + o.h && t > o.y) return o;
    }
    return null;
  }
  function overlaps(x, y) { return solidAt(x, y, HW * 2, HH * 2); }

  PL.spawn = function (x, y) {
    PL.x = x; PL.y = y; PL.vx = 0; PL.vy = 0;
    PL.ledge = 0; PL.atkState = 0;
    var guard = 0;
    while (overlaps(PL.x, PL.y) && guard++ < 200) PL.y += 0.5;
  };

  /* --- ledge grab ---------------------------------------------------------- */
  function tryLedge() {
    if (PL.ledge || PL.grounded || PL.vy > 1.5 || PL.dashT > 0) return;
    var dir = PL.facing;
    var handY = PL.y + 2.25;
    var px = PL.x + dir * (HW + LEDGE_REACH);

    var wall = solidAt(px, handY - 0.4, 0.25, 0.55);
    if (!wall) return;
    var top = wall.y + wall.h;
    if (top > handY + 0.45 || top < handY - 0.85) return;
    /* The band above the lip must be clear, or it is a wall and not a ledge. */
    if (solidAt(px, top + 0.1, 0.25, 1.2)) return;
    /* And there must be somewhere to stand once we are up. */
    if (solidAt(px + dir * 0.35, top + 0.06, HW * 2, HH * 2)) return;

    PL.ledge = 1; PL.ledgeT = 0;
    PL.ledgeX = px + dir * 0.35;
    PL.ledgeY = top;
    PL.vx = 0; PL.vy = 0; PL.jumps = 0;
  }

  function updateLedge(dt, input) {
    PL.ledgeT += dt;
    if (input.down) { PL.ledge = 0; PL.vy = -2; return; }
    if (PL.ledgeT < LEDGE_HANG) return;
    var k = Math.min(1, (PL.ledgeT - LEDGE_HANG) / LEDGE_PULL);
    var e = k * k * (3 - 2 * k);
    PL.x = PL.ledgeX - PL.facing * (1 - e) * 0.6;
    PL.y = PL.ledgeY - HH * 2 * (1 - e) * 0.8;
    if (k >= 1) {
      PL.ledge = 0;
      PL.x = PL.ledgeX; PL.y = PL.ledgeY;
      PL.grounded = true; PL.land = 0.35;
    }
  }

  /* --- attack -------------------------------------------------------------- */
  var COMBO = [
    { windup: 0.07, active: 0.11, recover: 0.13, dmg: 7,  reach: 2.1, step: 1.6,
      kb: 10, up: 2.5, from: -2.2, to: 0.9,  twist: 0.5,  shake: 0.22, stop: 0.05 },
    { windup: 0.06, active: 0.10, recover: 0.13, dmg: 7,  reach: 2.1, step: 1.6,
      kb: 10, up: 2.5, from: 1.0,  to: -1.9, twist: -0.5, shake: 0.22, stop: 0.05 },
    { windup: 0.11, active: 0.13, recover: 0.26, dmg: 13, reach: 2.6, step: 4.5,
      kb: 20, up: 7,   from: -2.7, to: 1.3,  twist: 0.75, shake: 0.5,  stop: 0.09 }
  ];

  function updateAttack(dt, input) {
    PL.comboTimer = Math.max(0, PL.comboTimer - dt);
    if (PL.atkState > 0) {
      var a = COMBO[PL.atkIndex];
      PL.atkTimer -= dt;
      if (PL.atkState === 1) {
        PL.atkPhase = 1 - Math.max(0, PL.atkTimer) / a.windup;
        if (PL.atkTimer <= 0) {
          PL.atkState = 2; PL.atkTimer = a.active;
          J.blade.visible = true;
          var bx = PL.x + PL.facing * 0.4;
          var hits = P.Enemies ? P.Enemies.hitBox(
            PL.facing > 0 ? bx : bx - a.reach, PL.y + 0.2, a.reach, 2.6,
            a.dmg, PL.facing, { knockback: a.kb, up: a.up }) : 0;
          if (hits > 0) {
            PL.vx += PL.facing * a.step;
            if (P.Game) {
              P.Game.hitstop(a.stop);
              P.Game.shake = Math.max(P.Game.shake || 0, a.shake);
            }
          } else PL.vx += PL.facing * a.step * 0.35;
        }
      } else if (PL.atkState === 2) {
        PL.atkPhase = 1 - Math.max(0, PL.atkTimer) / a.active;
        if (PL.atkTimer <= 0) { PL.atkState = 3; PL.atkTimer = a.recover; J.blade.visible = false; }
      } else {
        PL.atkPhase = 1 - Math.max(0, PL.atkTimer) / a.recover;
        if (PL.atkTimer <= 0) { PL.atkState = 0; PL.comboTimer = 0.42; }
      }
      return;
    }
    if (!input.attackPressed) return;
    PL.atkIndex = PL.comboTimer > 0 ? (PL.atkIndex + 1) % COMBO.length : 0;
    PL.atkState = 1; PL.atkTimer = COMBO[PL.atkIndex].windup; PL.atkPhase = 0;
  }

  /* ======================================================================== */
  PL.update = function (dt, input) {
    PL.dashCd = Math.max(0, PL.dashCd - dt);
    PL.jumpBuf = Math.max(0, PL.jumpBuf - dt);
    PL.dashBuf = Math.max(0, PL.dashBuf - dt);
    PL.squash += (0 - PL.squash) * Math.min(1, dt * 9);
    PL.land = Math.max(0, PL.land - dt * 3.2);
    PL.jumpKick = Math.max(0, PL.jumpKick - dt * 4);

    if (input.jumpPressed) PL.jumpBuf = BUFFER;
    if (input.dashPressed) PL.dashBuf = BUFFER;

    updateAttack(dt, input);

    if (PL.ledge) {
      if (PL.jumpBuf > 0 && !input.down) PL.ledgeT = Math.max(PL.ledgeT, LEDGE_HANG);
      updateLedge(dt, input);
      if (PL.ledge) { animate(dt); return; }
    }

    var ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    if (PL.dashT <= 0) {
      var target = ix * RUN;
      var drag = (PL.atkState > 0 && PL.grounded) ? 0.35 : 1;
      var acc = PL.grounded ? (ix !== 0 ? ACCEL : FRICTION) : (ix !== 0 ? AIR_ACCEL : 14);
      acc *= drag;
      if (PL.vx < target) PL.vx = Math.min(PL.vx + acc * dt, target);
      else if (PL.vx > target) PL.vx = Math.max(PL.vx - acc * dt, target);
      if (ix !== 0 && PL.atkState === 0) PL.facing = ix;
    }

    if (PL.grounded) { PL.coyote = COYOTE; PL.jumps = 0; }
    else PL.coyote = Math.max(0, PL.coyote - dt);

    if (PL.jumpBuf > 0) {
      var canGround = PL.coyote > 0 && PL.jumps === 0;
      var canAir = !PL.grounded && PL.coyote <= 0 && PL.jumps < 2;
      if (canGround || canAir) {
        PL.jumpBuf = 0; PL.coyote = 0; PL.jumps++;
        PL.vy = JUMP_V * (PL.jumps > 1 ? 0.88 : 1);
        PL.grounded = false; PL.squash = -0.30; PL.jumpKick = 1;
      }
    }
    if (input.jumpReleased && PL.vy > 0) PL.vy *= JUMP_CUT;

    if (PL.dashT > 0) {
      PL.dashT -= dt;
      PL.vx = PL.dashDir * DASH_V; PL.vy = 0;
      if (PL.dashT <= 0) PL.vx *= 0.5;
    } else if (PL.dashBuf > 0 && PL.dashCd <= 0) {
      PL.dashBuf = 0; PL.dashT = DASH_T; PL.dashCd = DASH_CD;
      PL.dashDir = ix !== 0 ? ix : PL.facing;
      PL.facing = PL.dashDir; PL.jumpKick = 1;
    }

    if (PL.dashT <= 0) {
      var g = GRAV;
      if (Math.abs(PL.vy) < 3.2) g *= 0.76;
      PL.vy = Math.max(PL.vy - g * dt, -FALL_MAX);
    }

    var steps = Math.max(1, Math.ceil(Math.max(Math.abs(PL.vx), Math.abs(PL.vy)) * dt / 0.25));
    var sdx = PL.vx * dt / steps, sdy = PL.vy * dt / steps;
    var wasGrounded = PL.grounded, impact = PL.vy;
    PL.grounded = false;

    for (var s = 0; s < steps; s++) {
      if (sdx !== 0) {
        var nx = PL.x + sdx;
        if (overlaps(nx, PL.y)) {
          var stepped = false;
          for (var up = 0.1; up <= 1.05; up += 0.15) {
            if (!overlaps(nx, PL.y + up)) { PL.y += up; PL.x = nx; stepped = true; break; }
          }
          if (!stepped) { PL.vx = 0; sdx = 0; }
        } else PL.x = nx;
      }
      if (sdy !== 0) {
        var ny = PL.y + sdy;
        var hit = overlaps(PL.x, ny);
        if (hit) {
          if (sdy < 0) { PL.y = hit.y + hit.h; PL.grounded = true; }
          else PL.y = hit.y - HH * 2;
          PL.vy = 0; sdy = 0;
        } else PL.y = ny;
      }
    }
    if (!PL.grounded && PL.vy <= 0 && overlaps(PL.x, PL.y - 0.06)) PL.grounded = true;

    if (PL.grounded && !wasGrounded) {
      var f = Math.min(1, Math.abs(impact) / FALL_MAX);
      PL.squash = 0.30 + f * 0.35;
      PL.land = 0.4 + f * 0.6;
      if (P.Game && f > 0.55) P.Game.shake = Math.max(P.Game.shake || 0, f * 0.28);
    }

    if (!PL.grounded) tryLedge();

    if (PL.grounded && Math.abs(PL.vx) > 0.4) PL.walk += dt * (3.4 + Math.abs(PL.vx) * 0.72);
    else PL.walk += dt * 1.1;

    animate(dt);
  };

  /* ======================================================================== */
  function ease(cur, to, rate, dt) { return cur + (to - cur) * Math.min(1, rate * dt); }

  function animate(dt) {
    if (!group) return;
    group.position.set(PL.x, PL.y, 0);
    group.rotation.y = ease(group.rotation.y, PL.facing > 0 ? 0 : Math.PI, 18, dt);

    var speed = Math.abs(PL.vx) / RUN;
    group.scale.set(1 + PL.squash * 0.16, 1 - PL.squash * 0.20, 1 + PL.squash * 0.10);

    /* Torso leans into acceleration, head counters it so the optic stays level. This
       one relationship does more for "alive" than any amount of extra geometry. */
    var leanTarget = PL.dashT > 0 ? 0.55 : (PL.vx / RUN) * 0.22 * PL.facing;
    PL.lean = ease(PL.lean, leanTarget, 9, dt);
    J.torso.rotation.z = -PL.lean;
    J.head.rotation.z = PL.lean * 0.65;

    var w = PL.walk;
    var run = PL.grounded ? Math.min(1, speed * 1.6) : 0;
    var air = PL.grounded ? 0 : 1;
    var crouch = PL.land * 0.9;

    var swing = Math.sin(w) * (0.55 + speed * 0.55);
    var liftR = Math.max(0, Math.sin(w + Math.PI / 2));
    var liftL = Math.max(0, Math.sin(w - Math.PI / 2));

    var rT = swing * run - crouch * 0.9, lT = -swing * run - crouch * 0.9;
    var rK = (0.15 + liftR * 0.85) * run + crouch * 1.5;
    var lK = (0.15 + liftL * 0.85) * run + crouch * 1.5;

    if (air) {
      var rise = Math.max(0, Math.min(1, PL.vy / 10));
      var fall = Math.max(0, Math.min(1, -PL.vy / 16));
      rT = 0.75 * rise - 0.35 * fall;  lT = 0.30 * rise - 0.12 * fall;
      rK = 1.50 * rise + 0.25 * fall;  lK = 0.85 * rise + 0.10 * fall;
    }
    if (PL.dashT > 0) { rT = -0.55; lT = -0.28; rK = 0.7; lK = 0.4; }
    if (PL.ledge) { rT = 0.5; lT = 0.18; rK = 1.25; lK = 0.65; }

    J.legR.thigh.rotation.x = ease(J.legR.thigh.rotation.x, rT, 22, dt);
    J.legL.thigh.rotation.x = ease(J.legL.thigh.rotation.x, lT, 22, dt);
    J.legR.knee.rotation.x = ease(J.legR.knee.rotation.x, rK, 22, dt);
    J.legL.knee.rotation.x = ease(J.legL.knee.rotation.x, lK, 22, dt);
    J.legR.foot.rotation.x = ease(J.legR.foot.rotation.x, -rK * 0.5, 18, dt);
    J.legL.foot.rotation.x = ease(J.legL.foot.rotation.x, -lK * 0.5, 18, dt);

    /* Hip bob: two bounces per stride, plus the landing crouch. */
    J.hips.position.y = ease(J.hips.position.y,
      0.95 - Math.abs(Math.sin(w)) * 0.07 * run - crouch * 0.42, 20, dt);

    var rU = -swing * 0.75 * run, lU = swing * 0.75 * run;
    var rF = -0.35 - Math.abs(rU) * 0.4, lF = -0.35 - Math.abs(lU) * 0.4;
    if (air) { rU = -0.7; lU = -1.0; rF = -0.6; lF = -0.5; }
    if (PL.dashT > 0) { rU = 1.5; lU = 1.7; rF = -0.3; lF = -0.25; }
    if (PL.ledge) { rU = -2.5; lU = -2.5; rF = -0.2; lF = -0.2; }

    var twist = 0;
    if (PL.atkState > 0) {
      var a = COMBO[PL.atkIndex], p = PL.atkPhase;
      if (PL.atkState === 1) {                       // anticipation: wind past the start
        rU = a.from - 0.45 * p; rF = -0.9 - 0.5 * p; twist = -a.twist * 0.8 * p;
      } else if (PL.atkState === 2) {                // the swing
        var e2 = p * p * (3 - 2 * p);
        rU = a.from + (a.to - a.from) * e2;
        rF = -0.85 + 0.75 * e2;
        twist = a.twist * (e2 * 2 - 1);
      } else {                                       // follow-through, settling back
        rU = a.to + 0.3 * (1 - p); rF = -0.1 - 0.5 * p; twist = a.twist * (1 - p) * 0.8;
      }
      lU = -0.5 - twist * 0.6; lF = -0.7;
    }

    J.armR.upper.rotation.x = ease(J.armR.upper.rotation.x, rU, 26, dt);
    J.armL.upper.rotation.x = ease(J.armL.upper.rotation.x, lU, 26, dt);
    J.armR.fore.rotation.x = ease(J.armR.fore.rotation.x, rF, 26, dt);
    J.armL.fore.rotation.x = ease(J.armL.fore.rotation.x, lF, 26, dt);
    J.torso.rotation.y = ease(J.torso.rotation.y, twist, 20, dt);
    J.head.rotation.y = ease(J.head.rotation.y, -twist * 0.5, 16, dt);

    if (PL.atkState === 2) {
      var aa = COMBO[PL.atkIndex];
      J.arc.material.opacity = 0.55 * (1 - PL.atkPhase);
      J.arc.rotation.z = aa.from + (aa.to - aa.from) * PL.atkPhase;
      J.arc.scale.setScalar(0.9 + PL.atkPhase * 0.7);
    } else J.arc.material.opacity = Math.max(0, J.arc.material.opacity - dt * 5);

    var thr = PL.dashT > 0 ? 0.95 : PL.jumpKick * 0.8;
    thrusterR.material.opacity = thr;
    thrusterL.material.opacity = thr * 0.75;
    thrusterR.scale.y = 0.6 + thr * 1.2;
    thrusterL.scale.y = 0.6 + thr * 1.0;

    if (glowLight) glowLight.intensity = 1.5 + (PL.dashT > 0 ? 2.2 : 0) + PL.jumpKick;
    if (opticMat) {
      var blink = (Math.sin(PL.walk * 0.6) > 0.985) ? 0.25 : 1;
      var atk = PL.atkState === 2 ? 1.6 : 1;
      opticMat.color.setRGB(0.30 * blink * atk, 0.89 * blink * atk, 1.0 * blink * atk);
    }
  }

})(window.PROTO = window.PROTO || {});
