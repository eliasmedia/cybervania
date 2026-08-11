/* CYBERVANIA 3D PROTOTYPE — proto/world.js
   ONE continuous world. No rooms, no doors, no transitions.

   The world is a 2D grid of chunks (24 x 24 world units). A macro-map says what kind
   of place each chunk is; the chunk builder generates its geometry, lights, props and
   colliders on demand. Chunks within a radius of the player are built; the rest are
   disposed. Because neighbouring chunks share an edge convention (floor height at the
   seam), the player never sees a boundary — they just walk.

   This is the streaming/"chunk loading" the design calls for: only the neighbourhood
   the player occupies exists in GPU memory at any moment. */
(function (P) {
  'use strict';

  var W = P.World = {};
  var K = P.Kit, T = P.Tex;

  var CW = 24, CH = 24;          // chunk size in world units
  W.CW = CW; W.CH = CH;

  /* Macro-map. Row 0 is the TOP of the world. Each character is one 24x24 chunk.
       ' '  open sky            '#'  solid rock / fill
       'S'  street level        'I'  interior corridor
       'V'  vertical shaft      'C'  undercity cavern
       'F'  factory hall
     Authoring the world at this zoom keeps the whole thing legible on one screen —
     the equivalent of a Hollow Knight world map, before any detail exists. */
  var MACRO = [
    '                                        ',
    '                                        ',
    '   SSSSSSSSSSSS      SSSSSSSSSSSSSS     ',
    '###IIIIIIIIIIV#######IIIIIIIIIIIIIV#####',
    '####IIIIIIIIIV##FFFFFFFFFFF###IIIIV#####',
    '#####VIIIIIIIV##FFFFFFFFFFF###IIIIV#####',
    '#####V#######V##FFFFFFFFFFF###V#########',
    '#####VCCCCCCCCCCCCCCCCCCCCCCCCV#########',
    '#####VCCCCCCCCCCCCCCCCCCCCCCCCV#########',
    '######CCCCCCCC########CCCCCCCCC#########'
  ];
  W.MACRO = MACRO;
  W.cols = MACRO[0].length;
  W.rows = MACRO.length;

  W.typeAt = function (cx, cy) {
    if (cy < 0 || cy >= MACRO.length) return '#';
    var row = MACRO[cy];
    if (cx < 0 || cx >= row.length) return '#';
    return row.charAt(cx);
  };

  /* Chunk (cx,cy) occupies world x in [cx*CW, (cx+1)*CW), and world y in
     [-(cy+1)*CH, -cy*CH) — y grows upward, row 0 is the top of the map. */
  W.chunkOriginY = function (cy) { return -(cy + 1) * CH; };

  var chunks = {};               // "cx,cy" -> {group, colliders, lights}
  W.chunks = chunks;
  W.colliders = [];              // flattened live colliders for collision queries
  var M = null;

  function rngFor(cx, cy) {
    return T.rng(((cx + 991) * 73856093) ^ ((cy + 337) * 19349663));
  }

  W.init = function (scene) {
    W.scene = scene;
    M = K.materials();
    W.mats = M;
  };

  /* ==========================================================================
     CHUNK BUILDERS
     Each returns { group, colliders } in world space.
     ========================================================================== */

  function addBox(colliders, x, y, z, w, h, d) {
    colliders.push({ x: x - w / 2, y: y - h / 2, w: w, h: h });
    void z; void d;
  }

  /* Floor slab spanning the chunk, plus the back wall behind the play plane. */
  function baseShell(g, col, ox, oy, r, opts) {
    opts = opts || {};
    var floorY = oy + (opts.floorY === undefined ? 2 : opts.floorY);

    var floor = new THREE.Mesh(K.box(CW, 2, 10), M.ground);
    floor.position.set(ox + CW / 2, floorY - 1, -1);
    floor.receiveShadow = true;
    g.add(floor);
    addBox(col, ox + CW / 2, floorY - 1, -1, CW, 2, 10);

    if (opts.backWall !== false) {
      var wall = new THREE.Mesh(K.box(CW, CH, 1.5),
                                opts.dark ? M.wallDark : M.wall);
      wall.position.set(ox + CW / 2, oy + CH / 2, -4.2);
      wall.receiveShadow = true;
      g.add(wall);
      // greebles on the back wall
      for (var i = 0; i < 3; i++) {
        var gw = 0.4 + r() * 2.2, gh = 0.4 + r() * 2.4, gd = 0.2 + r() * 0.5;
        var gm = new THREE.Mesh(K.box(gw, gh, gd), r() < 0.3 ? M.rust : M.metalDark);
        gm.position.set(ox + r() * CW, oy + 1 + r() * (CH - 3), -3.4 + gd / 2);
        g.add(gm);
      }
    }
    return floorY;
  }

  /* Ceiling / rock fill above, so corridors feel enclosed rather than open-topped. */
  function ceiling(g, col, ox, oy, atY, thickness) {
    var c = new THREE.Mesh(K.box(CW, thickness, 10), M.wallDark);
    c.position.set(ox + CW / 2, atY + thickness / 2, -1);
    c.receiveShadow = true;
    g.add(c);
    addBox(col, ox + CW / 2, atY + thickness / 2, -1, CW, thickness, 10);
  }

  var BUILD = {};

  /* --- STREET: the surface. Deep skyline, neon, rain, wide open above. -------- */
  BUILD.S = function (g, col, cx, cy, ox, oy, r) {
    var floorY = baseShell(g, col, ox, oy, r, { floorY: 2, backWall: false });

    /* Depth is staged in three bands. The near band is deliberately short so the
       player can see over it — a solid wall of buildings at the back of the play
       plane reads as a flat backdrop, not a city. */
    for (var b = 0; b < 3; b++) {
      var bw = 5 + r() * 6, bh = 7 + r() * 6;
      var t = K.tower(M, bw, bh, 6, r() < 0.5);
      t.position.set(ox + 2 + b * 9 + r() * 3, floorY + bh / 2 - 1, -18 - r() * 5);
      g.add(t);
    }
    for (var m2 = 0; m2 < 3; m2++) {
      var mw = 8 + r() * 10, mh = 16 + r() * 16;
      var mt = K.tower(M, mw, mh, 8, r() < 0.6);
      mt.position.set(ox - 4 + r() * (CW + 8), floorY + mh / 2 - 3, -34 - r() * 16);
      g.add(mt);
    }
    for (var d = 0; d < 4; d++) {
      var dw = 12 + r() * 18, dh = 26 + r() * 40;
      var dt = K.tower(M, dw, dh, 10, true);
      dt.position.set(ox - 10 + r() * (CW + 20), floorY + dh / 2 - 6, -62 - r() * 55);
      g.add(dt);
    }

    // street furniture
    var lamp = K.lamp(M, 0xffb23d, 4.2);
    lamp.position.set(ox + 4 + r() * 3, floorY, 1.2);
    g.add(lamp);

    if (r() < 0.8) {
      var words = ['KIRIN', 'OPEN', '24H', 'VERTEX', 'RAMEN', 'SYNC', 'ATLAS'];
      var cols = [0xff3d9e, 0x4de3ff, 0xffb23d, 0x8b5cf6];
      var tall = r() < 0.45;
      var sign = K.neon(tall ? words[Math.floor(r() * 3)].slice(0, 4) : words[Math.floor(r() * words.length)],
                        cols[Math.floor(r() * cols.length)], { tall: tall, intensity: 3.2, range: 16 });
      sign.position.set(ox + 6 + r() * 12, floorY + 4 + r() * 5, -9.5);
      g.add(sign);
    }
    if (r() < 0.5) {
      var fan = K.fan(M, r);
      fan.position.set(ox + r() * CW, floorY + 5 + r() * 3, -9);
      g.add(fan);
    }
    if (r() < 0.6) {
      var cl = K.clutter(M, r);
      cl.position.set(ox + 4 + r() * 16, floorY, 0.6);
      g.add(cl);
    }
    if (r() < 0.45) {
      var st = K.steam(r);
      st.position.set(ox + r() * CW, floorY, -1);
      g.add(st);
    }
    // overhead cables crossing the street — strong foreground framing
    for (var c = 0; c < 2; c++) {
      var yy = floorY + 9 + r() * 4;
      g.add(K.cable(M,
        new THREE.Vector3(ox - 1, yy, -7),
        new THREE.Vector3(ox + CW + 1, yy + (r() - 0.5) * 2, -7), 1.2 + r()));
    }
    // foreground silhouette pole
    if (r() < 0.5) {
      var pole = new THREE.Mesh(K.box(0.6, 14, 0.6),
        new THREE.MeshBasicMaterial({ color: 0x020306 }));
      pole.position.set(ox + r() * CW, floorY + 6, 6.5);
      g.add(pole);
    }
    return floorY;
  };

  /* --- INTERIOR: enclosed service corridor with platforms and catwalks -------- */
  BUILD.I = function (g, col, cx, cy, ox, oy, r) {
    var floorY = baseShell(g, col, ox, oy, r, { floorY: 2, dark: true });
    ceiling(g, col, ox, oy, oy + CH - 3, 3);

    // pipe runs along the ceiling
    var pr = K.pipes(M, CW, 2 + Math.floor(r() * 3), r);
    pr.position.set(ox + CW / 2, oy + CH - 5.5, -2.6);
    g.add(pr);

    // ledges — generous, Hollow-Knight-ish: broad platforms, not pixel-precise pegs
    var ledges = 1 + Math.floor(r() * 2);
    for (var i = 0; i < ledges; i++) {
      var lw = 6 + r() * 8, lx = ox + 2 + r() * (CW - lw - 4);
      var ly = floorY + 4 + r() * 7;
      var lm = new THREE.Mesh(K.box(lw, 1, 6), M.wallDark);
      lm.position.set(lx + lw / 2, ly, -1);
      lm.castShadow = lm.receiveShadow = true;
      g.add(lm);
      addBox(col, lx + lw / 2, ly, -1, lw, 1, 6);

      var edge = new THREE.Mesh(K.box(lw, 0.14, 6.1), M.hazard);
      edge.position.set(lx + lw / 2, ly + 0.55, -1);
      g.add(edge);

      if (r() < 0.5) {
        var cw2 = K.catwalk(M, lw * 0.8, 2.4);
        cw2.position.set(lx + lw / 2, ly + 0.6, 2.2);
        g.add(cw2);
      }
    }

    var lamp = K.lamp(M, 0x7ecfff, 3.0);
    lamp.position.set(ox + 3 + r() * 18, floorY, 1.0);
    g.add(lamp);

    if (r() < 0.55) {
      var sign = K.neon(['SEC 4', 'EXIT', 'LVL 7'][Math.floor(r() * 3)],
                        r() < 0.5 ? 0x5cff9d : 0xff4459, { intensity: 1.8, range: 10 });
      sign.scale.setScalar(0.6);
      sign.position.set(ox + 4 + r() * 14, floorY + 3.4, -3.2);
      g.add(sign);
    }
    if (r() < 0.5) {
      var cl = K.clutter(M, r);
      cl.position.set(ox + 3 + r() * 17, floorY, 0.4);
      g.add(cl);
    }
    return floorY;
  };

  /* --- SHAFT: vertical connector. Walls on both sides, staggered ledges ------- */
  BUILD.V = function (g, col, cx, cy, ox, oy, r) {
    // side walls
    for (var s = 0; s < 2; s++) {
      var wall = new THREE.Mesh(K.box(5, CH, 10), M.wallDark);
      wall.position.set(ox + (s ? CW - 2.5 : 2.5), oy + CH / 2, -1);
      wall.receiveShadow = true;
      g.add(wall);
      addBox(col, ox + (s ? CW - 2.5 : 2.5), oy + CH / 2, -1, 5, CH, 10);
    }
    var back = new THREE.Mesh(K.box(CW, CH, 1.5), M.wall);
    back.position.set(ox + CW / 2, oy + CH / 2, -4.2);
    g.add(back);

    // staggered ledges up the shaft
    for (var i = 0; i < 4; i++) {
      var side = (i % 2 === 0) ? 1 : -1;
      var lw = 6.5;
      var lx = ox + CW / 2 + side * 4.2;
      var ly = oy + 3 + i * 6 + r() * 1.5;
      var lm = new THREE.Mesh(K.box(lw, 0.9, 6), M.metalDark);
      lm.position.set(lx, ly, -1);
      lm.castShadow = lm.receiveShadow = true;
      g.add(lm);
      addBox(col, lx, ly, -1, lw, 0.9, 6);

      var gd = K.girder(M, lw);
      gd.position.set(lx, ly - 0.9, -1);
      g.add(gd);
    }
    var lamp = K.lamp(M, 0x4de3ff, 2.4);
    lamp.position.set(ox + CW / 2, oy + 2, 1.4);
    g.add(lamp);
    return oy;
  };

  /* --- CAVERN: the undercity. Tall, irregular, warm sodium light ------------- */
  BUILD.C = function (g, col, cx, cy, ox, oy, r) {
    var floorY = baseShell(g, col, ox, oy, r, { floorY: 2 });
    ceiling(g, col, ox, oy, oy + CH - 4, 4);

    /* Irregular rock-ish mass: overlapping rotated boxes read as excavated concrete
       once they are lit and pixelated. */
    for (var i = 0; i < 5; i++) {
      var bw = 2 + r() * 6, bh = 1.5 + r() * 5;
      var m = new THREE.Mesh(K.box(bw, bh, 7), M.wallDark);
      m.position.set(ox + r() * CW, oy + CH - 4 - r() * 6, -1.5);
      m.rotation.z = (r() - 0.5) * 0.35;
      m.receiveShadow = true;
      g.add(m);
    }
    // broad standable shelves
    for (var j = 0; j < 2; j++) {
      var lw = 7 + r() * 8, lx = ox + r() * (CW - lw);
      var ly = floorY + 4 + j * 5 + r() * 2;
      var lm = new THREE.Mesh(K.box(lw, 1.2, 6), M.wall);
      lm.position.set(lx + lw / 2, ly, -1);
      lm.castShadow = lm.receiveShadow = true;
      g.add(lm);
      addBox(col, lx + lw / 2, ly, -1, lw, 1.2, 6);
    }
    var lamp = K.lamp(M, 0xffb23d, 3.4);
    lamp.position.set(ox + 3 + r() * 17, floorY, 1.2);
    g.add(lamp);
    if (r() < 0.55) {
      var cs = K.neon(['SUB 4', 'DOCK', 'R-17'][Math.floor(r() * 3)], 0xffb23d,
                      { intensity: 2.2, range: 13 });
      cs.scale.setScalar(0.7);
      cs.position.set(ox + 4 + r() * 15, floorY + 4 + r() * 3, -3.3);
      g.add(cs);
    }
    if (r() < 0.6) {
      var st = K.steam(r);
      st.position.set(ox + r() * CW, floorY, -1.5);
      g.add(st);
    }
    if (r() < 0.7) {
      var cl = K.clutter(M, r);
      cl.position.set(ox + 3 + r() * 17, floorY, 0.5);
      g.add(cl);
    }
    return floorY;
  };

  /* --- FACTORY: big hall, hazard stripes, heavy machinery -------------------- */
  BUILD.F = function (g, col, cx, cy, ox, oy, r) {
    var floorY = baseShell(g, col, ox, oy, r, { floorY: 2, dark: true });
    ceiling(g, col, ox, oy, oy + CH - 2, 2);

    for (var i = 0; i < 2; i++) {
      var mw = 3 + r() * 4, mh = 3 + r() * 4;
      var mach = new THREE.Mesh(K.box(mw, mh, 5), M.wallDark);
      mach.position.set(ox + 4 + r() * 16, floorY + mh / 2, -1);
      mach.castShadow = mach.receiveShadow = true;
      g.add(mach);
      addBox(col, mach.position.x, mach.position.y, -1, mw, mh, 5);

      var stripe = new THREE.Mesh(K.box(mw, 0.5, 5.1), M.hazard);
      stripe.position.set(mach.position.x, floorY + mh - 0.4, -1);
      g.add(stripe);

      var f = K.fan(M, r);
      f.scale.setScalar(1.4);
      f.position.set(mach.position.x, floorY + mh + 1.6, -2);
      g.add(f);
    }
    var gantry = K.catwalk(M, CW, 3);
    gantry.position.set(ox + CW / 2, oy + CH - 7, 0);
    g.add(gantry);
    addBox(col, ox + CW / 2, oy + CH - 7, 0, CW, 0.4, 3);

    var lamp = K.lamp(M, 0xff8a2b, 3.0);
    lamp.position.set(ox + 5 + r() * 14, floorY, 1.2);
    g.add(lamp);

    var sign = K.neon('LINE 4', 0xffb23d, { intensity: 2.4, range: 13 });
    sign.position.set(ox + CW / 2, floorY + 8, -3.4);
    g.add(sign);
    return floorY;
  };

  /* --- solid fill ------------------------------------------------------------- */
  BUILD['#'] = function (g, col, cx, cy, ox, oy, r) {
    var m = new THREE.Mesh(K.box(CW, CH, 10), M.wallDark);
    m.position.set(ox + CW / 2, oy + CH / 2, -1);
    m.receiveShadow = true;
    g.add(m);
    addBox(col, ox + CW / 2, oy + CH / 2, -1, CW, CH, 10);
    return oy;
  };

  BUILD[' '] = function () { return 0; };   // open sky: nothing to build

  /* ==========================================================================
     STREAMING
     ========================================================================== */

  W.buildChunk = function (cx, cy) {
    var key = cx + ',' + cy;
    if (chunks[key]) return chunks[key];

    var type = W.typeAt(cx, cy);
    var g = new THREE.Group();
    var col = [];
    var ox = cx * CW, oy = W.chunkOriginY(cy);
    var r = rngFor(cx, cy);

    var record = K.beginRecord();
    /* A hand-authored chunk replaces the procedural builder entirely. That is how
       set pieces, story beats and the whole opening get placed by hand while the
       rest of a region stays generated. */
    if (!(P.Authored && P.Authored.build(cx, cy, g, col, ox, oy, M, r))) {
      (BUILD[type] || BUILD[' '])(g, col, cx, cy, ox, oy, r);
    }
    K.endRecord();

    W.scene.add(g);
    var chunk = { group: g, colliders: col, cx: cx, cy: cy, type: type, record: record };
    chunks[key] = chunk;
    rebuildColliders();
    return chunk;
  };

  W.disposeChunk = function (key) {
    var c = chunks[key];
    if (!c) return;
    W.scene.remove(c.group);
    /* Only resources the chunk actually owns are released. Geometry and materials from
       the kit's shared caches are deliberately left alone — they belong to the kit and
       are reused by every other chunk. */
    K.dropRecord(c.record);
    c.group.traverse(function (o) {
      if (o.isLight && o.dispose) o.dispose();
    });
    delete chunks[key];
    rebuildColliders();
  };

  function rebuildColliders() {
    W.colliders.length = 0;
    for (var k in chunks) {
      var cc = chunks[k].colliders;
      for (var i = 0; i < cc.length; i++) W.colliders.push(cc[i]);
    }
  }

  /* --------------------------------------------------------------------------
     STREAMING

     stream() only decides *what* should exist. Building is deferred to pump(), which
     spends a fixed millisecond budget per frame. Building a whole neighbourhood inside
     one frame is what produced the hitch; now the work is spread across frames and the
     player outruns nothing because the radius keeps a ring of slack ahead of them.
     -------------------------------------------------------------------------- */
  var queue = [];
  W.queue = queue;

  W.stream = function (px, py, radX, radY) {
    radX = radX === undefined ? 3 : radX;
    radY = radY === undefined ? 2 : radY;
    var pcx = Math.floor(px / CW);
    var pcy = Math.floor(-py / CH);

    var wanted = {};
    queue.length = 0;
    for (var dy = -radY; dy <= radY; dy++) {
      for (var dx = -radX; dx <= radX; dx++) {
        var cx = pcx + dx, cy = pcy + dy;
        if (cx < 0 || cx >= W.cols || cy < 0 || cy >= W.rows) continue;
        var k = cx + ',' + cy;
        wanted[k] = 1;
        if (!chunks[k]) queue.push({ cx: cx, cy: cy, d: dx * dx + dy * dy * 2 });
      }
    }
    /* Nearest-first, so the chunk the player is about to enter is always built before
       cosmetic ones further out. */
    queue.sort(function (a, b) { return a.d - b.d; });

    for (var key in chunks) {
      if (!wanted[key]) W.disposeChunk(key);
    }
    /* Enemies live with their chunk: anything outside the resident neighbourhood is
       removed, and comes back when its chunk is rebuilt. */
    if (P.Enemies) {
      P.Enemies.dropOutside((pcx - radX) * CW, (pcx + radX + 1) * CW,
                            W.chunkOriginY(pcy + radY), W.chunkOriginY(pcy - radY) + CH);
    }
    W.stats = { live: Object.keys(chunks).length, colliders: W.colliders.length,
                cx: pcx, cy: pcy, type: W.typeAt(pcx, pcy), pending: queue.length,
                enemies: P.Enemies ? P.Enemies.count() : 0 };
  };

  /* Build queued chunks until the budget runs out. Returns how many were built. */
  W.pump = function (budgetMs) {
    if (!queue.length) return 0;
    var t0 = performance.now(), built = 0;
    while (queue.length) {
      var job = queue.shift();
      W.buildChunk(job.cx, job.cy);
      built++;
      if (performance.now() - t0 >= (budgetMs === undefined ? 4 : budgetMs)) break;
    }
    if (W.stats) W.stats.pending = queue.length;
    return built;
  };

  /* Build everything queued right now — used once at boot so the first frame is not
     a slideshow, and after a teleport. */
  W.flush = function () {
    var n = 0;
    while (queue.length && n < 200) { var j = queue.shift(); W.buildChunk(j.cx, j.cy); n++; }
    if (W.stats) W.stats.pending = 0;
    return n;
  };

  /* A reasonable place to drop the player in: the first street chunk. */
  W.spawnPoint = function () {
    if (P.Authored && P.Authored.spawns.start) return P.Authored.spawns.start;
    for (var cy = 0; cy < W.rows; cy++) {
      for (var cx = 0; cx < W.cols; cx++) {
        if (W.typeAt(cx, cy) === 'C') {
          return { x: cx * CW + CW / 2, y: W.chunkOriginY(cy) + 6 };
        }
      }
    }
    return { x: CW * 4, y: 0 };
  };

})(window.PROTO = window.PROTO || {});
