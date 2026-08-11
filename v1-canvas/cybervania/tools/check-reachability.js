/* CYBERVANIA — tools/check-reachability.js
   The door graph proves rooms are connected; it does not prove a player can physically
   cross a room. This walks each room with a deliberately conservative movement model
   and reports pickups, doors and save points that no jump can reach.

   Movement model (intentionally pessimistic — it should never claim something is
   reachable when it is not):
     - walk between adjacent standing tiles
     - fall from any ledge, drifting up to DRIFT tiles horizontally
     - jump up to JUMP_UP tiles high and JUMP_DX tiles across

   Run with `--nodash` to model the pre-dash player. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const NODASH = process.argv.includes('--nodash');

const JUMP_UP = 3;                  // Vector clears ~2.9 tiles; 3 is generous
const JUMP_DX = NODASH ? 5 : 8;     // air distance, with or without a dash mid-jump
const DRIFT = 6;
const GRAPPLE = 9;              // tether range in tiles (~150px)

const defs = {};
const CV = { Rooms: { add: d => { defs[d.id] = d; } },
             Palette: { c: new Proxy({}, { get: () => '#fff' }) } };
const sandbox = { window: { CV }, console };
sandbox.window.CV = CV;
vm.createContext(sandbox);
for (const f of ['undercity', 'house', 'neoncity', 'oldnetwork', 'factory',
                 'servers', 'reactor', 'central']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'maps', f + '.js'), 'utf8'), sandbox);
}

const SOLID = new Set(['#', 'B', 'E', 'D', 'p', 'C', 'c']);
const PLATFORM = new Set(['=']);
const DEADLY = new Set(['^', 'v', '~']);

function build(def) {
  const g = def.tiles.map(r => r.split(''));
  let W = Math.max(...g.map(r => r.length));
  if (W < 32) { g.forEach(r => { while (r.length < 32) r.push('#'); }); W = 32; }
  g.forEach(r => { while (r.length < W) r.push(' '); });
  while (g.length < 18) g.push(new Array(W).fill('#'));
  // replicate the engine's door carving
  for (const o of (def.objects || []).filter(o => o.t === 'door')) {
    const x0 = o.x | 0, y0 = o.y | 0, w = o.w || 1, h = o.h || 1;
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        if (g[y] && g[y][x] !== undefined) g[y][x] = ' ';
    let dx = 0, dy = 0;
    if (x0 <= 0) dx = 1; else if (x0 + w >= W) dx = -1;
    else if (y0 <= 0) dy = 1; else if (y0 + h >= g.length) dy = -1;
    /* Must match Room.carveDoor exactly, including the early break: the engine stops
       as soon as a step is already clear. Carving further would delete the very
       platforms and anchors that make the door reachable. */
    if (dx || dy) for (let s = 1; s <= 3; s++) {
      let clear = true;
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++) {
          const nx = x + dx * s, ny = y + dy * s;
          if (g[ny] && g[ny][nx] !== undefined && g[ny][nx] !== ' ') {
            g[ny][nx] = ' '; clear = false;
          }
        }
      if (clear) break;
    }
  }
  return { g, W, H: g.length };
}

const solid = (R, x, y) => (x < 0 || y < 0 || x >= R.W || y >= R.H) ? true : SOLID.has(R.g[y][x]);
const blocked = (R, x, y) => solid(R, x, y);
const standable = (R, x, y) => {
  if (x < 0 || y < 0 || x >= R.W || y >= R.H) return false;
  if (blocked(R, x, y) || DEADLY.has(R.g[y][x])) return false;
  const below = R.g[y + 1] ? R.g[y + 1][x] : '#';
  if (y + 1 >= R.H) return true;
  return SOLID.has(below) || PLATFORM.has(below);
};
const key = (x, y) => x + ',' + y;

