/* CYBERVANIA — proto/validate.js
   Geometry sanity checks for authored chunks. Run from the console with
   PROTO.Validate.run(), or automatically with ?validate in the URL.

   These exist because the same class of bug was authored twice by hand: ledges that
   look fine in the source but leave R-17 nowhere to stand. He is 3 units tall, and
   that number has to be respected in two separate places:

     HEADROOM  anything above a walkable surface needs its underside at least
               PLAYER_H clear of it, or the surface is not actually walkable.
     POCKET    two surfaces that overlap horizontally and are less than PLAYER_H
               apart form a pocket the player can enter and not leave.

   Neither is visible when reading the numbers in the chunk definition, which is
   exactly why it needs a checker. */
(function (P) {
  'use strict';

  var V = P.Validate = {};

  var PLAYER_H = 3.0;
  var PLAYER_W = 0.84;
  var MARGIN = 0.2;          // a little slack so a flush fit is not reported

  /* Build every authored chunk in isolation and collect its colliders in world space.
     Enemy spawns are intercepted rather than executed: the checker wants to know where
     encounters sit, not to populate the live world with a second copy of them. */
  function collectAll() {
    var W = P.World, out = [], foes = [];
    var keys = [];
    for (var cy = 0; cy < W.rows; cy++) {
      for (var cx = 0; cx < W.cols; cx++) {
        if (P.Authored.has(cx, cy)) keys.push([cx, cy]);
      }
    }
    /* Rebuild every authored chunk from scratch. Reusing whatever is already resident
       is a false-negative waiting to happen: a chunk built before its authored
       definition was registered still holds the procedural colliders, and the checker
       would then validate geometry the player will never see. */
    var built = [];
    var realSpawn = P.Enemies && P.Enemies.spawn;
    if (realSpawn) {
      P.Enemies.spawn = function (type, x, y) {
        var t = P.Enemies.types[type] || {};
        foes.push({ type: type, x: x, y: y, contact: t.contact || 0 });
        return null;
      };
    }
    try {
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i][0] + ',' + keys[i][1];
        if (W.chunks[k]) W.disposeChunk(k);
        W.buildChunk(keys[i][0], keys[i][1]);
        built.push(k);
      }
    } finally {
      if (realSpawn) P.Enemies.spawn = realSpawn;
    }
    for (var c in W.chunks) {
      var ch = W.chunks[c];
      if (!P.Authored.has(ch.cx, ch.cy)) continue;
      for (var j = 0; j < ch.colliders.length; j++) {
        var o = ch.colliders[j];
        out.push({ x: o.x, y: o.y, w: o.w, h: o.h, chunk: ch.cx + ',' + ch.cy });
      }
    }
    return { boxes: out, foes: foes, temp: built };
  }

  function overlapX(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x;
  }

  /* Could the player's box stand free at this spot? */
  function openAt(boxes, x, y) {
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (x < b.x + b.w && x + PLAYER_W > b.x &&
          y < b.y + b.h && y + PLAYER_H > b.y) return false;
    }
    return true;
  }

  V.run = function (opts) {
    opts = opts || {};
    var got = collectAll();
    var boxes = got.boxes, problems = [];

    for (var i = 0; i < boxes.length; i++) {
      var a = boxes[i];
      var topA = a.y + a.h;

      /* Is this surface wide enough to stand on at all? */
      if (a.w < PLAYER_W) continue;

      var lowestCeiling = Infinity, ceilBox = null;
      for (var j = 0; j < boxes.length; j++) {
        if (i === j) continue;
        var b = boxes[j];
        if (!overlapX(a, b)) continue;
        if (b.y < topA + MARGIN) continue;          // not above this surface
        if (b.y < lowestCeiling) { lowestCeiling = b.y; ceilBox = b; }
      }
      if (lowestCeiling === Infinity) continue;

      /* A surface sitting exactly on a chunk seam is structural fill — the top of a
         wall that runs the full height of its chunk — and is pinched by whatever the
         neighbouring chunk puts there. Never a play surface. */
      if (Math.abs(topA / P.World.CH - Math.round(topA / P.World.CH)) < 0.03) continue;

      /* Is this surface even reachable? The top of a wall buried in rock, or a ceiling
         slab with the next chunk's fill sitting on it, is pinched by definition and is
         not a bug. A surface only matters if the player could arrive at one of its
         ends, so require open space the player's size just past an edge. */
      if (!openAt(boxes, a.x - PLAYER_W - MARGIN, topA) &&
          !openAt(boxes, a.x + a.w + MARGIN, topA)) continue;

      var clearance = lowestCeiling - topA;
      if (clearance < PLAYER_H) {
        /* How much of the surface is actually pinched? A tiny overlap at the very edge
           of a long ledge is usually harmless; a full-width one is a trap. */
        var ox0 = Math.max(a.x, ceilBox.x), ox1 = Math.min(a.x + a.w, ceilBox.x + ceilBox.w);
        var pinch = ox1 - ox0;
        problems.push({
          chunk: a.chunk,
          surfaceY: +topA.toFixed(2),
          surfaceX: a.x.toFixed(1) + '..' + (a.x + a.w).toFixed(1),
          ceilingY: +lowestCeiling.toFixed(2),
          clearance: +clearance.toFixed(2),
          pinchWidth: +pinch.toFixed(2),
          kind: clearance < 0.6 ? 'sealed' : 'pocket'
        });
      }
    }

    /* Clean up anything we built purely to inspect. */
    if (!opts.keep) for (var t = 0; t < got.temp.length; t++) P.World.disposeChunk(got.temp[t]);

    V.problems = problems;
    if (problems.length) {
      console.warn('CYBERVANIA geometry: ' + problems.length +
                   ' surface(s) with less than ' + PLAYER_H + ' units of headroom');
      console.table(problems);
    } else {
      console.log('CYBERVANIA geometry: all authored surfaces have headroom for the player');
    }
    return problems;
  };

  /* ==========================================================================
     ENCOUNTER-BYPASS DETECTION

     The operational form of REDESIGN.md 5a rule 3, "encounters own the ground". The
     playtest complaint was that you can run along the platforms and skip every ground
     enemy; this answers exactly that, per enemy: is there a route from the chunk's west
     edge to its east edge that never enters this enemy's threat volume?

     Method — a reachability graph over standable surfaces:
       nodes   every surface top in a sampled column that has PLAYER_H of clear space
       edges   a jump or fall the player's actual numbers permit (see REACH below)
       flood   west edge to east edge, with the enemy's threat volume removed

     Deliberately generous about what the player can reach. A false "this is skippable"
     costs a look at the chunk; a false "this is fine" ships the bug.
     ========================================================================== */
  var STEP_X = 0.5;

  /* Derived from player.js: JUMP_V 17.2 against GRAV 52 gives a 2.84-unit apex, and the
     double jump roughly doubles it. RUN 9.5 over the airtime gives the horizontal reach. */
  var STEP_UP   = 1.05;      // step-up assist — free, no jump needed
  var SPAN_FLAT = 10.0;      // horizontal reach of a running jump at or below the takeoff
  var DROP_MAX  = 14;        // falling is free, but not off the bottom of the world

  /* Two different ceilings, because the two checks want opposite errors.

     Measured by driving the real controller: a standing double jump rises 4.97, and the
     ledge grab adds roughly another half unit when the hands clear a lip.

     RISE_SKIP is what bypass() assumes, and it is deliberately optimistic — it should
     believe a determined player can get anywhere, so that a route it calls unusable
     really is. RISE_SURE is what reach() assumes, and it is deliberately pessimistic —
     a route it calls reachable has to work without leaning on the assist. */
  var RISE_SKIP = 5.6;
  var RISE_SURE = 4.6;
  var RISE_MAX  = RISE_SKIP;

  /* How far forward you can still travel while climbing dy. At full height you have
     spent the whole arc going up; low hops carry almost the full running span. */
  function spanFor(dy, rise) {
    if (dy <= STEP_UP) return SPAN_FLAT;
    return 2.0 + (SPAN_FLAT - 2.0) * (1 - dy / rise);
  }

  /* A ground enemy's threat volume. The crawler alerts at 11 units and lunges from 6 with
     vy 8, which carries it about 3 units up — so height is a real escape, but only a lot
     of it. Enemies that deal no contact damage (the Sentinel Eye reports you, it does not
     hit you) are not encounters you skip by platforming, and are not checked here. */
  var THREAT_DX = 6.5, THREAT_UP = 4.5, THREAT_DOWN = 3.0;

  function inThreat(foe, x, y) {
    return Math.abs(x - foe.x) < THREAT_DX && y > foe.y - THREAT_DOWN && y < foe.y + THREAT_UP;
  }

  function surfaceHeights(boxes, x) {
    /* All standable surface tops in this column, low to high. */
    var tops = [];
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (x < b.x || x > b.x + b.w) continue;
      var top = b.y + b.h;
      var blocked = false;
      for (var j = 0; j < boxes.length; j++) {
        var c = boxes[j];
        if (i === j) continue;
        if (x < c.x || x > c.x + c.w) continue;
        if (c.y < top + PLAYER_H - MARGIN && c.y + c.h > top + MARGIN) { blocked = true; break; }
      }
      if (!blocked && tops.indexOf(top) < 0) tops.push(top);
    }
    tops.sort(function (a, b) { return a - b; });
    return tops;
  }

  /* Can the east edge be reached from the west edge without touching any blocked node? */
  function crosses(nodes, ox, cw, blocked) {
    var open = [], i, j;
    for (i = 0; i < nodes.length; i++) if (!blocked(nodes[i])) open.push(nodes[i]);
    if (!open.length) return false;

    var seen = new Array(open.length), queue = [];
    for (i = 0; i < open.length; i++) {
      if (open[i].x <= ox + 1.5) { seen[i] = true; queue.push(i); }
    }
    while (queue.length) {
      var a = open[queue.pop()];
      if (a.x >= ox + cw - 1.5) return true;
      for (j = 0; j < open.length; j++) {
        if (seen[j]) continue;
        var b = open[j];
        var dx = Math.abs(b.x - a.x), dy = b.y - a.y;
        var ok = dy >= -DROP_MAX && dy <= RISE_SKIP && dx <= spanFor(dy, RISE_SKIP);
        if (ok) { seen[j] = true; queue.push(j); }
      }
    }
    return false;
  }

  V.bypass = function (opts) {
    opts = opts || {};
    var got = collectAll();
    var boxes = got.boxes, foes = got.foes;
    var W = P.World, reports = [];

    for (var cy = 0; cy < W.rows; cy++) {
      for (var cx = 0; cx < W.cols; cx++) {
        if (!P.Authored.has(cx, cy)) continue;
        var ox = cx * W.CW, oy = W.chunkOriginY(cy);

        var here = foes.filter(function (f) {
          return f.contact > 0 && f.x >= ox && f.x < ox + W.CW &&
                 f.y >= oy && f.y < oy + W.CH;
        });
        if (!here.length) continue;      // nothing to skip

        /* Colliders overlapping this chunk plus a player-height margin. Without the
           margin, geometry sitting exactly on the chunk seam is excluded and the surface
           beneath it looks like open ground. */
        var local = boxes.filter(function (b) {
          return b.x < ox + W.CW + PLAYER_W && b.x + b.w > ox - PLAYER_W &&
                 b.y < oy + W.CH + PLAYER_H * 2 && b.y + b.h > oy - PLAYER_H;
        });
        if (!local.length) continue;

        /* Nodes: standable surfaces inside this chunk's own vertical extent. The roof of
           the rock fill above is not a route through this room. */
        var loY = oy - 0.5, hiY = oy + W.CH;
        var nodes = [];
        for (var x = ox + 0.5; x < ox + W.CW; x += STEP_X) {
          var tops = surfaceHeights(local, x);
          for (var t = 0; t < tops.length; t++) {
            if (tops[t] >= loY && tops[t] <= hiY) nodes.push({ x: x, y: tops[t] });
          }
        }
        if (nodes.length < 4) continue;

        /* Sanity: if the chunk cannot be crossed at all, there is nothing to report. */
        if (!crosses(nodes, ox, W.CW, function () { return false; })) continue;

        for (var e = 0; e < here.length; e++) {
          var foe = here[e];
          var skippable = crosses(nodes, ox, W.CW, (function (f) {
            return function (n) { return inThreat(f, n.x, n.y); };
          })(foe));
          if (skippable) {
            reports.push({
              chunk: cx + ',' + cy,
              enemy: foe.type,
              at: (foe.x - ox).toFixed(1) + ',' + (foe.y - oy).toFixed(1),
              note: 'crossable without entering its reach'
            });
          }
        }
      }
    }

    if (!opts.keep) for (var t2 = 0; t2 < got.temp.length; t2++) P.World.disposeChunk(got.temp[t2]);

    V.bypasses = reports;
    if (reports.length) {
      console.warn('CYBERVANIA layout: ' + reports.length + ' encounter(s) can be skipped entirely');
      console.table(reports);
    } else {
      console.log('CYBERVANIA layout: every ground encounter has to be dealt with');
    }
    return reports;
  };

  /* ==========================================================================
     REACHABILITY

     The counterweight to the bypass check. That one fails a level for being too
     connected; this one fails it for being too little. It floods the whole authored
     region from the spawn point with the same movement model and reports what R-17 can
     actually stand on — which is how a one-way drop into a sealed chamber gets caught
     before a player finds it.
     ========================================================================== */
  V.reach = function (opts) {
    opts = opts || {};
    var got = collectAll();
    var boxes = got.boxes, W = P.World;

    var start = P.Authored.spawns.start;
    if (!start) { console.warn('CYBERVANIA reach: no start spawn'); return null; }

    /* Sample every column the authored region covers. */
    var minX = Infinity, maxX = -Infinity;
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].x < minX) minX = boxes[i].x;
      if (boxes[i].x + boxes[i].w > maxX) maxX = boxes[i].x + boxes[i].w;
    }
    var nodes = [];
    for (var x = minX + 0.5; x < maxX; x += STEP_X) {
      var tops = surfaceHeights(boxes, x);
      for (var t = 0; t < tops.length; t++) nodes.push({ x: x, y: tops[t] });
    }

    /* Seed: the surface under the spawn. */
    var seed = -1, best = Infinity;
    for (i = 0; i < nodes.length; i++) {
      var d = Math.abs(nodes[i].x - start.x) + Math.abs(nodes[i].y - start.y) * 2;
      if (nodes[i].y <= start.y + 1 && d < best) { best = d; seed = i; }
    }
    if (seed < 0) { console.warn('CYBERVANIA reach: spawn is not above a surface'); return null; }

    var seen = new Array(nodes.length), queue = [seed];
    seen[seed] = true;
    while (queue.length) {
      var a = nodes[queue.pop()];
      for (var j = 0; j < nodes.length; j++) {
        if (seen[j]) continue;
        var b = nodes[j];
        var dx = Math.abs(b.x - a.x), dy = b.y - a.y;
        if (dy >= -DROP_MAX && dy <= RISE_SURE && dx <= spanFor(dy, RISE_SURE)) { seen[j] = true; queue.push(j); }
      }
    }

    /* Summarise per chunk: how much of each authored room is standable-and-reachable. */
    var per = {};
    for (i = 0; i < nodes.length; i++) {
      var cx = Math.floor(nodes[i].x / W.CW);
      /* Inverse of W.chunkOriginY (oy = -(cy+1)*CH). Rounding instead of this puts every
         surface in the upper third of a room into the chunk above it. */
      var cy = Math.ceil(-nodes[i].y / W.CH) - 1;
      var k = cx + ',' + cy;
      if (!P.Authored.has(cx, cy)) continue;
      if (!per[k]) per[k] = { chunk: k, surfaces: 0, reached: 0 };
      per[k].surfaces++;
      if (seen[i]) per[k].reached++;
    }

    var rows = [], stranded = [];
    for (var key in per) {
      var r = per[key];
      r.pct = Math.round(r.reached / r.surfaces * 100) + '%';
      rows.push(r);
      if (r.reached === 0) stranded.push(key);
    }
    rows.sort(function (m, n) { return m.chunk < n.chunk ? -1 : 1; });

    if (!opts.keep) for (var t2 = 0; t2 < got.temp.length; t2++) P.World.disposeChunk(got.temp[t2]);

    V.reachable = rows;
    if (stranded.length) {
      console.warn('CYBERVANIA reach: ' + stranded.length +
                   ' authored chunk(s) unreachable from the spawn: ' + stranded.join(' '));
    } else {
      console.log('CYBERVANIA reach: every authored chunk is reachable from the spawn');
    }
    console.table(rows);
    return rows;
  };

  V.all = function () {
    var a = V.run(), b = V.bypass(), c = V.reach() || [];
    var stranded = c.filter(function (r) { return r.reached === 0; });
    return { clearance: a.length, skippable: b.length, stranded: stranded.length };
  };

  V.summary = function () {
    var p = V.problems || V.run();
    if (!p.length) return 'clearance OK';
    return p.length + ' problem(s): ' + p.slice(0, 6).map(function (q) {
      return q.chunk + ' y' + q.surfaceY + ' clr' + q.clearance;
    }).join(', ');
  };

})(window.PROTO = window.PROTO || {});
