/* CYBERVANIA — world/tiles.js
   Tile vocabulary and tile rendering. Solidity is a function of (tile, layer): the
   same room is genuinely different geometry in the Data Sphere, not a colour filter
   (GAME_DESIGN §1, pillar 3). */
(function (CV) {
  'use strict';

  var T = CV.Tiles = {}, C = CV.Palette.c, G = CV.Gfx, U = CV.Util;

  /* Layer constants. */
  T.PHYS = 0;
  T.DATA = 1;

  /* Tile definitions, keyed by the character used in map files.
       solid   : [physical, data]
       hazard  : damage per contact (0 = none)
       oneway  : only blocks from above
       gate    : which tool removes it
  */
  var D = T.defs = {
    ' ': { id: 'empty', solid: [0, 0] },
    '.': { id: 'decor', solid: [0, 0], decor: 1 },
    '-': { id: 'panel', solid: [0, 0], decor: 2 },
    '*': { id: 'lamp',  solid: [0, 0], decor: 3, light: 1 },

    '#': { id: 'solid', solid: [1, 1] },
    '=': { id: 'platform', solid: [1, 1], oneway: 1 },

    '^': { id: 'spike', solid: [0, 0], hazard: 1, dir: 'up' },
    'v': { id: 'spikeDown', solid: [0, 0], hazard: 1, dir: 'down' },
    '~': { id: 'coolant', solid: [0, 0], hazard: 1, liquid: 1 },
    'w': { id: 'water', solid: [0, 0], liquid: 1, swim: 1 },

    /* Duality tiles — the Data Sphere's whole reason to exist. */
    'D': { id: 'dataWall', solid: [1, 0], gate: 'cipher' },   // solid physically, open in data
    'd': { id: 'dataFloor', solid: [0, 1] },                  // only exists in the data layer
    'p': { id: 'physOnly', solid: [1, 0] },                   // ruined in ATLAS's records

    /* Gated terrain. */
    'B': { id: 'breakable', solid: [1, 1], gate: 'slam' },
    'E': { id: 'barrier', solid: [1, 1], gate: 'emp' },

    /* Interaction terrain. */
    'G': { id: 'anchor', solid: [0, 0], anchor: 1 },
    'o': { id: 'rail', solid: [0, 0], rail: 1 },
    'C': { id: 'convR', solid: [1, 1], conveyor: 1 },
    'c': { id: 'convL', solid: [1, 1], conveyor: -1 }
  };

  T.def = function (ch) { return D[ch] || D[' ']; };

  T.isSolid = function (ch, layer, opened) {
    var d = D[ch];
    if (!d) return false;
    if (d.gate && opened && opened[d.gate]) return false;
    return !!d.solid[layer];
  };

  T.isOneWay = function (ch) { var d = D[ch]; return !!(d && d.oneway); };
  T.isHazard = function (ch, layer) {
    var d = D[ch];
    if (!d || !d.hazard) return false;
    /* Coolant and spikes do not exist in ATLAS's record of the room — the data layer
       is the *design*, not the state of repair. This is a real routing advantage. */
    return layer === T.PHYS;
  };

  /* --------------------------------------------------------------------------
     Rendering. Tiles are baked into a per-room canvas once, so the entire static
     world costs one drawImage per frame.
     -------------------------------------------------------------------------- */

  var TS = 16;

  function neighbourMask(room, tx, ty, layer) {
    /* 4-bit mask: 1=up 2=right 4=down 8=left, set when that neighbour is also solid.
       Drives edge highlights so blocks read as connected masses, not a grid. */
    var m = 0;
    if (room.solidTile(tx, ty - 1, layer)) m |= 1;
    if (room.solidTile(tx + 1, ty, layer)) m |= 2;
    if (room.solidTile(tx, ty + 1, layer)) m |= 4;
    if (room.solidTile(tx - 1, ty, layer)) m |= 8;
    return m;
  }

  T.bake = function (room, layer) {
    var pal = layer === T.DATA ? CV.Palette.data : CV.Palette.region(room.region);
    var c = G.makeCanvas(room.w * TS, room.h * TS);
    var x = G.ctxOf(c);
    var rng = CV.rngArt.fork(room.seed + layer * 7717);

    for (var ty = 0; ty < room.h; ty++) {
      for (var tx = 0; tx < room.w; tx++) {
        var ch = room.at(tx, ty);
        var d = D[ch];
        if (!d) continue;
        var px = tx * TS, py = ty * TS;
        drawTile(x, room, d, ch, tx, ty, px, py, layer, pal, rng);
      }
    }
    return c;
  };

  function drawTile(x, room, d, ch, tx, ty, px, py, layer, pal, rng) {
    var isData = layer === T.DATA;

    switch (d.id) {
      case 'solid': case 'convR': case 'convL': {
        var m = neighbourMask(room, tx, ty, layer);
        if (isData) {
          /* Data layer: wireframe box with a dark fill. ATLAS's schematic reading. */
          x.fillStyle = pal.solid; x.fillRect(px, py, TS, TS);
          x.strokeStyle = CV.Palette.alpha(pal.solidEdge, .55);
          x.lineWidth = 1;
          if (!(m & 1)) { x.beginPath(); x.moveTo(px, py + .5); x.lineTo(px + TS, py + .5); x.stroke(); }
          if (!(m & 4)) { x.beginPath(); x.moveTo(px, py + TS - .5); x.lineTo(px + TS, py + TS - .5); x.stroke(); }
          if (!(m & 8)) { x.beginPath(); x.moveTo(px + .5, py); x.lineTo(px + .5, py + TS); x.stroke(); }
          if (!(m & 2)) { x.beginPath(); x.moveTo(px + TS - .5, py); x.lineTo(px + TS - .5, py + TS); x.stroke(); }
          x.fillStyle = CV.Palette.alpha(pal.solidEdge, .12);
          x.fillRect(px + 4, py + 4, 8, 8);
          break;
        }
        // body
        x.fillStyle = pal.solid;
        x.fillRect(px, py, TS, TS);
        // internal texture — a few darker chips, deterministic per tile
        var n = rng.int(2, 5);
        for (var i = 0; i < n; i++) {
          x.fillStyle = CV.Palette.alpha('#000000', .16);
          x.fillRect(px + rng.int(1, 12), py + rng.int(2, 13), rng.int(2, 5), 1);
        }
        // lit top face when nothing above — the single most important readability cue
        if (!(m & 1)) {
          x.fillStyle = pal.solidLit; x.fillRect(px, py, TS, 3);
          x.fillStyle = pal.solidEdge; x.fillRect(px, py, TS, 1);
        }
        if (!(m & 4)) { x.fillStyle = CV.Palette.alpha('#000000', .45); x.fillRect(px, py + TS - 2, TS, 2); }
        if (!(m & 8)) { x.fillStyle = CV.Palette.alpha(pal.solidLit, .5); x.fillRect(px, py, 1, TS); }
        if (!(m & 2)) { x.fillStyle = CV.Palette.alpha('#000000', .35); x.fillRect(px + TS - 1, py, 1, TS); }

        if (d.conveyor) {
          x.fillStyle = pal.key;
          for (var k = 0; k < 4; k++) x.fillRect(px + 1 + k * 4, py + 1, 2, 1);
        }
        break;
      }

      case 'platform': {
        x.fillStyle = isData ? CV.Palette.alpha(pal.solidEdge, .35) : pal.solid;
        x.fillRect(px, py, TS, 5);
        x.fillStyle = pal.solidEdge;
        x.fillRect(px, py, TS, 1);
        x.fillStyle = CV.Palette.alpha('#000000', .5);
        x.fillRect(px, py + 4, TS, 1);
        // support brackets
        x.fillStyle = CV.Palette.alpha(pal.solid, .8);
        x.fillRect(px + 2, py + 5, 2, 3); x.fillRect(px + 12, py + 5, 2, 3);
        break;
      }

      case 'dataWall': {
        if (isData) {
          /* Open in the data layer: only a faint outline remains. */
          x.strokeStyle = CV.Palette.alpha(C.cyan, .22);
          x.strokeRect(px + .5, py + .5, TS - 1, TS - 1);
        } else {
          x.fillStyle = CV.Palette.mix(pal.solid, C.cyanDim, .35);
          x.fillRect(px, py, TS, TS);
          x.fillStyle = CV.Palette.alpha(C.cyan, .18);
          for (var s = 0; s < TS; s += 4) x.fillRect(px, py + s, TS, 1);
          x.strokeStyle = CV.Palette.alpha(C.cyan, .45);
          x.strokeRect(px + .5, py + .5, TS - 1, TS - 1);
        }
        break;
      }

      case 'dataFloor': {
        if (!isData) {
          x.fillStyle = CV.Palette.alpha(C.cyan, .10);
          x.fillRect(px + 6, py + 6, 4, 4);
        } else {
          x.fillStyle = CV.Palette.alpha(C.cyan, .16);
          x.fillRect(px, py, TS, TS);
          x.strokeStyle = C.cyan;
          x.lineWidth = 1;
          x.strokeRect(px + .5, py + .5, TS - 1, TS - 1);
          x.fillStyle = CV.Palette.alpha(C.cyanGlow, .5);
          x.fillRect(px, py, TS, 1);
        }
        break;
      }

      case 'physOnly': {
        if (!isData) {
          x.fillStyle = CV.Palette.mix(pal.solid, C.rust, .3);
          x.fillRect(px, py, TS, TS);
          x.fillStyle = pal.solidLit; x.fillRect(px, py, TS, 2);
          x.fillStyle = CV.Palette.alpha('#000', .4); x.fillRect(px, py + TS - 2, TS, 2);
        }
        break;
      }

      case 'breakable': {
        x.fillStyle = CV.Palette.mix(pal.solid, C.amberDim, .35);
        x.fillRect(px, py, TS, TS);
        x.fillStyle = pal.solidLit; x.fillRect(px, py, TS, 2);
        // fracture lines + amber stencil: reads as "hit this"
        x.strokeStyle = CV.Palette.alpha(C.amber, .55); x.lineWidth = 1;
        x.beginPath();
        x.moveTo(px + 2, py + 3); x.lineTo(px + 7, py + 8); x.lineTo(px + 4, py + 14);
        x.moveTo(px + 9, py + 2); x.lineTo(px + 12, py + 9); x.lineTo(px + 14, py + 13);
        x.stroke();
        x.fillStyle = CV.Palette.alpha(C.amber, .25);
        x.fillRect(px + 1, py + 1, 3, 1); x.fillRect(px + 12, py + 14, 3, 1);
        break;
      }

      case 'barrier': {
        x.fillStyle = CV.Palette.alpha(pal.key, .16);
        x.fillRect(px, py, TS, TS);
        x.strokeStyle = CV.Palette.alpha(pal.key, .7);
        x.lineWidth = 1;
        // hex lattice
        for (var hy = 0; hy < TS; hy += 8) {
          x.beginPath();
          x.moveTo(px + 0, py + hy + 4); x.lineTo(px + 4, py + hy);
          x.lineTo(px + 12, py + hy); x.lineTo(px + 16, py + hy + 4);
          x.stroke();
        }
        break;
      }

      case 'spike': case 'spikeDown': {
        var up = d.id === 'spike';
        x.fillStyle = isData ? CV.Palette.alpha(C.red, .12) : C.steelDark;
        for (var t = 0; t < 4; t++) {
          var sxp = px + t * 4;
          x.beginPath();
          if (up) { x.moveTo(sxp, py + TS); x.lineTo(sxp + 2, py + 3); x.lineTo(sxp + 4, py + TS); }
          else { x.moveTo(sxp, py); x.lineTo(sxp + 2, py + TS - 3); x.lineTo(sxp + 4, py); }
          x.closePath(); x.fill();
        }
        if (!isData) {
          x.fillStyle = C.red;
          x.fillRect(px, up ? py + TS - 2 : py, TS, 2);
          x.fillStyle = CV.Palette.alpha(C.chromeLit, .6);
          for (var t2 = 0; t2 < 4; t2++) x.fillRect(px + t2 * 4 + 2, up ? py + 3 : py + TS - 4, 1, 3);
        }
        break;
      }

      case 'coolant': case 'water': {
        var col = d.id === 'coolant' ? C.green : '#2a6a9a';
        x.fillStyle = CV.Palette.alpha(col, isData ? .10 : .34);
        x.fillRect(px, py, TS, TS);
        if (!room.solidTile(tx, ty - 1, layer) && room.at(tx, ty - 1) !== ch) {
          x.fillStyle = CV.Palette.alpha(col, .8);
          x.fillRect(px, py, TS, 1);
        }
        break;
      }

      case 'anchor': {
        x.fillStyle = C.steelDark;
        x.fillRect(px + 5, py + 4, 6, 6);
        x.fillStyle = CV.Palette.alpha(C.amber, .85);
        x.fillRect(px + 7, py + 6, 2, 2);
        x.strokeStyle = CV.Palette.alpha(C.amber, .35);
        x.strokeRect(px + 4.5, py + 3.5, 7, 7);
        break;
      }

      case 'rail': {
        x.fillStyle = CV.Palette.alpha(C.violet, .5);
        x.fillRect(px, py + 7, TS, 2);
        x.fillStyle = CV.Palette.alpha(C.violet, .25);
        x.fillRect(px, py + 5, TS, 6);
        break;
      }

      case 'decor': {
        x.fillStyle = CV.Palette.alpha(pal.solidLit, .22);
        x.fillRect(px + rng.int(0, 6), py + rng.int(0, 6), rng.int(4, 12), rng.int(3, 9));
        break;
      }

      case 'panel': {
        x.fillStyle = CV.Palette.mix(pal.solid, '#000000', .5);
        x.fillRect(px, py, TS, TS);
        x.fillStyle = CV.Palette.alpha(pal.solidLit, .2);
        x.fillRect(px + 1, py + 1, TS - 2, 1);
        x.fillRect(px + 1, py + 1, 1, TS - 2);
        if (rng.chance(.25)) {
          x.fillStyle = CV.Palette.alpha(pal.key, .35);
          x.fillRect(px + 4, py + 6, 8, 1);
        }
        break;
      }

      case 'lamp': {
        x.fillStyle = C.steelDark;
        x.fillRect(px + 5, py, 6, 4);
        x.fillStyle = pal.key;
        x.fillRect(px + 6, py + 4, 4, 2);
        break;
      }
    }
  }

  /* Lamps and neon are drawn into the additive light buffer separately so they
     actually illuminate rather than just being bright pixels. */
  T.collectLights = function (room) {
    var out = [];
    for (var ty = 0; ty < room.h; ty++) {
      for (var tx = 0; tx < room.w; tx++) {
        var d = D[room.at(tx, ty)];
        if (d && d.light) out.push({ x: tx * TS + 8, y: ty * TS + 8, r: 46 });
      }
    }
    return out;
  };

})(window.CV = window.CV || {});
