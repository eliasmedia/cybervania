/* CYBERVANIA — proto/fx.js
   Impact sparks. One pooled Points cloud for the whole game — no allocation per hit,
   one draw call total.

   These exist for one reason: a hit needs debris. Knockback tells you the enemy moved,
   hitstop tells you it hurt, and sparks tell you *where* it connected. */
(function (P) {
  'use strict';

  var FX = P.FX = {};

  var MAX = 220;
  var pos, vel, life, maxLife, size;
  var points, geo, head = 0;

  FX.init = function (scene) {
    pos = new Float32Array(MAX * 3);
    vel = new Float32Array(MAX * 3);
    life = new Float32Array(MAX);
    maxLife = new Float32Array(MAX);
    size = new Float32Array(MAX);
    for (var i = 0; i < MAX; i++) pos[i * 3 + 1] = -99999;

    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1));

    /* Additive, unlit, depth-tested but not depth-written, so sparks read as light
       rather than as objects. */
    var mat = new THREE.PointsMaterial({
      color: 0xa8f4ff, size: 0.16, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      toneMapped: false
    });
    points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);
    FX.points = points;
  };

  function emit(x, y, vx, vy, ttl) {
    var i = head; head = (head + 1) % MAX;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
    vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = (Math.random() - 0.5) * 2;
    life[i] = maxLife[i] = ttl;
  }

  /* A directional spray, thrown back along the hit direction. */
  FX.sparks = function (x, y, dir, count) {
    if (!pos) return;
    for (var i = 0; i < (count || 10); i++) {
      var a = (Math.random() - 0.5) * 1.5;
      var sp = 4 + Math.random() * 12;
      emit(x, y, Math.cos(a) * sp * dir, Math.sin(a) * sp + 3, 0.18 + Math.random() * 0.28);
    }
  };

  /* An omnidirectional burst, for a death. */
  FX.burst = function (x, y, count) {
    if (!pos) return;
    for (var i = 0; i < (count || 18); i++) {
      var a = Math.random() * 6.283;
      var sp = 3 + Math.random() * 14;
      emit(x, y, Math.cos(a) * sp, Math.sin(a) * sp + 2, 0.3 + Math.random() * 0.45);
    }
  };

  FX.update = function (dt) {
    if (!pos) return;
    var any = false;
    for (var i = 0; i < MAX; i++) {
      if (life[i] <= 0) continue;
      any = true;
      life[i] -= dt;
      if (life[i] <= 0) { pos[i * 3 + 1] = -99999; continue; }
      vel[i * 3 + 1] -= 34 * dt;                 // gravity
      vel[i * 3] *= (1 - 2.2 * dt);              // drag
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    if (any) geo.attributes.position.needsUpdate = true;
  };

  FX.count = function () {
    var n = 0;
    if (life) for (var i = 0; i < MAX; i++) if (life[i] > 0) n++;
    return n;
  };

})(window.PROTO = window.PROTO || {});
