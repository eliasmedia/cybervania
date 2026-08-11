/* Offline validator for the CYBERVANIA world graph. Loads the map files with a
   minimal CV stub and checks door targets, spawn names, tile legality, reachability
   and pickup-id uniqueness. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const defs = {};
const CV = {
  Rooms: { add: d => { if (defs[d.id]) fail(`duplicate room id ${d.id}`); defs[d.id] = d; } },
  Palette: { c: new Proxy({}, { get: () => '#fff' }) }
};
const problems = [];
function fail(m) { problems.push(m); }

const sandbox = { window: { CV }, console };
sandbox.window.CV = CV;
vm.createContext(sandbox);

for (const f of ['undercity', 'house', 'neoncity', 'oldnetwork', 'factory',
                 'servers', 'reactor', 'central']) {
  const src = fs.readFileSync(path.join(ROOT, 'maps', f + '.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: f + '.js' });
}

const VALID = new Set([' ', '.', '-', '*', '#', '=', '^', 'v', '~', 'w',
                       'D', 'd', 'p', 'B', 'E', 'G', 'o', 'C', 'c']);

const ids = Object.keys(defs);
console.log(`rooms: ${ids.length}`);

let totalTiles = 0, objCount = 0;
const pickupIds = new Set();

for (const id of ids) {
  const d = defs[id];
  if (!d.region) fail(`${id}: no region`);
  const w = Math.max(...d.tiles.map(r => r.length));
  const h = d.tiles.length;
  totalTiles += w * h;

  // ragged rows are fine (padded at runtime) but flag wildly short ones
  d.tiles.forEach((row, y) => {
    for (const ch of row) if (!VALID.has(ch)) fail(`${id}: bad tile '${ch}' on row ${y}`);
  });

  const spawns = new Set((d.objects || []).filter(o => o.t === 'spawn').map(o => o.name));

  for (const o of (d.objects || [])) {
    objCount++;
    if (o.x === undefined || o.y === undefined) fail(`${id}: object ${o.t} missing x/y`);
    if (o.x < 0 || o.y < 0 || o.x > w || o.y > h) {
      fail(`${id}: object ${o.t} out of bounds at ${o.x},${o.y} (room ${w}x${h})`);
    }
    if (o.t === 'door') {
      if (!defs[o.to]) fail(`${id}: door -> unknown room '${o.to}'`);
      else if (o.spawn) {
        const tgt = defs[o.to];
        const tgtSpawns = new Set((tgt.objects || []).filter(s => s.t === 'spawn').map(s => s.name));
        if (!tgtSpawns.has(o.spawn)) fail(`${id}: door -> ${o.to} spawn '${o.spawn}' MISSING`);
      }
    }
    if (o.t === 'pickup') {
      const pid = o.id || `${o.t}@${id}:${o.x},${o.y}`;
      if (pickupIds.has(pid)) fail(`duplicate pickup id '${pid}'`);
      pickupIds.add(pid);
      if (o.kind === 'module' && !o.mod) fail(`${id}: module pickup without mod`);
      if (o.kind === 'frame' && !o.frame) fail(`${id}: frame pickup without frame`);
      if (o.kind === 'augment' && !o.aug) fail(`${id}: augment pickup without aug`);
    }
    if (o.t === 'terminal' || o.t === 'graffiti') {
      if (!o.lore) fail(`${id}: ${o.t} without lore id`);
    }
  }
  void spawns;
}

// ---- placement check: nothing may spawn inside terrain -------------------
const SOLID = new Set(['#', 'B', 'E', 'D', 'p', 'C', 'c']);
const FLYING = new Set(['drone', 'wasp', 'daemon', 'glitch', 'wisp', 'splicer', 'eye', 'turret']);
const PLACEABLE = new Set(['enemy', 'pickup', 'dock', 'terminal', 'divePort', 'tram',
                           'spawn', 'graffiti', 'prop', 'boss', 'echo']);
function tileAt(d, x, y) {
  if (y < 0 || y >= d.tiles.length) return '#';
  const row = d.tiles[y];
  if (x < 0 || x >= row.length) return ' ';   // ragged rows pad with air
  return row[x];
}
for (const id of ids) {
  const d = defs[id];
  for (const o of (d.objects || [])) {
    if (!PLACEABLE.has(o.t)) continue;
    const x = Math.round(o.x), y = Math.round(o.y);
    // the tile the thing occupies must not be solid
    if (SOLID.has(tileAt(d, x, y))) {
      fail(`${id}: ${o.t}${o.e ? ' ' + o.e : ''} embedded in terrain at ${x},${y}`);
      continue;
    }
    // ground units and anything with a footprint need floor within 12 tiles
    const flying = o.t === 'enemy' && FLYING.has(o.e);
    if (o.t === 'enemy' && !flying) {
      let floor = -1;
      for (let k = 0; k <= 12; k++) {
        const ch = tileAt(d, x, y + k);
        if (SOLID.has(ch) || ch === '=') { floor = k; break; }
      }
      if (floor < 0) fail(`${id}: ground enemy '${o.e}' at ${x},${y} has no floor beneath`);
      if (floor === 0) fail(`${id}: ground enemy '${o.e}' at ${x},${y} is inside its floor`);
    }
  }
}

// ---- doors: replicate the runtime pad+carve, then check they reach open space ----
// world/room.js pads every room to 32x18 and carves door openings; the validator has
// to model that or it reports passages the engine actually opens.
for (const id of ids) {
  const d = defs[id];
  const grid = d.tiles.map(r => r.split(''));
  let W = Math.max(...grid.map(r => r.length));
  if (W < 32) { grid.forEach(r => { while (r.length < 32) r.push('#'); }); W = 32; }
  grid.forEach(r => { while (r.length < W) r.push(' '); });
  while (grid.length < 18) grid.push(new Array(W).fill('#'));
  const H = grid.length;

  const doors = (d.objects || []).filter(o => o.t === 'door');
  for (const o of doors) {
    const x0 = o.x | 0, y0 = o.y | 0, w = o.w || 1, h = o.h || 1;
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        if (x >= 0 && y >= 0 && x < W && y < H) grid[y][x] = ' ';
    let dx = 0, dy = 0;
    if (x0 <= 0) dx = 1; else if (x0 + w >= W) dx = -1;
    else if (y0 <= 0) dy = 1; else if (y0 + h >= H) dy = -1;
    if (!dx && !dy) continue;
    for (let step = 1; step <= 3; step++) {
      let clear = true;
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++) {
          const nx = x + dx * step, ny = y + dy * step;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          if (grid[ny][nx] !== ' ') { grid[ny][nx] = ' '; clear = false; }
        }
      if (clear) break;
    }
  }

  // after carving, every door must touch at least one open tile it can be entered from
  for (const o of doors) {
    const x0 = o.x | 0, y0 = o.y | 0, w = o.w || 1, h = o.h || 1;
    let reach = false;
    for (let y = y0 - 1; y <= y0 + h && !reach; y++)
      for (let x = x0 - 1; x <= x0 + w && !reach; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h) continue;
        if (!SOLID.has(grid[y][x])) reach = true;
      }
    if (!reach) fail(`${id}: door -> ${o.to} at ${x0},${y0} is sealed even after carving`);
  }
}

// reachability + map layout collision check
const layout = {};
layout['und_wake'] = { x: 0, y: 0 };
const q = ['und_wake'];
while (q.length) {
  const id = q.shift();
  const base = layout[id];
  for (const o of (defs[id].objects || [])) {
    if (o.t !== 'door' || !defs[o.to] || layout[o.to]) continue;
    const tgt = defs[o.to];
    const sp = (tgt.objects || []).find(s => s.t === 'spawn' && s.name === o.spawn)
            || (tgt.objects || []).find(s => s.t === 'spawn');
    layout[o.to] = { x: base.x + o.x - (sp ? sp.x : 0), y: base.y + o.y - (sp ? sp.y : 0) };
    q.push(o.to);
  }
}
for (const id of ids) if (!layout[id]) fail(`UNREACHABLE from und_wake: ${id}`);

// bidirectionality: every door should have a way back
for (const id of ids) {
  for (const o of (defs[id].objects || [])) {
    if (o.t !== 'door' || !defs[o.to]) continue;
    const back = (defs[o.to].objects || []).some(b => b.t === 'door' && b.to === id);
    if (!back) fail(`one-way door: ${id} -> ${o.to} (no return door)`);
  }
}

// progression sanity
const gives = {};
for (const id of ids) {
  for (const o of (defs[id].objects || [])) {
    if (o.t === 'pickup' && o.kind === 'module') gives[o.mod] = id;
    if (o.t === 'pickup' && o.kind === 'frame') gives['frame:' + o.frame] = id;
  }
}
console.log('modules placed:', Object.keys(gives).join(', '));

const MODULES = ['dash','doublejump','grapple','wallcling','slam','emp','magnet',
                 'datashift','drone','extract','overclock','cutter'];
for (const m of MODULES) if (!gives[m]) console.log(`  NOTE: module '${m}' not placed in world`);
for (const f of ['bulwark','arc','cipher']) if (!gives['frame:' + f]) fail(`chassis '${f}' never obtainable`);

console.log(`objects: ${objCount}, tiles: ${totalTiles}, pickups: ${pickupIds.size}`);
console.log(problems.length ? `\nPROBLEMS (${problems.length}):` : '\nNo problems found.');
problems.forEach(p => console.log('  ' + p));
process.exit(problems.length ? 1 : 0);
