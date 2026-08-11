/* Headless smoke test. Loads the real engine in Node behind a Canvas2D stub, then
   simulates thousands of frames across every room with randomised input, all four
   chassis, every module, and both layers. Catches runtime faults that only appear
   once things actually move. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');

/* ---- Canvas2D / DOM stub ------------------------------------------------- */
function makeCtx() {
  const noop = () => {};
  const ctx = {
    canvas: null, globalAlpha: 1, globalCompositeOperation: 'source-over',
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '', filter: '',
    imageSmoothingEnabled: false,
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    fillRect: noop, strokeRect: noop, clearRect: noop, drawImage: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, arc: noop,
    fill: noop, stroke: noop, clip: noop, rect: noop, setTransform: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    putImageData: noop, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
  };
  return ctx;
}
function makeCanvas(w, h) {
  const c = { width: w || 300, height: h || 150, style: {},
              addEventListener: () => {}, focus: () => {} };
  const ctx = makeCtx(); ctx.canvas = c;
  c.getContext = () => ctx;
  return c;
}

const listeners = {};
const win = {
  innerWidth: 1280, innerHeight: 800,
  addEventListener: (t, f) => { (listeners[t] || (listeners[t] = [])).push(f); },
  removeEventListener: () => {},
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  performance: { now: () => Date.now() },
  localStorage: (() => { const m = {}; return {
    getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); },
    removeItem: k => { delete m[k]; } }; })(),
  AudioContext: undefined, webkitAudioContext: undefined   // audio disabled headless
};
win.window = win;
const doc = {
  createElement: t => (t === 'canvas' ? makeCanvas() : { style: {}, appendChild: () => {} }),
  getElementById: () => makeCanvas(512, 288),
  querySelector: () => ({ style: {} }),
  addEventListener: () => {},
  head: { appendChild: () => {} }
};

const sandbox = {
  window: win, document: doc, console,
  performance: win.performance, localStorage: win.localStorage,
  requestAnimationFrame: win.requestAnimationFrame,
  cancelAnimationFrame: win.cancelAnimationFrame,
  setInterval: () => 0, clearInterval: () => {}, setTimeout: () => 0,
  Math, JSON, Object, Array, String, Number, Date, Error, isNaN, parseInt, parseFloat,
  Uint8ClampedArray, Float32Array, RegExp
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

/* ---- load the real manifest, in order ------------------------------------ */
const html = fs.readFileSync(path.join(ROOT, 'cybervania.html'), 'utf8');
const manifest = html.match(/'((?:src|data|maps)\/[^']+\.js)'/g).map(s => s.slice(1, -1));

for (const rel of manifest) {
  const p = path.join(ROOT, 'cybervania', rel);
  try {
    vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: rel });
  } catch (e) {
    console.error('LOAD FAULT in ' + rel + ': ' + e.message);
    process.exit(1);
  }
}
console.log('loaded ' + manifest.length + ' files');

const CV = sandbox.window.CV;

/* ---- deterministic fake input -------------------------------------------- */
let held = {}, pressedNow = {}, releasedNow = {};
CV.Input.held = a => !!held[a];
CV.Input.pressed = a => !!pressedNow[a];
CV.Input.released = a => !!releasedNow[a];
CV.Input.buffered = a => !!held[a] || !!pressedNow[a];
CV.Input.consume = a => { pressedNow[a] = false; held[a] = false; };
CV.Input.axisX = () => (held.right ? 1 : 0) - (held.left ? 1 : 0);
CV.Input.axisY = () => (held.down ? 1 : 0) - (held.up ? 1 : 0);
CV.Input.init = () => {};
CV.Input.update = () => {};
CV.Input.now = () => 0;
CV.Input.clear = () => { held = {}; };

/* ---- boot ---------------------------------------------------------------- */
const faults = [];
function guard(label, fn) {
  try { fn(); } catch (e) {
    faults.push(label + ': ' + e.message + '\n    ' + (e.stack || '').split('\n')[1]);
    return false;
  }
  return true;
}

guard('boot', () => CV.Game.boot(makeCanvas(512, 288)));
CV.Engine.stop();

const rooms = CV.Rooms.ids();
const modules = CV.Modules.order;
const frames = CV.Frames.order;

/* Grant everything so every code path is reachable. */
modules.forEach(m => CV.State.giveModule(m));
frames.forEach(f => CV.State.giveFrame(f));
Object.keys(CV.Player.augments).forEach(a => CV.State.giveAugment(a));
CV.Player.maxHp = 10; CV.Player.hp = 10;

const ACTIONS = ['left','right','up','down','jump','attack','dash','grapple','special','shift'];
let rngState = 12345;
function rnd() { rngState = (rngState * 1103515245 + 12345) & 0x7fffffff; return rngState / 0x7fffffff; }

let frameCount = 0, roomsVisited = 0, enemiesSeen = 0, bossesSeen = 0;
const ctx = makeCtx();

