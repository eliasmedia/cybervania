/* CYBERVANIA — ui/map.js
   The map is built automatically from the door graph: each room is placed so that
   its connecting door lines up with the neighbour's spawn point. That keeps the map
   correct by construction — adding a room never means hand-tuning coordinates.

   It shows what you have discovered, marks what you could not reach, and is the
   fast-travel interface. */
(function (CV) {
  'use strict';

  var G = CV.Gfx, C = CV.Palette.c, U = CV.Util, In = CV.Input, TS = 16;
  var M = CV.MapUI = {};

  M.layout = null;      // roomId -> {x, y, w, h} in tile units
  M.bounds = null;
  M.camX = 0; M.camY = 0;
  M.scale = 0.45;
  M.travelTarget = 0;
  M.travelMode = false;

  /* --------------------------------------------------------------------------
     LAYOUT — breadth-first from the starting room, aligning doors to spawns.
     -------------------------------------------------------------------------- */
  M.build = function () {
    var layout = {};
    var start = 'und_wake';
    if (!CV.Rooms.get(start)) start = CV.Rooms.ids()[0];
    layout[start] = { x: 0, y: 0 };

    var queue = [start], guard = 0;
    while (queue.length && guard++ < 4000) {
      var id = queue.shift();
      var def = CV.Rooms.get(id);
      if (!def) continue;
      var base = layout[id];
      var objs = def.objects || [];
      for (var i = 0; i < objs.length; i++) {
        var o = objs[i];
        if (o.t !== 'door' || !o.to) continue;
        var target = CV.Rooms.get(o.to);
        if (!target || layout[o.to]) continue;
        var sp = CV.Rooms.spawnPoint(target, o.spawn);
        var sx = sp ? sp.x : 0, sy = sp ? sp.y : 0;
        layout[o.to] = { x: base.x + o.x - sx, y: base.y + o.y - sy };
        queue.push(o.to);
      }
    }

    /* Attach sizes and compute the world bounds. */
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (var rid in layout) {
      var rd = CV.Rooms.get(rid);
      var w = 0;
      for (var r = 0; r < rd.tiles.length; r++) w = Math.max(w, rd.tiles[r].length);
      layout[rid].w = w;
      layout[rid].h = rd.tiles.length;
      layout[rid].region = rd.region;
      layout[rid].name = rd.name;
      minX = Math.min(minX, layout[rid].x);
      minY = Math.min(minY, layout[rid].y);
      maxX = Math.max(maxX, layout[rid].x + w);
      maxY = Math.max(maxY, layout[rid].y + layout[rid].h);
    }
    M.layout = layout;
    M.bounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

    /* Rooms that were never reached by the BFS are unreachable from the start —
       a genuine authoring error, so surface it in the console rather than hiding it. */
    var all = CV.Rooms.ids();
    for (var a = 0; a < all.length; a++) {
      if (!layout[all[a]]) console.warn('CYBERVANIA: room unreachable from start:', all[a]);
    }
  };

  M.centreOnPlayer = function () {
    var cur = CV.World.room && M.layout ? M.layout[CV.World.room.id] : null;
    if (!cur) return;
    M.camX = cur.x + cur.w / 2;
    M.camY = cur.y + cur.h / 2;
  };

  /* --------------------------------------------------------------------------
     MARKERS — what the map knows about a room without spoiling it.
     -------------------------------------------------------------------------- */
  function markersFor(roomId) {
    var def = CV.Rooms.get(roomId);
    var out = { dock: false, tram: false, port: false, boss: false, item: false, locked: false };
    var objs = def.objects || [];
    for (var i = 0; i < objs.length; i++) {
      var o = objs[i];
      if (o.t === 'dock') out.dock = true;
      else if (o.t === 'tram') out.tram = true;
      else if (o.t === 'divePort') out.port = true;
      else if (o.t === 'boss' && !CV.State.flag('boss:' + o.boss)) out.boss = true;
      else if (o.t === 'pickup') {
        var pid = o.id || (o.t + '@' + roomId + ':' + o.x + ',' + o.y);
        if (!CV.State.hasPickup(pid) && !(o.gate && !CV.State.flag(o.gate))) out.item = true;
      }
    }
    /* Does this room contain terrain we currently cannot pass? That is what turns
       the map into a to-do list without ever writing a quest log. */
    for (var y = 0; y < def.tiles.length; y++) {
      var row = def.tiles[y];
      for (var x = 0; x < row.length; x++) {
        var ch = row.charAt(x);
        if (ch === 'B' && !CV.State.rawModule('slam')) out.locked = true;
        else if (ch === 'D' && !CV.State.hasFrame('cipher')) out.locked = true;
        else if (ch === 'E' && !CV.State.rawModule('emp') && !CV.State.rawModule('cutter')) {
          out.locked = true;
        }
      }
    }
    return out;
  }

  /* --------------------------------------------------------------------------
     RENDER
     -------------------------------------------------------------------------- */
  M.render = function (ctx, x, y, w, h) {
    if (!M.layout) M.build();

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.fillStyle = '#03060a';
    ctx.fillRect(x, y, w, h);

    /* Faint grid so empty space still reads as space, not as a void. */
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = C.cyanDim;
    ctx.lineWidth = 1;
    var gs = 16 * M.scale * 4;
    var gx = x - ((M.camX * M.scale) % gs), gy = y - ((M.camY * M.scale) % gs);
    ctx.beginPath();
    for (var lx = gx; lx < x + w; lx += gs) { ctx.moveTo(lx + .5, y); ctx.lineTo(lx + .5, y + h); }
    for (var ly = gy; ly < y + h; ly += gs) { ctx.moveTo(x, ly + .5); ctx.lineTo(x + w, ly + .5); }
    ctx.stroke();
    ctx.globalAlpha = 1;

    var cx = x + w / 2, cy = y + h / 2;
    var s = M.scale;
    var curId = CV.World.room ? CV.World.room.id : null;

    function toScreen(tx, ty) {
      return [cx + (tx - M.camX) * s, cy + (ty - M.camY) * s];
    }

    /* Connections first, so rooms draw over them. */
    ctx.strokeStyle = CV.Palette.alpha(C.cyanDim, .5);
    for (var rid in M.layout) {
      if (!CV.State.isDiscovered(rid)) continue;
      var rl = M.layout[rid];
      var rdef = CV.Rooms.get(rid);
      var objs = rdef.objects || [];
      for (var i = 0; i < objs.length; i++) {
        var o = objs[i];
        if (o.t !== 'door' || !M.layout[o.to]) continue;
        if (!CV.State.isDiscovered(o.to)) continue;
        var t = M.layout[o.to];
        var a = toScreen(rl.x + rl.w / 2, rl.y + rl.h / 2);
        var b = toScreen(t.x + t.w / 2, t.y + t.h / 2);
        ctx.beginPath();
        ctx.moveTo(a[0] | 0, a[1] | 0);
        ctx.lineTo(b[0] | 0, b[1] | 0);
        ctx.stroke();
      }
    }

    /* Rooms. */
    for (var rid2 in M.layout) {
      var l = M.layout[rid2];
      var discovered = CV.State.isDiscovered(rid2);
      if (!discovered) continue;

      var p = toScreen(l.x, l.y);
      var rw = Math.max(3, l.w * s), rh = Math.max(3, l.h * s);
      if (p[0] > x + w || p[0] + rw < x || p[1] > y + h || p[1] + rh < y) continue;

      var region = CV.Regions.get(l.region);
      var isCur = rid2 === curId;

      ctx.fillStyle = CV.Palette.alpha(region.mapColor, isCur ? 0.34 : 0.15);
      ctx.fillRect(p[0] | 0, p[1] | 0, rw | 0, rh | 0);
      G.frame(ctx, p[0], p[1], rw, rh,
              isCur ? C.white : CV.Palette.alpha(region.mapColor, .75), 1);

      var mk = markersFor(rid2);
      var mx = (p[0] + rw / 2) | 0, my = (p[1] + rh / 2) | 0;
      if (mk.dock) { G.rect(ctx, mx - 4, my - 2, 3, 5, C.cyan); G.glow(ctx, mx - 3, my, 6, C.cyan, .5); }
      if (mk.tram) G.rect(ctx, mx + 1, my - 2, 4, 3, C.magenta);
      if (mk.port) G.ring(ctx, mx, my + 3, 2.5, C.cyanGlow, 1);
      if (mk.boss) G.text(ctx, '!', mx - 1, my - 4, C.red, 1);
      if (mk.item) G.rect(ctx, mx + 4, my + 1, 2, 2, C.green);
      if (mk.locked) G.text(ctx, '?', mx + 5, my - 4, C.amber, 1);

      if (isCur) {
        /* Player blip inside the current room, at the real position. */
        var px = l.x + (CV.Player.x / TS), py = l.y + (CV.Player.y / TS);
        var pp = toScreen(px, py);
        if (Math.sin(CV.Engine.realTime * 6) > -0.4) {
          G.rect(ctx, pp[0] - 1, pp[1] - 1, 3, 3, C.white);
          G.glow(ctx, pp[0], pp[1], 9, C.cyan, .7);
        }
      }
    }

    /* Fast-travel selection ring. */
    if (M.travelMode) {
      var trams = M.tramList();
      if (trams.length) {
        var t2 = trams[M.travelTarget % trams.length];
        var tl = M.layout[t2.room];
        if (tl) {
          var tp = toScreen(tl.x + tl.w / 2, tl.y + tl.h / 2);
          var r = 8 + Math.sin(CV.Engine.realTime * 5) * 2;
          G.ring(ctx, tp[0], tp[1], r, C.magenta, 1);
          G.ring(ctx, tp[0], tp[1], r + 4, CV.Palette.alpha(C.magenta, .4), 1);
        }
      }
    }

    ctx.restore();
  };

  M.tramList = function () {
    var out = [];
    for (var id in CV.State.trams) {
      out.push({ id: id, room: CV.State.trams[id].room, name: CV.State.trams[id].name });
    }
    return out;
  };

  /* Called by the MAP tab of the menu. */
  M.handleInput = function (dt) {
    var speed = 260 * dt / M.scale;
    if (In.held('left')) M.camX -= speed;
    if (In.held('right')) M.camX += speed;
    if (In.held('up')) M.camY -= speed;
    if (In.held('down')) M.camY += speed;

    if (In.pressed('dash')) {
      M.scale = M.scale >= 0.8 ? 0.25 : (M.scale >= 0.45 ? 0.8 : 0.45);
      CV.Audio.sfx('ui');
    }

    if (M.travelMode) {
      var trams = M.tramList();
      if (trams.length) {
        if (In.pressed('cycleR') || In.pressed('attack')) {
          M.travelTarget = (M.travelTarget + 1) % trams.length;
          CV.Audio.sfx('ui');
        }
        if (In.pressed('interact') || In.pressed('jump')) {
          var t = trams[M.travelTarget % trams.length];
          M.travelMode = false;
          CV.Menu.close();
          CV.Game.tramTravel(t.room);
        }
      }
    }
  };

  M.legend = function (ctx, x, y) {
    var items = [
      [C.cyan, 'DOCK'], [C.magenta, 'TRAM'], [C.cyanGlow, 'DIVE PORT'],
      [C.red, 'HOSTILE'], [C.green, 'ITEM'], [C.amber, 'SEALED']
    ];
    for (var i = 0; i < items.length; i++) {
      var iy = y + i * 9;
      G.rect(ctx, x, iy + 1, 4, 4, items[i][0]);
      G.text(ctx, items[i][1], x + 8, iy, '#5d7488', 1);
    }
  };

})(window.CV = window.CV || {});
