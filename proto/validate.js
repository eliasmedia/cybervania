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

  /* Build every authored chunk in isolation and collect its colliders in world space. */
  function collectAll() {
    var W = P.World, out = [];
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
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i][0] + ',' + keys[i][1];
      if (W.chunks[k]) W.disposeChunk(k);
      W.buildChunk(keys[i][0], keys[i][1]);
      built.push(k);
    }
    for (var c in W.chunks) {
      var ch = W.chunks[c];
      if (!P.Authored.has(ch.cx, ch.cy)) continue;
      for (var j = 0; j < ch.colliders.length; j++) {
        var o = ch.colliders[j];
        out.push({ x: o.x, y: o.y, w: o.w, h: o.h, chunk: ch.cx + ',' + ch.cy });
      }
    }
    return { boxes: out, temp: built };
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

  V.summary = function () {
    var p = V.problems || V.run();
    if (!p.length) return 'clearance OK';
    return p.length + ' problem(s): ' + p.slice(0, 6).map(function (q) {
      return q.chunk + ' y' + q.surfaceY + ' clr' + q.clearance;
    }).join(', ');
  };

})(window.PROTO = window.PROTO || {});
