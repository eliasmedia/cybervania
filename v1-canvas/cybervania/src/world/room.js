/* CYBERVANIA — world/room.js
   Room model and registry. Rooms are ASCII tilemaps in maps/*.js plus a list of
   objects. Terrain is baked to an offscreen canvas per layer and re-baked only when
   the geometry actually changes (a breakable tile destroyed, a barrier cut). */
(function (CV) {
  'use strict';

  var T = CV.Tiles, G = CV.Gfx, U = CV.Util, TS = 16;

  var registry = {};
  var Rooms = CV.Rooms = {
    defs: registry,
    add: function (def) {
      if (registry[def.id]) console.warn('CYBERVANIA: duplicate room id', def.id);
      registry[def.id] = def;
      return def;
    },
    get: function (id) { return registry[id]; },
    ids: function () { return Object.keys(registry); }
  };

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function Room(def) {
    this.def = def;
    this.id = def.id;
    this.region = def.region;
    this.name = def.name || def.id;
    this.seed = hashStr(def.id);
    this.music = def.music || def.region;

    /* Rows are stored as mutable char arrays so terrain can be destroyed. */
    this.rows = [];
    var maxW = 0;
    for (var i = 0; i < def.tiles.length; i++) maxW = Math.max(maxW, def.tiles[i].length);
    for (var y = 0; y < def.tiles.length; y++) {
      var row = def.tiles[y].split('');
      while (row.length < maxW) row.push(' ');
      this.rows.push(row);
    }
    /* Pad every room out to at least one screen. Rows are appended at the bottom and
       columns at the right, so no authored coordinate ever shifts. Without this a
       short room leaves the world visibly ending in mid-air. */
    var MINW = Math.ceil(CV.W / TS), MINH = Math.ceil(CV.H / TS);
    if (maxW < MINW) {
      for (var py = 0; py < this.rows.length; py++) {
        while (this.rows[py].length < MINW) this.rows[py].push('#');
      }
      maxW = MINW;
    }
    while (this.rows.length < MINH) {
      var fill = [];
      for (var fx = 0; fx < maxW; fx++) fill.push('#');
      this.rows.push(fill);
    }

    this.w = maxW;
    this.h = this.rows.length;
    this.pw = this.w * TS;
    this.ph = this.h * TS;

    /* Carve door openings. A door declares "there is a passage here", so the tiles it
       covers are cleared — including one tile of clearance toward the room interior,
       which is what makes an edge door actually enterable rather than a sealed alcove. */
    var objs = def.objects || [];
    for (var i2 = 0; i2 < objs.length; i2++) {
      if (objs[i2].t !== 'door') continue;
      this.carveDoor(objs[i2]);
    }

    this.baked = [null, null];
    this.lights = null;
    this.opened = {};              // gate flags resolved when the room is entered
    this.objects = [];
    this.entities = [];
    this.dirty = true;
  }

  /* Clear the door's own tiles, then step toward the room's interior until open
     space is reached (up to 3 tiles), so a door cut into a floor or an outer wall
     connects to somewhere the player can actually stand. */
  Room.prototype.carveDoor = function (d) {
    var x0 = d.x | 0, y0 = d.y | 0, w = d.w || 1, h = d.h || 1;
    var x, y;
    for (y = y0; y < y0 + h; y++) {
      for (x = x0; x < x0 + w; x++) {
        if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.rows[y][x] = ' ';
      }
    }

    /* Which way is "inward"? Whichever room edge this door is sitting on. */
    var dx = 0, dy = 0;
    if (x0 <= 0) dx = 1;
    else if (x0 + w >= this.w) dx = -1;
    else if (y0 <= 0) dy = 1;
    else if (y0 + h >= this.h) dy = -1;
    if (!dx && !dy) return;

    for (var step = 1; step <= 3; step++) {
      var clear = true;
      for (y = y0; y < y0 + h; y++) {
        for (x = x0; x < x0 + w; x++) {
          var nx = x + dx * step, ny = y + dy * step;
          if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
          if (this.rows[ny][nx] !== ' ') { this.rows[ny][nx] = ' '; clear = false; }
        }
      }
      if (clear) break;
    }
  };

  Room.prototype.at = function (tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return '#';   // world edge is solid
    return this.rows[ty][tx];
  };

  Room.prototype.set = function (tx, ty, ch) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return;
    this.rows[ty][tx] = ch;
    this.baked[0] = this.baked[1] = null;
    this.lights = null;
  };

  Room.prototype.solidTile = function (tx, ty, layer) {
    return T.isSolid(this.at(tx, ty), layer, this.opened);
  };

  /* World-pixel solidity query, used by particles and simple probes. */
  Room.prototype.solidAt = function (px, py, layer) {
    layer = layer === undefined ? (CV.DataSphere ? CV.DataSphere.layer : 0) : layer;
    var ch = this.at(Math.floor(px / TS), Math.floor(py / TS));
    if (T.isOneWay(ch)) return false;
    return T.isSolid(ch, layer, this.opened);
  };

  Room.prototype.hazardAt = function (px, py, layer) {
    return T.isHazard(this.at(Math.floor(px / TS), Math.floor(py / TS)), layer);
  };

  Room.prototype.tileAtPx = function (px, py) {
    return this.at(Math.floor(px / TS), Math.floor(py / TS));
  };

  /* Destroy a breakable tile (Seismic Slam). Also breaks the 8 neighbours that are
     breakable, so one slam opens a hole rather than a 1-tile keyhole. */
  Room.prototype.breakAt = function (tx, ty) {
    var broke = 0;
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (T.def(this.at(tx + dx, ty + dy)).id === 'breakable') {
          this.set(tx + dx, ty + dy, ' ');
          CV.FX.debris((tx + dx) * TS + 8, (ty + dy) * TS + 14, 6, CV.Palette.c.amberDim);
          broke++;
        }
      }
    }
    return broke;
  };

  Room.prototype.bake = function (layer) {
    if (!this.baked[layer]) this.baked[layer] = T.bake(this, layer);
    return this.baked[layer];
  };

  Room.prototype.getLights = function () {
    if (!this.lights) this.lights = T.collectLights(this);
    return this.lights;
  };

  /* Grapple anchor lookup: nearest 'G' tile or anchor prop within range and roughly
     in the aimed direction. Returns world coords or null. */
  Room.prototype.findAnchor = function (px, py, dirX, dirY, range, allowData) {
    var best = null, bestScore = -1;
    var t0x = Math.max(0, Math.floor((px - range) / TS));
    var t1x = Math.min(this.w - 1, Math.floor((px + range) / TS));
    var t0y = Math.max(0, Math.floor((py - range) / TS));
    var t1y = Math.min(this.h - 1, Math.floor((py + range) / TS));
    for (var ty = t0y; ty <= t1y; ty++) {
      for (var tx = t0x; tx <= t1x; tx++) {
        var ch = this.at(tx, ty);
        var d = T.def(ch);
        var isAnchor = d.anchor;
        /* Cipher can also latch onto data-walls: anchors invisible to other frames. */
        if (!isAnchor && allowData && d.id === 'dataWall') isAnchor = true;
        if (!isAnchor) continue;
        var ax = tx * TS + 8, ay = ty * TS + 8;
        var dx = ax - px, dy = ay - py;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > range || dist < 6) continue;
        /* Prefer anchors in the direction the player is aiming. */
        var dot = (dx / dist) * dirX + (dy / dist) * dirY;
        if (dot < 0.30) continue;
        var score = dot * 2 - dist / range;
        if (score > bestScore) { bestScore = score; best = { x: ax, y: ay }; }
      }
    }
    return best;
  };

  /* Line-of-sight test on the tile grid — used by anchors, enemy aggro and turrets. */
  Room.prototype.lineClear = function (x0, y0, x1, y1, layer) {
    var dx = x1 - x0, dy = y1 - y0;
    var steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6);
    if (steps <= 0) return true;
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      if (this.solidAt(x0 + dx * t, y0 + dy * t, layer)) return false;
    }
    return true;
  };

  Room.prototype.render = function (ctx, cam, layer) {
    var img = this.bake(layer);
    ctx.drawImage(img, -cam.x | 0, -cam.y | 0);
  };

  CV.Room = Room;

  /* Instantiate a room definition. Rooms are cached so that returning to a room
     preserves destroyed terrain and collected pickups within a session. */
  var live = {};
  Rooms.instance = function (id) {
    if (live[id]) return live[id];
    var def = registry[id];
    if (!def) { console.error('CYBERVANIA: unknown room', id); return null; }
    return (live[id] = new Room(def));
  };
  Rooms.reset = function () { live = {}; };
  Rooms.live = function () { return live; };

  /* Find a named spawn point inside a room definition. */
  Rooms.spawnPoint = function (roomDef, name) {
    var objs = roomDef.objects || [];
    for (var i = 0; i < objs.length; i++) {
      if (objs[i].t === 'spawn' && objs[i].name === name) return objs[i];
    }
    for (var j = 0; j < objs.length; j++) if (objs[j].t === 'spawn') return objs[j];
    return null;
  };

})(window.CV = window.CV || {});