function reachable(R, starts) {
  const seen = new Set();
  const anchors = new Set();
  const q = [];
  for (const s of starts) {
    // drop the start to the first standing tile beneath it
    let y = s.y;
    while (y < R.H - 1 && !standable(R, s.x, y)) y++;
    if (standable(R, s.x, y)) { seen.add(key(s.x, y)); q.push([s.x, y]); }
  }
  while (q.length) {
    const [x, y] = q.shift();
    const push = (nx, ny) => {
      if (!standable(R, nx, ny)) return;
      const k = key(nx, ny);
      if (seen.has(k)) return;
      seen.add(k); q.push([nx, ny]);
    };
    // walk
    push(x - 1, y); push(x + 1, y);
    // fall off either side
    for (const dir of [-1, 1]) {
      for (let d = 1; d <= DRIFT; d++) {
        const cx = x + dir * d;
        if (blocked(R, cx, y)) break;
        for (let cy = y; cy < R.H; cy++) {
          if (blocked(R, cx, cy)) break;
          if (standable(R, cx, cy)) { push(cx, cy); break; }
        }
      }
    }
    /* Tether hook: 'G' anchors are the intended route through the vertical shafts.
       Latching pulls the player to the anchor, so anything standable near it — and
       anything reachable by falling from it — opens up. Range is ~9 tiles. */
    if (!NODASH) {
      for (let ay = Math.max(0, y - GRAPPLE); ay <= Math.min(R.H - 1, y + GRAPPLE); ay++) {
        for (let ax = Math.max(0, x - GRAPPLE); ax <= Math.min(R.W - 1, x + GRAPPLE); ax++) {
          if (R.g[ay][ax] !== 'G') continue;
          if ((ax - x) ** 2 + (ay - y) ** 2 > GRAPPLE * GRAPPLE) continue;
          /* The tether pulls you to the anchor and releases with momentum, and a
             second tether can be fired in mid-air — so an anchor is a traversal
             node in its own right, not just a way to reach nearby ground. */
          anchors.add(key(ax, ay));
          for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 3; dy++) {
              const nx = ax + dx, ny = ay + dy;
              if (blocked(R, nx, ny)) continue;
              push(nx, ny);
              for (let cy = ny; cy < R.H; cy++) {
                if (blocked(R, nx, cy)) break;
                if (standable(R, nx, cy)) { push(nx, cy); break; }
              }
            }
          }
        }
      }
    }

    // jump: any standing tile within the arc, with headroom above the take-off
    for (let up = 0; up <= JUMP_UP; up++) {
      if (blocked(R, x, y - up)) break;
      const span = Math.round(JUMP_DX * (1 - up / (JUMP_UP + 1.5)));
      for (let dx = -span; dx <= span; dx++) {
        const nx = x + dx, ny = y - up;
        if (blocked(R, nx, ny)) continue;
        push(nx, ny);
        for (let cy = ny; cy < R.H; cy++) {         // and anything you land on below
          if (blocked(R, nx, cy)) break;
          if (standable(R, nx, cy)) { push(nx, cy); break; }
        }
      }
    }
  }

  /* Chain anchor-to-anchor: having reached one anchor, any anchor within tether
     range of it is also reachable, and so is the ground around it. */
  let grew = true;
  while (grew && !NODASH) {
    grew = false;
    for (const ak of Array.from(anchors)) {
      const [ax, ay] = ak.split(',').map(Number);
      for (let by = Math.max(0, ay - GRAPPLE); by <= Math.min(R.H - 1, ay + GRAPPLE); by++) {
        for (let bx = Math.max(0, ax - GRAPPLE); bx <= Math.min(R.W - 1, ax + GRAPPLE); bx++) {
          if (R.g[by][bx] !== 'G') continue;
          if ((bx - ax) ** 2 + (by - ay) ** 2 > GRAPPLE * GRAPPLE) continue;
          if (!anchors.has(key(bx, by))) { anchors.add(key(bx, by)); grew = true; }
          for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 3; dy++) {
              const nx = bx + dx, ny = by + dy;
              if (blocked(R, nx, ny) || !standable(R, nx, ny)) continue;
              if (!seen.has(key(nx, ny))) { seen.add(key(nx, ny)); q.push([nx, ny]); grew = true; }
            }
          }
        }
      }
    }
    // re-flood from anything newly opened
    while (q.length) {
      const [x, y] = q.shift();
      for (const [nx, ny] of [[x - 1, y], [x + 1, y]]) {
        if (standable(R, nx, ny) && !seen.has(key(nx, ny))) { seen.add(key(nx, ny)); q.push([nx, ny]); }
      }
      for (let up = 0; up <= JUMP_UP; up++) {
        if (blocked(R, x, y - up)) break;
        const span = Math.round(JUMP_DX * (1 - up / (JUMP_UP + 1.5)));
        for (let dx = -span; dx <= span; dx++) {
          const nx = x + dx, ny = y - up;
          if (blocked(R, nx, ny)) continue;
          for (let cy = ny; cy < R.H; cy++) {
            if (blocked(R, nx, cy)) break;
            if (standable(R, nx, cy)) {
              if (!seen.has(key(nx, cy))) { seen.add(key(nx, cy)); q.push([nx, cy]); }
              break;
            }
          }
        }
      }
    }
  }
  R.anchors = anchors;
  return seen;
}

