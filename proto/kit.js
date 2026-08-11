/* CYBERVANIA 3D PROTOTYPE — proto/kit.js
   The modular environment kit. Every piece is built from primitives in code, which is
   the same way this kind of sci-fi environment gets kitbashed in a normal art pipeline —
   just without a .blend file in the middle.

   Each builder returns a THREE.Object3D and may register an animator via K.animate(). */
(function (P) {
  'use strict';

  var K = P.Kit = {};
  var T = P.Tex;

  /* Animators are recorded per chunk. A global list that never shrinks was both a leak
     and a growing per-frame cost — disposed chunks kept animating geometry that was no
     longer in the scene. Anything built between beginRecord/endRecord belongs to that
     chunk and dies with it. */
  var animators = [];
  var rec = null;

  K.beginRecord = function () { rec = { anim: [], geo: [], mat: [] }; return rec; };
  K.endRecord = function () { var r = rec; rec = null; return r; };

  K.animate = function (fn) {
    if (rec) rec.anim.push(fn);
    animators.push(fn);
  };
  K.ownGeo = function (g) { if (rec) rec.geo.push(g); return g; };
  K.ownMat = function (m) { if (rec) rec.mat.push(m); return m; };

  K.dropRecord = function (r) {
    if (!r) return;
    for (var i = 0; i < r.anim.length; i++) {
      var idx = animators.indexOf(r.anim[i]);
      if (idx >= 0) animators.splice(idx, 1);
    }
    for (var g = 0; g < r.geo.length; g++) r.geo[g].dispose();
    for (var m = 0; m < r.mat.length; m++) r.mat[m].dispose();
  };

  K.tick = function (t, dt) {
    for (var i = 0; i < animators.length; i++) animators[i](t, dt);
  };
  K.animatorCount = function () { return animators.length; };
  K.clearAnimators = function () { animators.length = 0; };

  /* Shared geometry cache.

     The key trick is QUANTISATION: dimensions are snapped to 0.5-unit steps before the
     cache lookup. Procedural placement produces endless near-identical sizes (7.03,
     7.11, 6.98...) which all missed an exact-match cache and forced a fresh GPU buffer
     upload per chunk. Snapping turns thousands of unique geometries into a few dozen
     shared ones, and the visual difference is nil. */
  var geo = {}, mat = {};
  /* Coarse quantisation is the point, not a compromise. A real modular kit has a fixed
     set of pieces; snapping to 1-unit steps bounds the geometry set so the cache
     converges during pre-warm and never grows again while the player is moving. */
  var Q = 1.0;
  function q(v) { return Math.max(Q, Math.round(v / Q) * Q); }
  K.q = q;

  function box(w, h, d) {
    w = q(w); h = q(h); d = q(d);
    var k = 'b' + w + '_' + h + '_' + d;
    return geo[k] || (geo[k] = new THREE.BoxGeometry(w, h, d));
  }
  function cyl(r1, r2, h, seg) {
    r1 = Math.max(0.02, Math.round(r1 * 20) / 20);
    r2 = Math.max(0.02, Math.round(r2 * 20) / 20);
    h = q(h); seg = seg || 8;
    var k = 'c' + r1 + '_' + r2 + '_' + h + '_' + seg;
    return geo[k] || (geo[k] = new THREE.CylinderGeometry(r1, r2, h, seg));
  }
  function plane(w, h) {
    w = q(w); h = q(h);
    var k = 'p' + w + '_' + h;
    return geo[k] || (geo[k] = new THREE.PlaneGeometry(w, h));
  }
  function sphere() {
    return geo.sph || (geo.sph = new THREE.SphereGeometry(0.11, 6, 5));
  }
  K.box = box; K.cyl = cyl; K.plane = plane; K.sphere = sphere;
  K.geoCount = function () { return Object.keys(geo).length; };

  K.mat = function (key, build) {
    return mat[key] || (mat[key] = build());
  };

  /* --- materials ------------------------------------------------------------- */
  K.materials = function () {
    return {
      wall: K.mat('wall', function () {
        return new THREE.MeshStandardMaterial({
          map: T.make(T.panel({ seed: 3, base: '#39414f' }), 1, 1),
          roughness: 0.85, metalness: 0.35
        });
      }),
      wallDark: K.mat('wallDark', function () {
        return new THREE.MeshStandardMaterial({
          map: T.make(T.panel({ seed: 9, base: '#242a36', plate: 32, vents: 1 }), 1, 1),
          roughness: 0.9, metalness: 0.3
        });
      }),
      metal: K.mat('metal', function () {
        return new THREE.MeshStandardMaterial({ color: 0x53606f, roughness: 0.5, metalness: 0.85 });
      }),
      metalDark: K.mat('metalDark', function () {
        return new THREE.MeshStandardMaterial({ color: 0x2b333f, roughness: 0.65, metalness: 0.8 });
      }),
      rust: K.mat('rust', function () {
        return new THREE.MeshStandardMaterial({ color: 0x6b4630, roughness: 0.95, metalness: 0.25 });
      }),
      ground: K.mat('ground', function () {
        return new THREE.MeshStandardMaterial({
          map: T.make(T.ground({}), 6, 6),
          roughness: 0.35, metalness: 0.55   // wet asphalt: shiny enough to catch neon
        });
      }),
      grate: K.mat('grate', function () {
        return new THREE.MeshStandardMaterial({
          map: T.make(T.grate(), 4, 1), transparent: true, alphaTest: 0.4,
          roughness: 0.6, metalness: 0.8, side: THREE.DoubleSide
        });
      }),
      hazard: K.mat('hazard', function () {
        return new THREE.MeshStandardMaterial({
          map: T.make(T.hazard(), 3, 1), roughness: 0.8, metalness: 0.4
        });
      }),
      facade: K.mat('facade', function () {
        return new THREE.MeshBasicMaterial({ map: T.make(T.facade({ seed: 21 }), 1, 1) });
      }),
      facade2: K.mat('facade2', function () {
        return new THREE.MeshBasicMaterial({ map: T.make(T.facade({ seed: 44, lit: 0.14, base: '#0a0e18' }), 1, 1) });
      })
    };
  };

  /* --- wall section with greebles -------------------------------------------- */
  K.wall = function (M, w, h, d, rnd) {
    var g = new THREE.Group();
    var m = new THREE.Mesh(box(w, h, d), M.wall);
    m.castShadow = m.receiveShadow = true;
    g.add(m);

    /* Greebles: small boxes on the surface. This is the single cheapest thing that
       makes a flat wall read as machinery rather than a cube. */
    var n = 2 + Math.floor(rnd() * 3);
    for (var i = 0; i < n; i++) {
      var gw = 0.25 + rnd() * 0.9, gh = 0.25 + rnd() * 1.4, gd = 0.12 + rnd() * 0.35;
      var gm = new THREE.Mesh(box(gw, gh, gd), rnd() < 0.3 ? M.rust : M.metalDark);
      gm.position.set((rnd() - 0.5) * (w - gw), (rnd() - 0.5) * (h - gh), d / 2 + gd / 2);
      g.add(gm);
    }
    return g;
  };

  /* --- pipe run --------------------------------------------------------------- */
  K.pipes = function (M, len, count, rnd) {
    var g = new THREE.Group();
    for (var i = 0; i < count; i++) {
      var r = 0.10 + rnd() * 0.16;
      var p = new THREE.Mesh(cyl(r, r, len, 8), rnd() < 0.25 ? M.rust : M.metal);
      p.rotation.z = Math.PI / 2;
      p.position.set(0, i * (r * 2.6 + 0.08), (rnd() - 0.5) * 0.25);
      g.add(p);
      // flanges at intervals so a long pipe has rhythm
      for (var f = -len / 2 + 1; f < len / 2; f += 7 + rnd() * 5) {
        var fl = new THREE.Mesh(cyl(r * 1.45, r * 1.45, 0.18, 8), M.metalDark);
        fl.rotation.z = Math.PI / 2;
        fl.position.set(f, p.position.y, p.position.z);
        g.add(fl);
      }
    }
    return g;
  };

  /* --- I-beam girder ----------------------------------------------------------- */
  K.girder = function (M, len, vertical) {
    var g = new THREE.Group();
    var web = new THREE.Mesh(box(len, 0.5, 0.12), M.metalDark);
    var top = new THREE.Mesh(box(len, 0.12, 0.5), M.metalDark);
    var bot = top.clone();
    top.position.y = 0.25; bot.position.y = -0.25;
    g.add(web, top, bot);

    if (vertical) g.rotation.z = Math.PI / 2;
    return g;
  };

  /* --- catwalk ------------------------------------------------------------------ */
  K.catwalk = function (M, len, depth) {
    var g = new THREE.Group();
    var deck = new THREE.Mesh(K.plane(len, depth), M.grate);
    deck.rotation.x = -Math.PI / 2;
    deck.receiveShadow = true;
    g.add(deck);
    // railings
    for (var s = -1; s <= 1; s += 2) {
      var rail = new THREE.Mesh(cyl(0.04, 0.04, len, 6), M.metal);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, 0.55, s * depth / 2);
      g.add(rail);
      for (var px = -len / 2; px <= len / 2; px += 3.2) {
        var post = new THREE.Mesh(box(0.06, 0.55, 0.06), M.metal);
        post.position.set(px, 0.28, s * depth / 2);
        g.add(post);
      }
    }
    return g;
  };

  /* --- neon sign (emissive plane + real point light) ----------------------------- */
  K.neon = function (text, colorHex, opts) {
    opts = opts || {};
    var g = new THREE.Group();
    var tall = !!opts.tall;
    var w = tall ? 1.6 : 3.4, h = tall ? 3.4 : 1.3;

    var tex = T.make(T.sign(text, '#' + colorHex.toString(16).padStart(6, '0'), { tall: tall }), 1, 1);
    var face = new THREE.Mesh(K.plane(w, h), K.ownMat(new THREE.MeshBasicMaterial({
      map: tex, transparent: true, toneMapped: false
    })));
    g.add(face);

    // housing behind the face so it has physical presence
    var back = new THREE.Mesh(box(w * 1.06, h * 1.06, 0.22), K.mat('neonBack', function () {
      return new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.8, metalness: 0.5 });
    }));
    back.position.z = -0.14;
    g.add(back);

    /* A real light, so the sign actually illuminates the street and the wet ground
       picks it up. This is the whole reason to be in 3D. */
    var light = new THREE.PointLight(colorHex, opts.intensity || 2.6, opts.range || 14, 2);
    light.position.z = 1.0;
    g.add(light);

    var baseI = light.intensity;
    var seed = Math.random() * 100;
    K.animate(function (t) {
      /* Broken-tube flicker: mostly on, with brief dropouts. */
      var n = Math.sin(t * 13.1 + seed) * Math.sin(t * 7.3 + seed * 2.1);
      var flick = n < -0.86 ? 0.15 : (0.88 + 0.12 * Math.sin(t * 30 + seed));
      light.intensity = baseI * flick;
      face.material.opacity = 0.55 + 0.45 * flick;
    });
    return g;
  };

  /* --- AC / fan unit with spinning blades ------------------------------------- */
  K.fan = function (M, rnd) {
    var g = new THREE.Group();
    var housing = new THREE.Mesh(box(1.5, 1.5, 0.7), M.wallDark);
    housing.receiveShadow = true;
    g.add(housing);
    var ring = new THREE.Mesh(cyl(0.62, 0.62, 0.1, 16), M.metalDark);
    ring.rotation.x = Math.PI / 2;
    ring.position.z = 0.38;
    g.add(ring);

    var blades = new THREE.Group();
    for (var i = 0; i < 3; i++) {
      var b = new THREE.Mesh(box(1.0, 0.16, 0.04), M.metal);
      b.rotation.z = i * 2.094;
      b.position.z = 0.40;
      blades.add(b);
    }
    g.add(blades);
    var speed = 3 + rnd() * 7;
    K.animate(function (t, dt) { blades.rotation.z += speed * dt; });
    return g;
  };

  /* --- sagging cable ------------------------------------------------------------ */
  K.cable = function (M, from, to, sag) {
    var mid = from.clone().add(to).multiplyScalar(0.5);
    mid.y -= sag;
    var curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    var g = new THREE.Mesh(K.ownGeo(new THREE.TubeGeometry(curve, 8, 0.045, 4, false)), M.metalDark);
    return g;
  };

  /* --- background tower --------------------------------------------------------- */
  K.tower = function (M, w, h, d, alt) {
    var g = new THREE.Group();
    var m = new THREE.Mesh(box(w, h, d), alt ? M.facade2 : M.facade);
    g.add(m);
    // roof clutter gives the skyline a jagged, inhabited silhouette
    var top = new THREE.Mesh(box(w * 0.3, 1.2, d * 0.3),
      new THREE.MeshBasicMaterial({ color: 0x090d16 }));
    top.position.y = h / 2 + 0.6;
    g.add(top);
    var mast = new THREE.Mesh(cyl(0.06, 0.06, 3, 5), new THREE.MeshBasicMaterial({ color: 0x0b1018 }));
    mast.position.y = h / 2 + 2.5;
    g.add(mast);
    // aircraft warning light — slow red blink, the only motion on a distant tower
    var bulb = new THREE.Mesh(K.sphere(),
      K.ownMat(new THREE.MeshBasicMaterial({ color: 0xff3344, toneMapped: false })));
    bulb.position.y = h / 2 + 4;
    g.add(bulb);
    var ph = Math.random() * 6;
    K.animate(function (t) {
      var on = (Math.sin(t * 1.6 + ph) > 0.7);
      bulb.material.color.setHex(on ? 0xff4455 : 0x220a0c);
    });
    return g;
  };

  /* --- street lamp / work light --------------------------------------------------- */
  K.lamp = function (M, colorHex, height) {
    var g = new THREE.Group();
    var pole = new THREE.Mesh(cyl(0.08, 0.10, height, 6), M.metalDark);
    pole.position.y = height / 2;
    g.add(pole);
    var head = new THREE.Mesh(box(0.7, 0.22, 0.5), M.metalDark);
    head.position.set(0.3, height, 0);
    g.add(head);
    var bulb = new THREE.Mesh(box(0.5, 0.06, 0.34), K.mat('bulb' + colorHex, function () {
      return new THREE.MeshBasicMaterial({ color: colorHex, toneMapped: false });
    }));
    bulb.position.set(0.3, height - 0.13, 0);
    g.add(bulb);
    var l = new THREE.PointLight(colorHex, 1.9, 11, 2);
    l.position.set(0.3, height - 0.4, 0);
    g.add(l);
    return g;
  };

  /* --- crate / barrel clutter -------------------------------------------------- */
  K.clutter = function (M, rnd) {
    var g = new THREE.Group();
    var n = 1 + Math.floor(rnd() * 3);
    for (var i = 0; i < n; i++) {
      var s = 0.5 + rnd() * 0.6;
      var m;
      if (rnd() < 0.4) {
        m = new THREE.Mesh(cyl(s * 0.45, s * 0.45, s * 1.3, 10), M.rust);
        m.position.y = s * 0.65;
      } else {
        m = new THREE.Mesh(box(s, s, s * 0.85), rnd() < 0.5 ? M.hazard : M.wallDark);
        m.position.y = s / 2;
        m.rotation.y = (rnd() - 0.5) * 0.5;
      }
      m.position.x = (rnd() - 0.5) * 2.2;
      m.position.z = (rnd() - 0.5) * 0.7;
      m.receiveShadow = true;
      g.add(m);
    }
    return g;
  };

  /* --- steam vent (billboard puffs) ---------------------------------------------- */
  K.steam = function (rnd) {
    var g = new THREE.Group();
    var count = 5;
    var mats = new THREE.MeshBasicMaterial({
      color: 0x9fb4c8, transparent: true, opacity: 0.10, depthWrite: false
    });
    var quads = [];
    for (var i = 0; i < count; i++) {
      var q = new THREE.Mesh(K.plane(1.6, 1.6), K.ownMat(mats.clone()));
      q.position.set(0, i * 0.5, 0);
      quads.push({ m: q, o: rnd() * 3, sp: 0.5 + rnd() * 0.5 });
      g.add(q);
    }
    K.animate(function (t) {
      for (var i = 0; i < quads.length; i++) {
        var q = quads[i];
        var life = ((t * q.sp + q.o) % 3) / 3;
        q.m.position.y = life * 4.2;
        q.m.scale.setScalar(0.5 + life * 2.2);
        q.m.material.opacity = 0.16 * (1 - life) * (life < 0.12 ? life / 0.12 : 1);
        q.m.position.x = Math.sin(life * 3 + q.o) * 0.5;
      }
    });
    return g;
  };

})(window.PROTO = window.PROTO || {});
