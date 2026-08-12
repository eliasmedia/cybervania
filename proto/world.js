/* CYBERVANIA — proto/world.js
   ONE continuous world. No rooms, no doors, no transitions.

   The world is a 2D grid of chunks (24 x 24 world units) in one shared coordinate
   space. Chunks near the player are built on demand and disposed behind them. Because
   neighbouring chunks share an edge convention (floor height at the seam), the player
   never sees a boundary — they just walk.

   EVERY CHUNK IS HAND-AUTHORED. There is no procedural generation. There was, and it
   was cut: playtest found that walking east eventually dropped you out of the designed
   opening into generated corridors that went on forever and meant nothing. A
   metroidvania is a place, and a place is authored. A chunk with no definition is
   simply empty — the authored region is responsible for walling itself in.

   So this file now does exactly two things: own the chunk grid, and stream it. What
   goes *in* a chunk lives in proto/authored.js and proto/regions/*. */
(function (P) {
  'use strict';

  var W = P.World = {};
  var K = P.Kit, T = P.Tex;

  var CW = 24, CH = 24;          // chunk size in world units
  W.CW = CW; W.CH = CH;

  /* Chunk (cx,cy) occupies world x in [cx*CW, (cx+1)*CW), and world y in
     [-(cy+1)*CH, -cy*CH) — y grows upward, row 0 is the top of the map. */
  W.chunkOriginY = function (cy) { return -(cy + 1) * CH; };

  /* The world is exactly as big as what has been authored, plus a ring of slack so the
     streamer has somewhere to put "nothing" at the edges. Getters rather than constants
     because the editor adds chunks while the game is running. */
  Object.defineProperty(W, 'cols', { get: function () {
    return (P.Authored ? P.Authored.bounds().maxX + 2 : 1);
  } });
  Object.defineProperty(W, 'rows', { get: function () {
    return (P.Authored ? P.Authored.bounds().maxY + 2 : 1);
  } });

  W.typeAt = function (cx, cy) {
    return (P.Authored && P.Authored.has(cx, cy)) ? 'A' : ' ';
  };

  var chunks = {};               // "cx,cy" -> {group, colliders, cx, cy, record}
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
     CHUNK BUILDING
     ========================================================================== */

  W.buildChunk = function (cx, cy) {
    var key = cx + ',' + cy;
    if (chunks[key]) return chunks[key];

    var g = new THREE.Group();
    var col = [];
    var ox = cx * CW, oy = W.chunkOriginY(cy);
    var r = rngFor(cx, cy);

    var record = K.beginRecord();
    if (P.Authored) P.Authored.build(cx, cy, g, col, ox, oy, M, r);
    K.endRecord();

    W.scene.add(g);
    var chunk = { group: g, colliders: col, cx: cx, cy: cy,
                  type: W.typeAt(cx, cy), record: record };
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

  /* Throw a chunk away and build it again — how the editor sees an edit. */
  W.rebuildChunk = function (cx, cy) {
    W.disposeChunk(cx + ',' + cy);
    return W.buildChunk(cx, cy);
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
        if (cx < 0 || cy < 0) continue;
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
       removed. Whether it comes back when the chunk is rebuilt is Enemies' business —
       one that has been killed stays killed until the player dies. */
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

  W.spawnPoint = function () {
    return (P.Authored && P.Authored.spawns.start) || { x: CW * 5 + 12, y: -188 };
  };

})(window.PROTO = window.PROTO || {});