for (const roomId of rooms) {
  if (!guard('load ' + roomId, () => CV.World.load(roomId))) continue;
  roomsVisited++;
  enemiesSeen += CV.Enemies.list.length;
  if (CV.Bosses.current) bossesSeen++;

  for (let f = 0; f < 4; f++) {
    // cycle chassis; force it, ignoring fit checks
    guard('setFrame ' + frames[f], () => CV.Player.setFrame(frames[f], true));
    CV.Player.activeModule = ['emp','cutter','overclock','drone'][f];

    for (let i = 0; i < 90; i++) {
      // randomise input each tick
      pressedNow = {}; releasedNow = {};
      for (const a of ACTIONS) {
        const on = rnd() < 0.28;
        if (on && !held[a]) pressedNow[a] = true;
        if (!on && held[a]) releasedNow[a] = true;
        held[a] = on;
      }
      // occasionally flip layers and take damage
      if (i % 37 === 0) guard('layer ' + roomId, () => CV.DataSphere.setLayer(i % 74 === 0 ? 1 : 0));
      if (i % 53 === 0) guard('hurt ' + roomId, () => CV.Player.hurt(1, 1));
      if (CV.Player.dead) { CV.Player.dead = false; CV.Player.hp = 10; }

      const ok = guard('update ' + roomId + '/' + frames[f], () => {
        CV.Engine.update(1 / 120);
      });
      if (!ok) break;
      frameCount++;
    }

    guard('render ' + roomId + '/' + frames[f], () => CV.Engine.render(1 / 60));
  }

  // exercise menu + terminal render paths
  guard('menu ' + roomId, () => { CV.Menu.open('map'); CV.Menu.update(1/60); CV.Menu.render(ctx); CV.Menu.close(); });
}

/* ---- modal liveness: the menu/terminal must keep updating while "paused" -------
   Regression guard: opening the menu used to set Engine.paused, which stopped the
   very loop that drives the menu. Everything here goes through Engine.update. ---- */
{
  guard('modal', () => CV.World.load('neon_plaza'));
  CV.DialogUI.stop();
  held = {}; pressedNow = {};

  CV.Menu.open('system');
  for (let i = 0; i < 200; i++) { CV.Engine.update(1 / 120); }
  if (!CV.Menu.open_) faults.push('modal: menu closed itself');

  // The cursor is a module-private local, so observe it through what gets drawn:
  // the selected row is rendered with a leading '>' marker.
  const selected = () => {
    let sel = null;
    const orig = CV.Gfx.text;
    CV.Gfx.text = function (c, str, x, y, col, sc, o) {
      if (typeof str === 'string' && str.charAt(0) === '>') sel = str;
      return orig.apply(this, arguments);
    };
    CV.Menu.render(ctx);
    CV.Gfx.text = orig;
    return sel;
  };

  const rowBefore = selected();
  for (let i = 0; i < 4; i++) {
    pressedNow = { down: true };
    CV.Engine.update(1 / 120);
    pressedNow = {};
    CV.Engine.update(1 / 120);
  }
  const rowAfter = selected();
  if (!rowBefore) faults.push('modal: SYSTEM tab drew no selected row');
  else if (rowBefore === rowAfter) {
    faults.push('modal: menu cursor did not respond to input via Engine.update');
  }

  pressedNow = { pause: true };
  CV.Engine.update(1 / 120);
  pressedNow = {};
  if (CV.Menu.open_) faults.push('modal: menu did not close on pause');

  // world must NOT advance while a modal is open
  CV.Menu.open('map');
  const px0 = CV.Player.x;
  CV.Player.vx = 400;
  for (let i = 0; i < 60; i++) CV.Engine.update(1 / 120);
  if (Math.abs(CV.Player.x - px0) > 0.01) faults.push('modal: world simulated while menu open');
  CV.Menu.close();
  CV.Player.vx = 0;
}

/* ---- UI text overflow: catch strings drawn past the right edge of the screen --- */
const overflow = new Map();
const realText = CV.Gfx.text;
let trackText = false;
CV.Gfx.text = function (c, str, x, y, col, scale, o) {
  if (trackText) {
    const end = x + CV.Gfx.textWidth(String(str), scale || 1);
    if (end > CV.W + 1 && String(str).trim()) {
      const key = String(str).slice(0, 40);
      if (!overflow.has(key)) overflow.set(key, Math.round(end - CV.W));
    }
  }
  return realText.apply(this, arguments);
};

trackText = true;
CV.World.load('neon_plaza');
CV.State.bosses = ['warden9', 'compiler', 'assembly', 'archivist'];
Object.keys(CV.Player.augments).forEach(a => CV.State.giveAugment(a));
CV.Lore.order.forEach(id => CV.State.readLore(id));
for (const tabName of ['map', 'frames', 'modules', 'log', 'system']) {
  for (const frameId of frames) {
    guard('uitab ' + tabName, () => {
      CV.Menu.close();
      CV.Player.setFrame(frameId, true);
      CV.Menu.open(tabName);
      for (let i = 0; i < 90; i++) CV.Menu.update(1 / 60);
      // sweep the whole list on this tab
      for (let n = 0; n < 22; n++) {
        pressedNow = { down: true }; CV.Menu.update(1 / 60); CV.Menu.render(ctx);
        pressedNow = {};
      }
      CV.Menu.render(ctx);
      CV.Menu.close();
    });
  }
}
// HUD + terminal + dialogue surfaces
guard('ui hud', () => { CV.HUD.showAcquire('CHASSIS PATTERN', 'BULWARK',
  CV.Frames.defs.bulwark.blurb); CV.HUD.update(1/60); CV.HUD.render(ctx); });
