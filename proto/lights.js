/* CYBERVANIA — proto/lights.js
   Fixed-size light pool.

   THE BUG THIS EXISTS TO FIX: three.js bakes the number of lights into every material's
   shader program. Streaming chunks in and out changed the light count (31 in the opening,
   39 in the street), and every change forced a recompile of every program — which showed
   up as a 0.5-3 second freeze the moment the player crossed into a new area.

   So the scene now contains a CONSTANT number of PointLights, created once and never
   added or removed. Chunks register light *emitters* instead; each frame the nearest N
   emitters are assigned to the pool. The light count never changes, so nothing ever
   recompiles, and the per-fragment cost is capped no matter how many neon signs a region
   has.

   Handover is faded rather than snapped, so a light entering or leaving the pool ramps
   instead of popping. */
(function (P) {
  'use strict';

  var L = P.Lights = {};

  var POOL = 8;                 // constant. Changing it recompiles shaders — by design.
  var pool = [], emitters = [];
  var tmp = null;

  L.init = function (scene, count) {
    POOL = count || POOL;
    tmp = new THREE.Vector3();
    for (var i = 0; i < POOL; i++) {
      var l = new THREE.PointLight(0xffffff, 0, 14, 2);
      l.position.set(0, -99999, 0);
      scene.add(l);
      pool.push({ light: l, owner: null, level: 0 });
    }
    L.scene = scene;
  };

  /* Attach an emitter to an object already in the scene graph. World position is read
     from that object, so kit pieces can keep building in local space. */
  L.attach = function (obj, color, intensity, range) {
    var e = {
      obj: obj, color: new THREE.Color(color),
      intensity: intensity === undefined ? 2 : intensity,
      range: range || 14,
      wx: 0, wy: 0, live: true
    };
    emitters.push(e);
    if (P.Kit && P.Kit.ownLight) P.Kit.ownLight(e);
    return e;
  };

  L.drop = function (e) {
    var i = emitters.indexOf(e);
    if (i >= 0) emitters.splice(i, 1);
    for (var k = 0; k < pool.length; k++) if (pool[k].owner === e) { pool[k].owner = null; }
  };

  L.clear = function () {
    emitters.length = 0;
    for (var i = 0; i < pool.length; i++) { pool[i].owner = null; pool[i].level = 0; }
  };

  L.count = function () { return emitters.length; };
  L.poolSize = function () { return POOL; };

  /* Assign the nearest emitters to the pool, then ease each pool light toward its
     target so entering/leaving is a fade rather than a pop. */
  L.update = function (camX, camY, dt) {
    var i, e;
    for (i = 0; i < emitters.length; i++) {
      e = emitters[i];
      e.obj.getWorldPosition(tmp);
      e.wx = tmp.x; e.wy = tmp.y; e.wz = tmp.z;
      var dx = e.wx - camX, dy = e.wy - camY;
      e.d2 = dx * dx + dy * dy;
    }

    /* Partial selection: we only need the POOL nearest, not a full sort. */
    var chosen = [];
    for (i = 0; i < emitters.length; i++) {
      e = emitters[i];
      if (e.intensity <= 0.001) continue;
      if (chosen.length < POOL) { chosen.push(e); continue; }
      var worst = 0;
      for (var k = 1; k < chosen.length; k++) if (chosen[k].d2 > chosen[worst].d2) worst = k;
      if (e.d2 < chosen[worst].d2) chosen[worst] = e;
    }

    /* Keep an emitter on the slot it already occupies, so lights do not swap slots
       (and therefore colours) every frame as distances jitter. */
    var used = [];
    var slot;
    for (i = 0; i < chosen.length; i++) {
      for (slot = 0; slot < pool.length; slot++) {
        if (pool[slot].owner === chosen[i]) { used[slot] = 1; chosen[i]._slot = slot; break; }
      }
      if (slot >= pool.length) chosen[i]._slot = -1;
    }
    for (i = 0; i < chosen.length; i++) {
      if (chosen[i]._slot >= 0) continue;
      for (slot = 0; slot < pool.length; slot++) {
        if (!used[slot] && (pool[slot].owner === null || chosen.indexOf(pool[slot].owner) < 0)) {
          pool[slot].owner = chosen[i];
          pool[slot].level = 0;
          used[slot] = 1;
          break;
        }
      }
    }
    for (slot = 0; slot < pool.length; slot++) {
      if (!used[slot] && pool[slot].owner && chosen.indexOf(pool[slot].owner) < 0) {
        pool[slot].owner = null;
      }
    }

    var rate = Math.min(1, dt * 6);
    for (slot = 0; slot < pool.length; slot++) {
      var p = pool[slot], o = p.owner;
      if (o && emitters.indexOf(o) >= 0) {
        p.light.position.set(o.wx, o.wy, o.wz);
        p.light.color.copy(o.color);
        p.light.distance = o.range;
        p.level += (o.intensity - p.level) * rate;
      } else {
        p.level += (0 - p.level) * rate;
        if (p.level < 0.01) p.light.position.set(0, -99999, 0);
      }
      p.light.intensity = p.level;
    }
  };

})(window.PROTO = window.PROTO || {});
