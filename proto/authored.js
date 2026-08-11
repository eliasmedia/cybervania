/* CYBERVANIA — proto/authored.js
   Hand-authored chunks.

   Procedural fill is fine for the middle of a region, but the opening — and every
   landmark, set piece and story beat — has to be placed by hand. This gives each chunk
   an optional authored definition that runs INSTEAD of the procedural builder, with a
   small vocabulary aimed at level design rather than at three.js.

   All coordinates are local to the chunk: x runs 0..24 from its left edge, y runs
   upward from its bottom edge. So `b.floor(0, 24, 2)` means "floor across the whole
   chunk, surface at 2 units up", and it lines up with the neighbour automatically. */
(function (P) {
  'use strict';

  var A = P.Authored = {};
  var K = P.Kit;

  var defs = {};

  /* Register an authored chunk. `fn(b)` receives the builder below. */
  A.chunk = function (cx, cy, fn) {
    defs[cx + ',' + cy] = fn;
    return A;
  };
  A.has = function (cx, cy) { return !!defs[cx + ',' + cy]; };
  A.get = function (cx, cy) { return defs[cx + ',' + cy]; };
  A.count = function () { return Object.keys(defs).length; };

  /* --------------------------------------------------------------------------
     BUILDER
     -------------------------------------------------------------------------- */
  function Builder(g, col, ox, oy, M, rnd, cx, cy) {
    this.g = g; this.col = col;
    this.ox = ox; this.oy = oy;
    this.M = M; this.rnd = rnd;
    this.cx = cx; this.cy = cy;
    this.spawns = {};
  }

  /* Place a mesh in world space from chunk-local coordinates. */
  Builder.prototype.at = function (mesh, x, y, z) {
    mesh.position.set(this.ox + x, this.oy + y, z === undefined ? -1 : z);
    this.g.add(mesh);
    return mesh;
  };

  Builder.prototype.solid = function (x, y, w, h) {
    this.col.push({ x: this.ox + x, y: this.oy + y, w: w, h: h });
  };

  /* --- terrain --------------------------------------------------------------- */

  /* Floor from x0..x1 with its walking surface at height `top`. */
  Builder.prototype.floor = function (x0, x1, top, mat) {
    var w = x1 - x0, t = 3;
    var m = new THREE.Mesh(K.box(w, t, 10), mat || this.M.ground);
    m.receiveShadow = true;
    this.at(m, x0 + w / 2, top - t / 2, -1);
    this.solid(x0, top - t, w, t);
    return this;
  };

  /* A standable ledge. `lip` adds the bright edge strip that makes it readable. */
  Builder.prototype.platform = function (x0, x1, y, opts) {
    opts = opts || {};
    var w = x1 - x0, t = opts.thick || 1;
    var m = new THREE.Mesh(K.box(w, t, 6), opts.mat || this.M.wallDark);
    m.castShadow = m.receiveShadow = true;
    this.at(m, x0 + w / 2, y - t / 2, opts.z === undefined ? -1 : opts.z);
    this.solid(x0, y - t, w, t);
    if (opts.lip !== false) {
      var e = new THREE.Mesh(K.box(w, 1, 6.5), this.M.metal);
      this.at(e, x0 + w / 2, y + 0.06, opts.z === undefined ? -1 : opts.z);
      e.scale.y = 0.14;
    }
    return this;
  };

  Builder.prototype.wall = function (x0, x1, y0, y1, mat) {
    var w = x1 - x0, h = y1 - y0;
    var m = new THREE.Mesh(K.box(w, h, 10), mat || this.M.wallDark);
    m.receiveShadow = true;
    this.at(m, x0 + w / 2, y0 + h / 2, -1);
    this.solid(x0, y0, w, h);
    return this;
  };

  /* Backdrop plane behind the play plane — no collision, just something to look at. */
  Builder.prototype.backdrop = function (mat, z) {
    var m = new THREE.Mesh(K.box(24, 24, 1), mat || this.M.wall);
    m.receiveShadow = true;
    this.at(m, 12, 12, z === undefined ? -4.5 : z);
    return this;
  };

  Builder.prototype.ceiling = function (x0, x1, y) {
    var w = x1 - x0;
    var m = new THREE.Mesh(K.box(w, 4, 10), this.M.wallDark);
    m.receiveShadow = true;
    this.at(m, x0 + w / 2, y + 2, -1);
    this.solid(x0, y, w, 4);
    return this;
  };

  /* --- dressing --------------------------------------------------------------- */

  Builder.prototype.light = function (x, y, color, intensity, range) {
    var anchor = new THREE.Object3D();
    anchor.position.set(this.ox + x, this.oy + y, 1);
    this.g.add(anchor);
    if (P.Lights) P.Lights.attach(anchor, color, intensity || 2, range || 12);
    return this;
  };

  Builder.prototype.lamp = function (x, y, color, height) {
    var l = K.lamp(this.M, color || 0xffb23d, height || 3.2);
    l.position.set(this.ox + x, this.oy + y, 1.2);
    this.g.add(l);
    return this;
  };

  Builder.prototype.neon = function (text, x, y, color, opts) {
    opts = opts || {};
    var s = K.neon(text, color || 0xffb23d, {
      tall: opts.tall, intensity: opts.intensity || 2.4, range: opts.range || 14
    });
    if (opts.scale) s.scale.setScalar(opts.scale);
    s.position.set(this.ox + x, this.oy + y, opts.z === undefined ? -3.3 : opts.z);
    this.g.add(s);
    return this;
  };

  Builder.prototype.pipes = function (x, y, len, count) {
    var p = K.pipes(this.M, len, count || 2, this.rnd);
    p.position.set(this.ox + x, this.oy + y, -2.6);
    this.g.add(p);
    return this;
  };

  Builder.prototype.steam = function (x, y) {
    var s = K.steam(this.rnd);
    s.position.set(this.ox + x, this.oy + y, -1.2);
    this.g.add(s);
    return this;
  };

  Builder.prototype.clutter = function (x, y) {
    var c = K.clutter(this.M, this.rnd);
    c.position.set(this.ox + x, this.oy + y, 0.5);
    this.g.add(c);
    return this;
  };

  Builder.prototype.catwalk = function (x, y, len) {
    var c = K.catwalk(this.M, len, 2.4);
    c.position.set(this.ox + x, this.oy + y, 1.6);
    this.g.add(c);
    return this;
  };

  Builder.prototype.cable = function (x0, y0, x1, y1, sag) {
    this.g.add(K.cable(this.M,
      new THREE.Vector3(this.ox + x0, this.oy + y0, -6),
      new THREE.Vector3(this.ox + x1, this.oy + y1, -6), sag || 1.2));
    return this;
  };

  /* Foreground silhouette — pure black, in front of the play plane. Frames the shot
     and is the cheapest way to add depth to a flat corridor. */
  Builder.prototype.fg = function (x, y, w, h) {
    var m = new THREE.Mesh(K.box(w, h, 1),
      K.mat('fgBlack', function () { return new THREE.MeshBasicMaterial({ color: 0x010204 }); }));
    m.position.set(this.ox + x, this.oy + y, 7);
    this.g.add(m);
    return this;
  };

  /* --- gameplay objects -------------------------------------------------------- */

  Builder.prototype.spawn = function (name, x, y) {
    A.spawns[name] = { x: this.ox + x, y: this.oy + y };
    return this;
  };

  Builder.prototype.enemy = function (type, x, y, opts) {
    if (P.Enemies) P.Enemies.spawn(type, this.ox + x, this.oy + y, opts);
    return this;
  };

  /* Volume that fires a script the first time the player enters it. */
  Builder.prototype.trigger = function (id, x, y, w, h, script) {
    if (P.Triggers) P.Triggers.add(id, this.ox + x, this.oy + y, w, h, script);
    return this;
  };

  /* --- set pieces ---------------------------------------------------------------- */

  /* R-17's charging cradle. Where the game starts, and the only thing in the opening
     room that is lit. */
  Builder.prototype.cradle = function (x, y) {
    var g = new THREE.Group();
    var M = this.M;
    var frame = new THREE.Mesh(K.box(3, 4, 1.5), M.metalDark);
    frame.position.y = 2; frame.castShadow = true;
    g.add(frame);
    var back = new THREE.Mesh(K.box(2.5, 3, 0.5), M.wallDark);
    back.position.set(0, 2.2, 0.6);
    g.add(back);
    for (var s = -1; s <= 1; s += 2) {
      var arm = new THREE.Mesh(K.box(0.5, 0.5, 2), M.metal);
      arm.position.set(s * 1.6, 2.6, 0.8);
      g.add(arm);
    }
    /* The status strip: still slowly cycling after forty-one years. */
    var strip = new THREE.Mesh(K.box(2, 0.5, 0.5),
      K.mat('cradleStrip', function () {
        return new THREE.MeshBasicMaterial({ color: 0x1d6f8c, toneMapped: false });
      }));
    strip.position.set(0, 4.2, 0.9);
    g.add(strip);
    var anchor = new THREE.Object3D();
    anchor.position.set(0, 3, 2);
    g.add(anchor);
    var em = P.Lights ? P.Lights.attach(anchor, 0x4de3ff, 1.6, 9) : null;
    var base = 1.6;
    K.animate(function (t) {
      var p = 0.55 + 0.45 * Math.sin(t * 1.1);
      if (em) em.intensity = base * p;
      strip.material.color.setRGB(0.05 + p * 0.15, 0.3 + p * 0.5, 0.45 + p * 0.55);
    });
    g.position.set(this.ox + x, this.oy + y, -1.5);
    this.g.add(g);
    return this;
  };

  /* A dead maintenance unit. Environmental storytelling: you are not the first. */
  Builder.prototype.deadBot = function (x, y, facing) {
    var g = new THREE.Group(), M = this.M;
    var torso = new THREE.Mesh(K.box(1, 1, 1), M.rust);
    torso.position.set(0, 0.5, 0);
    torso.rotation.z = 0.4 * (facing || 1);
    torso.castShadow = true;
    g.add(torso);
    var head = new THREE.Mesh(K.box(0.5, 0.5, 0.5), M.rust);
    head.position.set(0.8 * (facing || 1), 0.3, 0);
    g.add(head);
    var arm = new THREE.Mesh(K.box(1, 0.5, 0.5), M.metalDark);
    arm.position.set(-0.7 * (facing || 1), 0.3, 0.2);
    arm.rotation.z = 1.2;
    g.add(arm);
    g.position.set(this.ox + x, this.oy + y, 0.4);
    this.g.add(g);
    return this;
  };

  /* Dripping water: a thin emissive line plus a periodic splash ring on the floor. */
  Builder.prototype.drip = function (x, yTop, yFloor) {
    var M = this.M;
    var d = new THREE.Mesh(K.box(0.5, 0.5, 0.5), K.mat('dripMat', function () {
      return new THREE.MeshBasicMaterial({ color: 0x6fa8c8, transparent: true, opacity: 0.7 });
    }));
    d.scale.set(0.12, 0.5, 0.12);
    var ox = this.ox + x, oyTop = this.oy + yTop, oyFloor = this.oy + yFloor;
    d.position.set(ox, oyTop, -1);
    this.g.add(d);
    var period = 1.4 + this.rnd() * 1.6, phase = this.rnd() * period;
    K.animate(function (t) {
      var k = ((t + phase) % period) / period;
      d.position.y = oyTop - k * (oyTop - oyFloor);
      d.visible = k < 0.92;
    });
    return this;
  };

  A.spawns = {};

  /* Run an authored chunk. Returns true if one existed. */
  A.build = function (cx, cy, g, col, ox, oy, M, rnd) {
    var fn = defs[cx + ',' + cy];
    if (!fn) return false;
    fn(new Builder(g, col, ox, oy, M, rnd, cx, cy));
    return true;
  };

})(window.PROTO = window.PROTO || {});