guard('ui title', () => { CV.Title.show(); CV.Title.update(1/60); CV.Title.render(ctx);
  CV.Title.active = false; });
trackText = false;

console.log(`text overflow: ${overflow.size ? overflow.size + ' STRINGS' : 'none'}`);
for (const [s, px] of overflow) console.log(`  +${px}px  "${s}"`);

/* ---- spawn safety: every spawn must settle on ground, not in a wall or a pit --- */
const spawnIssues = [];
CV.Debug.god = false;
// The acquisition card deliberately freezes world simulation; clear it first or the
// very first room reads as "bottomless".
CV.HUD.reset();
CV.Menu.close();
for (const roomId of rooms) {
  const def = CV.Rooms.get(roomId);
  const spawns = (def.objects || []).filter(o => o.t === 'spawn');
  for (const sp of spawns) {
    guard('spawnload ' + roomId, () => CV.World.load(roomId, sp.name));
    CV.Player.setFrame('vector', true);
    CV.Player.hp = 10; CV.Player.dead = false;
    CV.DialogUI.stop();
    CV.Enemies.clear();                       // isolate terrain from combat
    held = {}; pressedNow = {}; releasedNow = {};

    const startRoom = CV.World.room.id;
    // embedded in terrain?
    if (CV.Collision.solidBox(CV.World.room, CV.Player.x, CV.Player.y,
                              CV.Player.w, CV.Player.h, 0)) {
      spawnIssues.push(`${roomId}:${sp.name} spawns inside terrain`);
      continue;
    }
    // let gravity settle it for 3 seconds of idle time
    let landed = false;
    for (let i = 0; i < 360; i++) {
      guard('spawnsim ' + roomId, () => CV.Engine.update(1 / 120));
      if (CV.World.room.id !== startRoom) { landed = true; break; }  // walked into a door
      if (CV.Player.dead) break;
      if (CV.Player.grounded) { landed = true; break; }
    }
    if (CV.Player.dead) spawnIssues.push(`${roomId}:${sp.name} dies on arrival`);
    else if (!landed) spawnIssues.push(`${roomId}:${sp.name} never lands (bottomless)`);
  }
}
console.log(`spawn checks: ${spawnIssues.length ? spawnIssues.length + ' ISSUES' : 'all safe'}`);
spawnIssues.forEach(s => console.log('  ' + s));

/* Every lore entry must render in the terminal. */
for (const id of CV.Lore.order) {
  guard('lore ' + id, () => {
    CV.Terminal.open(CV.Lore.entries[id]);
    CV.Terminal.update(1);
    CV.Terminal.render(ctx);
    CV.Terminal.close();
  });
}

/* Every dialogue script must play to completion. */
for (const id of Object.keys(CV.Dialogue.scripts)) {
  guard('dialogue ' + id, () => {
    CV.DialogUI.play(CV.Dialogue.get(id));
    let n = 0;
    while (CV.DialogUI.active && n++ < 8000) {
      // most lines wait for a confirm press by design, so simulate one periodically
      pressedNow = (n % 12 === 0) ? { jump: true } : {};
      CV.DialogUI.update(1 / 30);
      CV.DialogUI.render(ctx);
    }
    pressedNow = {};
    if (CV.DialogUI.active) throw new Error('dialogue never ended');
  });
}

/* Save round-trip. */
guard('save', () => {
  CV.Save.write(1);
  const before = CV.State.completion();
  const s = CV.Save.summary(1);
  if (!s) throw new Error('summary null after write');
  CV.Save.apply(CV.Save.read(1));
  if (CV.State.completion() !== before) throw new Error('completion changed across save');
});

/* Debug commands. */
for (const cmd of ['help','give all','frame all','map','pos','boxes','god','god','layer data','layer phys','killall','clear']) {
  guard('cmd ' + cmd, () => CV.Debug.run(cmd));
}

console.log(`frames simulated: ${frameCount}`);
console.log(`rooms: ${roomsVisited}/${rooms.length}  enemies placed: ${enemiesSeen}  bosses: ${bossesSeen}`);
console.log(`lore: ${CV.Lore.order.length}  dialogue: ${Object.keys(CV.Dialogue.scripts).length}`);

if (faults.length) {
  const uniq = [...new Set(faults)];
  console.log(`\nFAULTS (${uniq.length} unique / ${faults.length} total):`);
  uniq.slice(0, 25).forEach(f => console.log('  ' + f));
  process.exit(1);
}
console.log('\nNo runtime faults.');
