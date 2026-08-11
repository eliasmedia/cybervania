/* CYBERVANIA — world/collision.js
   Swept, axis-separated AABB against the tile grid, with the two tricks that make
   platformers feel fair: corner correction on upward clips, and ledge nudging on
   horizontal clips. Bodies are {x,y,w,h,vx,vy} with x,y at the top-left. */
(function (CV) {
  'use strict';

  var T = CV.Tiles, U = CV.Util, TS = 16;
  var Col = CV.Collision = {};

  var CORNER = 4;    // px of upward corner-clip we forgive
  var LEDGE  = 3;    // px of head-bump we slide around

  function solid(room, tx, ty, layer) {
    return T.isSolid(room.at(tx, ty), layer, room.opened);
  }

  function oneWay(room, tx, ty) { return T.isOneWay(room.at(tx, ty)); }

  /* Does the box overlap any blocking tile? `fromAbove` enables one-way platforms. */
  function overlaps(room, x, y, w, h, layer, fromAbove, prevBottom) {
    var t0x = Math.floor(x / TS), t1x = Math.floor((x + w - 0.001) / TS);
    var t0y = Math.floor(y / TS), t1y = Math.floor((y + h - 0.001) / TS);
    for (var ty = t0y; ty <= t1y; ty++) {
      for (var tx = t0x; tx <= t1x; tx++) {
        var ch = room.at(tx, ty);
        if (oneWay(room, tx, ty)) {
          if (!fromAbove) continue;
          var top = ty * TS;
          /* Only block if we were fully above the platform surface last frame.
             Tolerance of 1px keeps you from falling through when running along it. */
          if (prevBottom > top + 1) continue;
          if (y + h <= top) continue;
          return true;
        }
        if (T.isSolid(ch, layer, room.opened)) return true;
      }
    }
    return false;
  }

  Col.overlaps = overlaps;

  Col.solidBox = function (room, x, y, w, h, layer) {
    return overlaps(room, x, y, w, h, layer, false, -1e9);
  };

  /* Move a body through the world. Mutates body.x/y/vx/vy and sets contact flags. */
  Col.move = function (body, room, dt, layer) {
    body.grounded = false;
    body.ceiling = false;
    body.wallDir = 0;
    body.hitX = false;
    body.hitY = false;

    var dx = body.vx * dt, dy = body.vy * dt;

    /* Sub-step so a dash (up to ~8px per 120Hz tick) can never tunnel a 16px wall. */
    var steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
    var sdx = dx / steps, sdy = dy / steps;

    for (var s = 0; s < steps; s++) {
      // ---- X ----
      if (sdx !== 0) {
        var nx = body.x + sdx;
        if (overlaps(room, nx, body.y, body.w, body.h, layer, false, -1e9)) {
          /* Ledge nudge: if only the top few pixels are blocked and the space just
             above is free, lift the body over. Stops "caught on a 1px lip" moments. */
          var nudged = false;
          if (!body.noNudge) {
            for (var n = 1; n <= LEDGE; n++) {
              if (!overlaps(room, nx, body.y - n, body.w, body.h, layer, false, -1e9) &&
                  !overlaps(room, body.x, body.y - n, body.w, body.h, layer, false, -1e9)) {
                body.y -= n; body.x = nx; nudged = true; break;
              }
            }
          }
          if (!nudged) {
            /* Snap flush against the wall so wall-slide/cling reads exactly. */
            if (sdx > 0) body.x = Math.floor((body.x + body.w) / TS) * TS + TS - body.w - 0.01;
            else body.x = Math.ceil(body.x / TS) * TS;
            /* Re-test: snapping can still overlap in tight diagonal cases. */
            if (overlaps(room, body.x, body.y, body.w, body.h, layer, false, -1e9)) {
              body.x -= sdx;
            }
            body.wallDir = sdx > 0 ? 1 : -1;
            body.hitX = true;
            body.vx = 0;
            sdx = 0;
          }
        } else body.x = nx;
      }

      // ---- Y ----
      if (sdy !== 0) {
        var prevBottom = body.y + body.h;
        var ny = body.y + sdy;
        var falling = sdy > 0;
        if (overlaps(room, body.x, ny, body.w, body.h, layer, falling && !body.dropThrough, prevBottom)) {
          if (falling) {
            body.y = Math.floor((body.y + body.h) / TS) * TS + TS - body.h - 0.01;
            /* Landing snap can overshoot into the tile on steep frames; back off. */
            var guard = 0;
            while (overlaps(room, body.x, body.y, body.w, body.h, layer, false, -1e9) && guard++ < 20) {
              body.y -= 1;
            }
            body.grounded = true;
          } else {
            /* Corner correction: jumping up beside a corner should slip past it,
               not stop dead. Try shifting horizontally by up to CORNER px. */
            var fixed = false;
            for (var c = 1; c <= CORNER; c++) {
              for (var dir = -1; dir <= 1; dir += 2) {
                var tx2 = body.x + dir * c;
                if (!overlaps(room, tx2, ny, body.w, body.h, layer, false, -1e9)) {
                  body.x = tx2; body.y = ny; fixed = true; break;
                }
              }
              if (fixed) break;
            }
            if (!fixed) {
              body.y = Math.ceil(body.y / TS) * TS;
              var g2 = 0;
              while (overlaps(room, body.x, body.y, body.w, body.h, layer, false, -1e9) && g2++ < 20) {
                body.y += 1;
              }
              body.ceiling = true;
              body.vy = 0;
              sdy = 0;
            }
          }
          if (body.grounded) { body.vy = 0; sdy = 0; }
          body.hitY = true;
        } else body.y = ny;
      }
    }

    /* Grounded probe — a 1px sensor under the feet, so coyote time and landing
       detection do not depend on having collided this exact frame. */
    if (!body.grounded && body.vy >= 0) {
      if (overlaps(room, body.x, body.y + 1, body.w, body.h, layer, !body.dropThrough,
                   body.y + body.h)) {
        body.grounded = true;
      }
    }
    /* Wall probe on both sides — needed for wall-slide even at zero velocity. */
    if (!body.wallDir) {
      if (overlaps(room, body.x + 1.5, body.y, body.w, body.h, layer, false, -1e9)) body.wallDir = 1;
      else if (overlaps(room, body.x - 1.5, body.y, body.w, body.h, layer, false, -1e9)) body.wallDir = -1;
    }

    /* Conveyor belts add to ground velocity without touching the player's own vx —
       the Factory's signature mechanic. */
    if (body.grounded) {
      var ch = room.at(Math.floor((body.x + body.w / 2) / TS),
                       Math.floor((body.y + body.h + 2) / TS));
      var d = T.def(ch);
      body.conveyor = d.conveyor || 0;
    } else body.conveyor = 0;
  };

  /* Is a body standing in / touching a hazard tile? Sampled at 5 points rather than
     the full box so a single pixel of overlap does not kill. */
  Col.hazardHit = function (body, room, layer) {
    var pts = [
      [body.x + body.w * .5, body.y + body.h - 1],
      [body.x + 2, body.y + body.h - 2],
      [body.x + body.w - 2, body.y + body.h - 2],
      [body.x + body.w * .5, body.y + 1],
      [body.x + body.w * .5, body.y + body.h * .5]
    ];
    for (var i = 0; i < pts.length; i++) {
      if (room.hazardAt(pts[i][0], pts[i][1], layer)) return true;
    }
    return false;
  };

  /* Push a body out of terrain it is embedded in — used after a layer switch or a
     transformation that grew the hurtbox. Returns false if there is nowhere to go. */
  Col.resolveOverlap = function (body, room, layer) {
    if (!overlaps(room, body.x, body.y, body.w, body.h, layer, false, -1e9)) return true;
    for (var r = 1; r <= 26; r++) {
      var cand = [[0, -r], [0, r], [-r, 0], [r, 0], [-r, -r], [r, -r], [-r, r], [r, r]];
      for (var i = 0; i < cand.length; i++) {
        var nx = body.x + cand[i][0], ny = body.y + cand[i][1];
        if (!overlaps(room, nx, ny, body.w, body.h, layer, false, -1e9)) {
          body.x = nx; body.y = ny; return true;
        }
      }
    }
    return false;
  };

})(window.CV = window.CV || {});