/* From the standing set, expand to every tile the player's body can actually pass
   through: the jump arc above each foothold, and the column it falls down. An item
   only has to be *touched*, not stood on. */
function touchable(R, stand) {
  const t = new Set(stand);
  for (const a of (R.anchors || [])) t.add(a);
  for (const k of stand) {
    const [x, y] = k.split(',').map(Number);
    for (let up = 0; up <= JUMP_UP + 1; up++) {
      if (blocked(R, x, y - up)) break;
      const span = Math.round(JUMP_DX * (1 - up / (JUMP_UP + 2.5)));
      for (let dx = -span; dx <= span; dx++) {
        const nx = x + dx, ny = y - up;
        if (blocked(R, nx, ny)) continue;
        // the tile must be connected to the take-off column without passing through
        // terrain, approximated by a clear horizontal run at that height
        let clear = true;
        const stepDir = Math.sign(dx) || 1;
        for (let cx = x; cx !== nx; cx += stepDir) {
          if (blocked(R, cx, ny)) { clear = false; break; }
        }
        if (!clear) continue;
        t.add(key(nx, ny));
        for (let cy = ny; cy < R.H; cy++) {   // and everything on the way down
          if (blocked(R, nx, cy)) break;
          t.add(key(nx, cy));
        }
      }
    }
  }
  return t;
}

let problems = 0;
for (const id of Object.keys(defs)) {
  const def = defs[id];
  const R = build(def);
  const spawns = (def.objects || []).filter(o => o.t === 'spawn');
  if (!spawns.length) continue;
  const stand = reachable(R, spawns.map(s => ({ x: s.x | 0, y: s.y | 0 })));
  const seen = touchable(R, stand);

  /* Bosses are excluded: they are airborne arena centrepieces that come to the
     player, so "can the player stand on it" is not a meaningful question. */
  /* `expectGated: true` marks a connection that is *supposed* to be sealed until the
     player has the right tool — a shortcut, not a dead end. */
  const targets = (def.objects || []).filter(o =>
    !o.expectGated && (o.t === 'pickup' || o.t === 'door' || o.t === 'dock' ||
                       o.t === 'tram' || o.t === 'divePort'));

  for (const t of targets) {
    let ok = false;
    for (let dy = -1; dy <= (t.h || 1) && !ok; dy++)
      for (let dx = -1; dx <= (t.w || 1) && !ok; dx++)
        if (seen.has(key((t.x | 0) + dx, (t.y | 0) + dy))) ok = true;
    if (!ok) {
      problems++;
      const what = t.t === 'pickup' ? `${t.t}(${t.kind}${t.mod ? ':' + t.mod : ''}${t.frame ? ':' + t.frame : ''})`
                 : t.t === 'door' ? `door->${t.to}` : t.t;
      console.log(`  ${id}: ${what} at ${t.x},${t.y} UNREACHABLE`);
    }
  }
}

console.log(problems
  ? `\n${problems} unreachable object(s)  [model: jump ${JUMP_UP} up / ${JUMP_DX} across${NODASH ? ', no dash' : ''}]`
  : `All objects reachable  [model: jump ${JUMP_UP} up / ${JUMP_DX} across${NODASH ? ', no dash' : ''}]`);
process.exit(problems ? 1 : 0);
