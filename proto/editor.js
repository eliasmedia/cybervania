/* CYBERVANIA — proto/editor.js
   THE LEVEL EDITOR. Open the game with ?edit, or press F2.

   Why this exists: the world stopped growing because growing it meant hand-writing
   coordinates into a source file and reloading to find out what they looked like. This
   edits the same op lists the game plays (see proto/authored.js), live, in the real
   renderer with the real lighting, and writes the region file back out.

   What it is NOT: a general-purpose scene editor. It only knows the level-design
   vocabulary — floors, ledges, walls, lights, props, enemies — because that vocabulary
   is the actual unit of authoring here.

   THREE THINGS IT ENFORCES, because they are the ones that keep being got wrong:
     - snapping to 0.5, so nothing ever lands on an unreachable fraction
     - a live headroom/bypass/reachability readout, so a mistake is visible immediately
     - a note field on every op, because REDESIGN.md 5a says every ledge answers
       "what is this for" and an editor that lets you skip that will be used to skip it.

   Layout is DOM on top of the canvas rather than drawn in 3D: the game renders at
   480x270 and snaps to a 30-colour palette, which is exactly the wrong surface to draw
   thin selection outlines on. */
(function (P) {
  'use strict';

  var ED = P.Editor = {};

  ED.active = false;
  ED.camX = 0; ED.camY = 0; ED.camZ = 48;
  ED.radX = 3; ED.radY = 2;

  var SNAP = 0.5;
  var sel = -1;                    // index into the current chunk's ops
  var cur = { cx: 5, cy: 7 };
  var tool = 'select';
  var drag = null;                 // { x0, y0, x1, y1 } in world units
  var root = null, svg = null, panel = null, canvas = null;
  var dirty = {};                  // chunks edited this session

  function snap(v) { return Math.round(v / SNAP) * SNAP; }

  /* --------------------------------------------------------------------------
     THE TOOL TABLE

     Each tool says how it is drawn (rect / point / line) and how a gesture becomes op
     arguments. Defaults are the values that turned out to be right in the opening, so
     placing something and leaving it alone gives a usable result.
     -------------------------------------------------------------------------- */
  var TOOLS = {
    select:   { kind: 'select', label: 'Select' },

    floor:    { kind: 'rect', label: 'Floor', solid: true,
                make: function (r) { return ['floor', r.x0, r.x1, r.y1]; } },
    platform: { kind: 'rect', label: 'Ledge', solid: true,
                make: function (r) { return ['platform', r.x0, r.x1, r.y1]; } },
    wall:     { kind: 'rect', label: 'Wall', solid: true,
                make: function (r) { return ['wall', r.x0, r.x1, r.y0, r.y1]; } },
    ceiling:  { kind: 'rect', label: 'Ceiling', solid: true,
                make: function (r) { return ['ceiling', r.x0, r.x1, r.y0]; } },

    lamp:     { kind: 'point', label: 'Lamp',
                make: function (p) { return ['lamp', p.x, p.y, 0xffb23d, 3]; } },
    light:    { kind: 'point', label: 'Light',
                make: function (p) { return ['light', p.x, p.y, 0xffb23d, 1.4, 14]; } },
    neon:     { kind: 'point', label: 'Neon',
                make: function (p) { return ['neon', 'TEXT', p.x, p.y, 0x5cff9d,
                                             { scale: 0.7, intensity: 2 }]; } },
    crawler:  { kind: 'point', label: 'Crawler',
                make: function (p) { return ['enemy', 'crawler', p.x, p.y, { facing: -1 }]; } },
    eye:      { kind: 'point', label: 'Sentinel',
                make: function (p) { return ['enemy', 'eye', p.x, p.y]; } },
    deadBot:  { kind: 'point', label: 'Dead unit',
                make: function (p) { return ['deadBot', p.x, p.y, 1]; } },
    cradle:   { kind: 'point', label: 'Cradle',
                make: function (p) { return ['cradle', p.x, p.y]; } },
    clutter:  { kind: 'point', label: 'Clutter',
                make: function (p) { return ['clutter', p.x, p.y]; } },
    steam:    { kind: 'point', label: 'Steam',
                make: function (p) { return ['steam', p.x, p.y]; } },
    spawn:    { kind: 'point', label: 'Spawn',
                make: function (p) { return ['spawn', 'start', p.x, p.y]; } },

    catwalk:  { kind: 'rect', label: 'Catwalk',
                make: function (r) { return ['catwalk', r.x0, r.y0, r.x1 - r.x0]; } },
    pipes:    { kind: 'rect', label: 'Pipes',
                make: function (r) { return ['pipes', r.x0, r.y0, r.x1 - r.x0, 2]; } },
    fg:       { kind: 'rect', label: 'Foreground',
                make: function (r) { return ['fg', (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2,
                                             r.x1 - r.x0, r.y1 - r.y0]; } },
    trigger:  { kind: 'rect', label: 'Trigger',
                make: function (r) { return ['trigger', 'id', r.x0, r.y0,
                                             r.x1 - r.x0, r.y1 - r.y0, 'id']; } },
    cable:    { kind: 'line', label: 'Cable',
                make: function (r) { return ['cable', r.x0, r.y0, r.x1, r.y1, 1.4]; } },
    drip:     { kind: 'line', label: 'Drip',
                make: function (r) { return ['drip', r.x0, Math.max(r.y0, r.y1),
                                             Math.min(r.y0, r.y1)]; } }
  };

  /* Where an op lives, in chunk-local units, so it can be drawn and hit-tested.
     Returns null for ops that have no meaningful footprint. */
  function boundsOf(op) {
    var a = P.Authored.argsOf(op);
    switch (op[0]) {
      case 'floor':    return { x0: a[0], x1: a[1], y0: a[2] - 3, y1: a[2] };
      case 'platform': return { x0: a[0], x1: a[1], y0: a[2] - 1, y1: a[2] };
      case 'wall':     return { x0: a[0], x1: a[1], y0: a[2], y1: a[3] };
      case 'ceiling':  return { x0: a[0], x1: a[1], y0: a[2], y1: P.World.CH };
      case 'catwalk':  return { x0: a[0], x1: a[0] + a[2], y0: a[1] - 0.3, y1: a[1] + 0.3 };
      case 'pipes':    return { x0: a[0], x1: a[0] + a[2], y0: a[1] - 0.5, y1: a[1] + 0.5 };
      case 'fg':       return { x0: a[0] - a[2] / 2, x1: a[0] + a[2] / 2,
                                y0: a[1] - a[3] / 2, y1: a[1] + a[3] / 2 };
      case 'trigger':  return { x0: a[1], x1: a[1] + a[3], y0: a[2], y1: a[2] + a[4] };
      case 'cable':    return { x0: Math.min(a[0], a[2]), x1: Math.max(a[0], a[2]),
                                y0: Math.min(a[1], a[3]), y1: Math.max(a[1], a[3]) };
      case 'drip':     return { x0: a[0] - 0.3, x1: a[0] + 0.3, y0: a[2], y1: a[1] };
      case 'neon':     return { x0: a[1] - 1.5, x1: a[1] + 1.5, y0: a[2] - 0.8, y1: a[2] + 0.8 };
      case 'enemy':    return { x0: a[1] - 0.9, x1: a[1] + 0.9, y0: a[2], y1: a[2] + 1.6 };
      case 'spawn':    return { x0: a[1] - 0.5, x1: a[1] + 0.5, y0: a[2], y1: a[2] + 3 };
      case 'lamp':     return { x0: a[0] - 0.6, x1: a[0] + 0.6, y0: a[1], y1: a[1] + (a[3] || 3) };
      case 'light':    return { x0: a[0] - 0.5, x1: a[0] + 0.5, y0: a[1] - 0.5, y1: a[1] + 0.5 };
      case 'cradle':   return { x0: a[0] - 0.5, x1: a[0] + 3, y0: a[1], y1: a[1] + 4 };
      case 'deadBot':  return { x0: a[0] - 1, x1: a[0] + 1, y0: a[1], y1: a[1] + 1.2 };
      case 'clutter':
      case 'steam':    return { x0: a[0] - 1, x1: a[0] + 1, y0: a[1], y1: a[1] + 1.5 };
      default:         return null;    // backdrop and anything else: no footprint
    }
  }

  var SOLID = { floor: 1, platform: 1, wall: 1, ceiling: 1 };

  /* --------------------------------------------------------------------------
     COORDINATES
     -------------------------------------------------------------------------- */
  function originOf(cx, cy) { return { ox: cx * P.World.CW, oy: P.World.chunkOriginY(cy) }; }

  /* Screen pixel -> world unit, on the z=0 plane. Done with the camera's own maths so
     it stays correct if the projection ever changes. */
  function screenToWorld(px, py) {
    var r = canvas.getBoundingClientRect();
    var ndc = new THREE.Vector3(((px - r.left) / r.width) * 2 - 1,
                                -((py - r.top) / r.height) * 2 + 1, 0.5);
    ndc.unproject(P.camera);
    var dir = ndc.sub(P.camera.position).normalize();
    var t = -P.camera.position.z / dir.z;
    return { x: P.camera.position.x + dir.x * t, y: P.camera.position.y + dir.y * t };
  }

  function worldToScreen(wx, wy) {
    var r = canvas.getBoundingClientRect();
    var v = new THREE.Vector3(wx, wy, 0).project(P.camera);
    return { x: (v.x * 0.5 + 0.5) * r.width, y: (-v.y * 0.5 + 0.5) * r.height };
  }

  /* --------------------------------------------------------------------------
     EDITS
     -------------------------------------------------------------------------- */
  function ops() { return P.Authored.ops(cur.cx, cur.cy); }

  function touch() {
    dirty[cur.cx + ',' + cur.cy] = 1;
    P.World.rebuildChunk(cur.cx, cur.cy);
    if (P.Enemies) P.Enemies.resetKills();
    refresh();
  }

  function addOp(op) {
    var list = ops();
    if (!list) return;
    list.push(op);
    sel = list.length - 1;
    touch();
  }

  function deleteSel() {
    var list = ops();
    if (!list || sel < 0 || sel >= list.length) return;
    list.splice(sel, 1);
    sel = -1;
    touch();
  }

  function nudgeSel(dx, dy) {
    var list = ops();
    if (!list || sel < 0) return;
    var op = list[sel], a = P.Authored.argsOf(op);
    /* Which arguments are x and which are y, per verb. Nudging by editing the bounds
       would lose the distinction between "a floor at height 4.5" and "a wall from 3 to
       15", so it moves the actual arguments instead. */
    var MAP = {
      floor:    { x: [0, 1], y: [2] },      platform: { x: [0, 1], y: [2] },
      wall:     { x: [0, 1], y: [2, 3] },   ceiling:  { x: [0, 1], y: [2] },
      lamp:     { x: [0], y: [1] },         light:    { x: [0], y: [1] },
      neon:     { x: [1], y: [2] },         enemy:    { x: [1], y: [2] },
      spawn:    { x: [1], y: [2] },         deadBot:  { x: [0], y: [1] },
      cradle:   { x: [0], y: [1] },         clutter:  { x: [0], y: [1] },
      steam:    { x: [0], y: [1] },         catwalk:  { x: [0], y: [1] },
      pipes:    { x: [0], y: [1] },         fg:       { x: [0], y: [1] },
      trigger:  { x: [1], y: [2] },         cable:    { x: [0, 2], y: [1, 3] },
      drip:     { x: [0], y: [1, 2] }
    };
    var m = MAP[op[0]];
    if (!m) return;
    var i;
    for (i = 0; i < m.x.length; i++) op[1 + m.x[i]] = snap(a[m.x[i]] + dx);
    for (i = 0; i < m.y.length; i++) op[1 + m.y[i]] = snap(a[m.y[i]] + dy);
    touch();
  }

  /* Which chunk is centred in the VISIBLE part of the canvas — the panel covers the
     right-hand third, so the camera centre and the visual centre are not the same. */
  function chunkUnderCam() {
    var x = ED.camX - panelShiftWorld();
    return { cx: Math.floor(x / P.World.CW),
             cy: Math.ceil(-ED.camY / P.World.CH) - 1 };
  }

  /* The panel covers the right-hand third of the canvas, so centring a chunk on the
     canvas centres it under the panel. Everything that frames a chunk offsets by half
     the panel instead. */
  function panelShiftWorld() {
    if (!canvas || !panel) return 0;
    var r = canvas.getBoundingClientRect();
    if (!r.width) return 0;
    var a = screenToWorld(r.left, r.top + r.height / 2);
    var b = screenToWorld(r.right, r.top + r.height / 2);
    return (b.x - a.x) * (panel.offsetWidth / r.width) * 0.5;
  }

  function gotoChunk(cx, cy) {
    cur.cx = cx; cur.cy = cy; sel = -1;
    var o = originOf(cx, cy);
    ED.camX = o.ox + P.World.CW / 2 + panelShiftWorld();
    ED.camY = o.oy + P.World.CH / 2;
    refresh();
  }

  function newChunkHere() {
    var c = chunkUnderCam();
    if (P.Authored.has(c.cx, c.cy)) { gotoChunk(c.cx, c.cy); return; }
    P.Authored.chunk(c.cx, c.cy, {
      name: 'ROOM ' + c.cx + '-' + c.cy,
      note: '',
      ops: [['backdrop', 'wallDark'], ['floor', 0, 24, 4.5], ['ceiling', 0, 24, 20]]
    });
    dirty[c.cx + ',' + c.cy] = 1;
    P.World.rebuildChunk(c.cx, c.cy);
    gotoChunk(c.cx, c.cy);
  }

  /* --------------------------------------------------------------------------
     EXPORT

     Writes a region file in exactly the shape proto/regions/*.js already has, so the
     output is dropped straight back into the repo. Notes and chunk prose survive the
     round trip, which is the only reason they are stored as data at all.
     -------------------------------------------------------------------------- */
  function fmt(v) {
    if (typeof v === 'string') {
      /* Newlines have to survive as escapes, not as actual line breaks — a room note
         is multi-line and an unescaped one splits the string literal in half. */
      return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
                    .replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";
    }
    if (typeof v === 'number') {
      /* Colours read as hex or they are unreadable. Everything else stays decimal. */
      if (Number.isInteger(v) && v > 0xffff) return '0x' + v.toString(16);
      return String(v);
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return '{ ' + Object.keys(v).map(function (k) { return k + ': ' + fmt(v[k]); }).join(', ') + ' }';
    }
    return String(v);
  }

  function noteLiteral(text, indent) {
    var lines = String(text).split('\n');
    return lines.map(function (l, i) {
      return (i ? indent : '') + fmt(l + (i < lines.length - 1 ? '\n' : ''));
    }).join(' +\n');
  }

  ED.exportSource = function (keys) {
    keys = keys || P.Authored.keys();
    keys.sort(function (a, b) {
      var pa = a.split(',').map(Number), pb = b.split(',').map(Number);
      return (pa[1] - pb[1]) || (pa[0] - pb[0]);
    });
    var out = [];
    out.push('/* CYBERVANIA — region export from the in-game editor (?edit).');
    out.push('   Chunks are op lists; see proto/authored.js. */');
    out.push('(function (P) {');
    out.push("  'use strict';");
    out.push('');
    out.push('  var A = P.Authored;');
    out.push('');
    keys.forEach(function (k) {
      var p = k.split(','), d = P.Authored.def(+p[0], +p[1]);
      if (!d || !d.ops) return;
      out.push('  /* ========================================================================== */');
      out.push('  A.chunk(' + p[0] + ', ' + p[1] + ', {');
      if (d.name) out.push("    name: " + fmt(d.name) + ',');
      if (d.note) out.push('    note: ' + noteLiteral(d.note, '          ') + ',');
      out.push('    ops: [');
      d.ops.forEach(function (op, i) {
        var note = P.Authored.noteOf(op);
        var args = [fmt(op[0])].concat(P.Authored.argsOf(op).map(fmt));
        var line = '      [' + args.join(', ');
        var tail = (i < d.ops.length - 1) ? '],' : ']';
        if (note) out.push(line + ',\n        ' + fmt('# ' + note) + tail);
        else out.push(line + tail);
      });
      out.push('    ]');
      out.push('  });');
      out.push('');
    });
    out.push('})(window.PROTO = window.PROTO || {});');
    return out.join('\n');
  };

  function download(name, text) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  /* --------------------------------------------------------------------------
     UI
     -------------------------------------------------------------------------- */
  var CSS = [
    '#edroot{position:fixed;inset:0;z-index:40;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:#cfe3ee}',
    '#edsvg{position:absolute;pointer-events:none;overflow:visible}',
    '#edpanel{position:absolute;top:0;right:0;width:310px;max-height:100%;overflow:auto;',
    '  background:rgba(6,10,16,.93);border-left:1px solid #1d2b3a;padding:9px 10px 40px;pointer-events:auto}',
    '#edpanel h2{margin:0 0 6px;font-size:11px;letter-spacing:.16em;color:#4de3ff;font-weight:600}',
    '#edpanel h3{margin:12px 0 4px;font-size:10px;letter-spacing:.12em;color:#6d8ba0}',
    '.edsec{margin:10px 0 4px;font-size:10px;letter-spacing:.12em;color:#5f7b90;text-transform:uppercase}',
    '.edtool{display:inline-block;margin:0 3px 3px 0;padding:3px 7px;background:#132030;border:1px solid #1d2b3a;',
    '  border-radius:3px;cursor:pointer;user-select:none}',
    '.edtool:hover{background:#1b2d42}',
    '.edtool.on{background:#4de3ff;color:#04121a;border-color:#4de3ff}',
    '.edop{padding:2px 5px;border-left:2px solid transparent;cursor:pointer;white-space:nowrap;',
    '  overflow:hidden;text-overflow:ellipsis}',
    '.edop:hover{background:#122031}',
    '.edop.on{background:#16324a;border-left-color:#4de3ff}',
    '.edop .v{color:#ffb23d}',
    '.edop .n{color:#5f7b90}',
    '#ednote{width:100%;box-sizing:border-box;background:#0b1420;color:#cfe3ee;border:1px solid #1d2b3a;',
    '  border-radius:3px;padding:4px;font:11px/1.4 ui-monospace,monospace;resize:vertical}',
    '#edval{white-space:pre-wrap;font-size:10px;line-height:1.5}',
    '.ok{color:#5cff9d}.bad{color:#ff4459}',
    '#edhint{position:absolute;left:10px;bottom:10px;background:rgba(6,10,16,.9);border:1px solid #1d2b3a;',
    '  padding:6px 9px;border-radius:3px;pointer-events:none;color:#6d8ba0}'
  ].join('\n');

  function el(tag, attrs, parent) {
    var e = document.createElement(tag);
    for (var k in attrs) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(e);
    return e;
  }

  function buildUI() {
    var style = el('style', {}, document.head);
    style.textContent = CSS;

    root = el('div', { id: 'edroot' }, document.body);
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'edsvg');
    root.appendChild(svg);
    panel = el('div', { id: 'edpanel' }, root);
    el('div', { id: 'edhint', html:
      'drag&nbsp;background&nbsp;pan &nbsp;·&nbsp; wheel&nbsp;zoom &nbsp;·&nbsp; ' +
      'click&nbsp;op&nbsp;select &nbsp;·&nbsp; arrows&nbsp;nudge &nbsp;·&nbsp; ' +
      'del&nbsp;remove &nbsp;·&nbsp; F2&nbsp;play' }, root);
  }

  function refresh() {
    if (!panel) return;
    var d = P.Authored.def(cur.cx, cur.cy);
    var list = ops();
    panel.innerHTML = '';

    el('h2', { text: 'CYBERVANIA EDITOR' }, panel);

    /* --- chunk --- */
    el('div', { class: 'edsec', text: 'chunk' }, panel);
    var nav = el('div', {}, panel);
    [['◀', -1, 0], ['▶', 1, 0], ['▲', 0, -1], ['▼', 0, 1]].forEach(function (b) {
      var t = el('span', { class: 'edtool', text: b[0] }, nav);
      t.onclick = function () { gotoChunk(cur.cx + b[1], cur.cy + b[2]); };
    });
    el('span', { class: 'edtool', text: '+ new here' }, nav).onclick = newChunkHere;
    el('div', { text: cur.cx + ',' + cur.cy + '   ' +
                      (d ? (d.name || '(unnamed)') : 'EMPTY — press "+ new here"') }, panel);

    if (!d || !list) {
      el('div', { class: 'edsec', text: 'this chunk is a function, not ops — not editable' }, panel);
      return;
    }

    /* --- tools --- */
    el('div', { class: 'edsec', text: 'tools' }, panel);
    var tw = el('div', {}, panel);
    Object.keys(TOOLS).forEach(function (name) {
      var t = el('span', { class: 'edtool' + (tool === name ? ' on' : ''),
                           text: TOOLS[name].label }, tw);
      t.onclick = function () { tool = name; refresh(); };
    });

    /* --- ops --- */
    el('div', { class: 'edsec', text: list.length + ' ops' }, panel);
    var ow = el('div', {}, panel);
    list.forEach(function (op, i) {
      var note = P.Authored.noteOf(op);
      var row = el('div', { class: 'edop' + (i === sel ? ' on' : '') }, ow);
      row.innerHTML = '<span class="v">' + op[0] + '</span> ' +
                      P.Authored.argsOf(op).map(function (v) {
                        return (typeof v === 'object') ? '{…}' :
                               (typeof v === 'number' && v > 0xffff) ? '#' + v.toString(16) : v;
                      }).join(' ') +
                      (note ? ' <span class="n">— ' + note.slice(0, 28) + '</span>' : '');
      row.onclick = function () { sel = i; refresh(); };
    });

    /* --- selection --- */
    if (sel >= 0 && sel < list.length) {
      el('div', { class: 'edsec', text: 'note — what is this for?' }, panel);
      var ta = el('textarea', { id: 'ednote', rows: 3 }, panel);
      ta.value = P.Authored.noteOf(list[sel]);
      ta.oninput = function () {
        var op = list[sel];
        var last = op[op.length - 1];
        if (typeof last === 'string' && last.charAt(0) === '#') op.pop();
        if (ta.value.trim()) op.push('# ' + ta.value.trim());
        dirty[cur.cx + ',' + cur.cy] = 1;
      };
      var del = el('span', { class: 'edtool', text: 'delete op' }, panel);
      del.onclick = deleteSel;
    }

    /* --- room note --- */
    el('div', { class: 'edsec', text: 'room note' }, panel);
    var rn = el('textarea', { id: 'ednote', rows: 4 }, panel);
    rn.value = d.note || '';
    rn.oninput = function () { d.note = rn.value; dirty[cur.cx + ',' + cur.cy] = 1; };

    /* --- checks --- */
    el('div', { class: 'edsec', text: 'checks' }, panel);
    var vw = el('div', { id: 'edval', text: 'press validate' }, panel);
    el('span', { class: 'edtool', text: 'validate' }, panel).onclick = function () {
      var r = P.Validate.all();
      var bad = r.clearance || r.skippable || r.stranded;
      vw.className = bad ? 'bad' : 'ok';
      vw.textContent =
        'headroom/pockets  ' + r.clearance + '\n' +
        'skippable fights  ' + r.skippable + '\n' +
        'unreachable rooms ' + r.stranded +
        (bad ? '\n\nsee the console table for detail' : '\n\nall clear');
      P.World.stream(ED.camX, ED.camY, ED.radX, ED.radY);
      P.World.flush();
    };

    /* --- export --- */
    el('div', { class: 'edsec', text: 'export' }, panel);
    var ex = el('div', {}, panel);
    el('span', { class: 'edtool', text: 'download region.js' }, ex).onclick = function () {
      download('region.js', ED.exportSource());
    };
    el('span', { class: 'edtool', text: 'copy to console' }, ex).onclick = function () {
      console.log(ED.exportSource());
      window.__region = ED.exportSource();
      alert('Source logged to console and put in window.__region');
    };
    var dk = Object.keys(dirty);
    if (dk.length) el('div', { class: 'n', text: 'edited: ' + dk.join(' ') }, panel);
  }

  /* --------------------------------------------------------------------------
     OVERLAY DRAWING
     -------------------------------------------------------------------------- */
  function ns(tag, attrs) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function drawOverlay() {
    if (!svg) return;
    /* The canvas is letterboxed inside the viewport, so the overlay has to sit on the
       canvas rect rather than on the window — otherwise every outline is drawn at an
       offset from the thing it is outlining. */
    var r = canvas.getBoundingClientRect();
    svg.style.left = r.left + 'px';
    svg.style.top = r.top + 'px';
    svg.style.width = r.width + 'px';
    svg.style.height = r.height + 'px';
    svg.setAttribute('viewBox', '0 0 ' + r.width + ' ' + r.height);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    /* chunk borders, for every chunk in view */
    var CW = P.World.CW, CH = P.World.CH;
    var tl = screenToWorld(r.left, r.top), br = screenToWorld(r.right, r.bottom);
    for (var cx = Math.floor(tl.x / CW) - 1; cx <= Math.floor(br.x / CW) + 1; cx++) {
      for (var cy = Math.ceil(-tl.y / CH) - 2; cy <= Math.ceil(-br.y / CH) + 1; cy++) {
        var o = originOf(cx, cy);
        var a = worldToScreen(o.ox, o.oy + CH), b = worldToScreen(o.ox + CW, o.oy);
        var isCur = (cx === cur.cx && cy === cur.cy);
        svg.appendChild(ns('rect', {
          x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y, fill: 'none',
          stroke: isCur ? '#4de3ff' : (P.Authored.has(cx, cy) ? '#24455e' : '#16222e'),
          'stroke-width': isCur ? 2 : 1,
          'stroke-dasharray': P.Authored.has(cx, cy) ? '' : '4 4'
        }));
        var lbl = ns('text', { x: a.x + 5, y: a.y + 13, 'font-size': 10,
                               fill: isCur ? '#4de3ff' : '#33536b',
                               'font-family': 'ui-monospace, monospace' });
        lbl.textContent = cx + ',' + cy;
        svg.appendChild(lbl);
      }
    }

    /* the current chunk's ops */
    var list = ops();
    if (list) {
      var oc = originOf(cur.cx, cur.cy);
      list.forEach(function (op, i) {
        var bb = boundsOf(op);
        if (!bb) return;
        var p0 = worldToScreen(oc.ox + bb.x0, oc.oy + bb.y1);
        var p1 = worldToScreen(oc.ox + bb.x1, oc.oy + bb.y0);
        var solid = SOLID[op[0]];
        svg.appendChild(ns('rect', {
          x: p0.x, y: p0.y, width: Math.max(1, p1.x - p0.x), height: Math.max(1, p1.y - p0.y),
          fill: i === sel ? 'rgba(77,227,255,.20)' : 'none',
          stroke: i === sel ? '#4de3ff' : (solid ? '#5cff9d' : '#ffb23d'),
          'stroke-width': i === sel ? 2 : 1,
          'stroke-dasharray': solid ? '' : '3 3'
        }));
      });
    }

    /* the drag in progress */
    if (drag) {
      var q0 = worldToScreen(Math.min(drag.x0, drag.x1), Math.max(drag.y0, drag.y1));
      var q1 = worldToScreen(Math.max(drag.x0, drag.x1), Math.min(drag.y0, drag.y1));
      svg.appendChild(ns('rect', {
        x: q0.x, y: q0.y, width: Math.max(1, q1.x - q0.x), height: Math.max(1, q1.y - q0.y),
        fill: 'rgba(92,255,157,.18)', stroke: '#5cff9d', 'stroke-width': 1.5
      }));
    }
  }

  /* --------------------------------------------------------------------------
     INPUT
     -------------------------------------------------------------------------- */
  var pan = null;

  function onDown(e) {
    if (e.target.closest && e.target.closest('#edpanel')) return;
    var w = screenToWorld(e.clientX, e.clientY);
    var t = TOOLS[tool];

    if (e.button === 2 || e.shiftKey || tool === 'select') {
      /* select: topmost op whose bounds contain the point, else start a pan */
      if (tool === 'select' && e.button !== 2 && !e.shiftKey) {
        var list = ops(), o = originOf(cur.cx, cur.cy), hit = -1;
        if (list) for (var i = list.length - 1; i >= 0; i--) {
          var bb = boundsOf(list[i]);
          if (!bb) continue;
          if (w.x >= o.ox + bb.x0 && w.x <= o.ox + bb.x1 &&
              w.y >= o.oy + bb.y0 && w.y <= o.oy + bb.y1) { hit = i; break; }
        }
        if (hit >= 0) { sel = hit; refresh(); drawOverlay(); return; }
      }
      pan = { x: e.clientX, y: e.clientY, cx: ED.camX, cy: ED.camY };
      return;
    }

    var o2 = originOf(cur.cx, cur.cy);
    var lx = snap(w.x - o2.ox), ly = snap(w.y - o2.oy);
    if (t.kind === 'point') { addOp(t.make({ x: lx, y: ly })); drawOverlay(); return; }
    drag = { x0: lx, y0: ly, x1: lx, y1: ly, ox: o2.ox, oy: o2.oy };
  }

  function onMove(e) {
    if (pan) {
      var r = canvas.getBoundingClientRect();
      /* Pixels to world units at the edit plane, so a drag tracks the cursor exactly. */
      var a = screenToWorld(e.clientX, e.clientY), b = screenToWorld(pan.x, pan.y);
      ED.camX = pan.cx - (a.x - b.x);
      ED.camY = pan.cy - (a.y - b.y);
      void r;
      return;
    }
    if (drag) {
      var w = screenToWorld(e.clientX, e.clientY);
      drag.x1 = snap(w.x - drag.ox);
      drag.y1 = snap(w.y - drag.oy);
    }
  }

  function onUp() {
    pan = null;
    if (!drag) return;
    var t = TOOLS[tool];
    var r = { x0: Math.min(drag.x0, drag.x1), x1: Math.max(drag.x0, drag.x1),
              y0: Math.min(drag.y0, drag.y1), y1: Math.max(drag.y0, drag.y1) };
    var raw = { x0: drag.x0, y0: drag.y0, x1: drag.x1, y1: drag.y1 };
    drag = null;
    if (t.kind === 'line') { addOp(t.make(raw)); return; }
    if (r.x1 - r.x0 < 0.5 || r.y1 - r.y0 < 0.5) { refresh(); return; }
    addOp(t.make(r));
  }

  function onWheel(e) {
    if (e.target.closest && e.target.closest('#edpanel')) return;
    e.preventDefault();
    ED.camZ = Math.max(20, Math.min(220, ED.camZ * (e.deltaY > 0 ? 1.12 : 0.89)));
    /* Keep enough world resident to edit at whatever zoom is chosen. */
    ED.radX = Math.max(2, Math.round(ED.camZ / 16));
    ED.radY = Math.max(2, Math.round(ED.camZ / 24));
  }

  function onKey(e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    var step = e.shiftKey ? 1 : SNAP;
    if (e.code === 'ArrowLeft')  { nudgeSel(-step, 0); e.preventDefault(); }
    if (e.code === 'ArrowRight') { nudgeSel(step, 0);  e.preventDefault(); }
    if (e.code === 'ArrowUp')    { nudgeSel(0, step);  e.preventDefault(); }
    if (e.code === 'ArrowDown')  { nudgeSel(0, -step); e.preventDefault(); }
    if (e.code === 'Delete' || e.code === 'Backspace') { deleteSel(); e.preventDefault(); }
    if (e.code === 'Escape') { sel = -1; tool = 'select'; refresh(); }
  }

  /* --------------------------------------------------------------------------
     LIFECYCLE
     -------------------------------------------------------------------------- */
  /* Read-only view of what the editor is pointed at. For the console, and for tests. */
  ED.current = function () {
    return { cx: cur.cx, cy: cur.cy, tool: tool, sel: sel,
             name: (P.Authored.def(cur.cx, cur.cy) || {}).name || null,
             ops: (P.Authored.ops(cur.cx, cur.cy) || []).length,
             dirty: Object.keys(dirty) };
  };
  ED.goto = gotoChunk;
  ED.setTool = function (t) { if (TOOLS[t]) { tool = t; refresh(); } return tool; };

  ED.step = function () {
    /* The current chunk follows the camera. Without this, panning to another room and
       drawing puts the op in the room you just left — which is a data-loss bug wearing
       a UI bug's clothes. Not while dragging, so a gesture that strays over a seam
       still lands where it started. */
    if (!drag && !pan) {
      var c = chunkUnderCam();
      if (c.cx !== cur.cx || c.cy !== cur.cy) {
        cur.cx = c.cx; cur.cy = c.cy; sel = -1;
        refresh();
      }
    }
    drawOverlay();
  };

  ED.enable = function () {
    if (ED.active) return;
    canvas = P.canvas || document.querySelector('canvas');
    if (!root) buildUI();
    root.style.display = '';
    ED.active = true;
    /* Start where the player is, so "edit what I was just standing in" works. */
    ED.camX = P.Player.x; ED.camY = P.Player.y + 4;
    /* A chunk is 24 units and the camera sees 2*z*tan(13deg) of height, so z=62 frames
       one room with a margin. */
    ED.camZ = 62;
    ED.radX = 5; ED.radY = 4;
    var c = chunkUnderCam();
    gotoChunk(P.Authored.has(c.cx, c.cy) ? c.cx : cur.cx,
              P.Authored.has(c.cx, c.cy) ? c.cy : cur.cy);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    root.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };

  ED.disable = function () {
    if (!ED.active) return;
    ED.active = false;
    if (root) root.style.display = 'none';
    window.removeEventListener('mousedown', onDown);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKey);
    /* Drop the player into the chunk being edited, so testing an edit is instant.
       Not at the top of it — the top of a chunk is usually inside the ceiling, or in the
       rock above. Stand them on this room's own floor: its spawn point if it has one,
       otherwise just above the lowest floor in it, and only then fall back to the world
       spawn. */
    var o = originOf(cur.cx, cur.cy);
    var list = ops(), at = null, i, a;
    if (list) {
      for (i = 0; i < list.length && !at; i++) {
        if (list[i][0] === 'spawn') { a = P.Authored.argsOf(list[i]); at = { x: a[1], y: a[2] }; }
      }
      var lowest = null;
      if (!at) for (i = 0; i < list.length; i++) {
        if (list[i][0] !== 'floor') continue;
        a = P.Authored.argsOf(list[i]);
        if (lowest === null || a[2] < lowest.y) lowest = { x: (a[0] + a[1]) / 2, y: a[2] };
      }
      if (!at && lowest) at = { x: lowest.x, y: lowest.y + 0.5 };
    }
    if (at) P.Player.spawn(o.ox + at.x, o.oy + at.y);
    else { var sp = P.World.spawnPoint(); P.Player.spawn(sp.x, sp.y); }
    P.World.stream(P.Player.x, P.Player.y);
    P.World.flush();
  };

  ED.toggle = function () { ED.active ? ED.disable() : ED.enable(); };

  P.bootEditor = function () {
    window.addEventListener('keydown', function (e) {
      if (e.code === 'F2') { e.preventDefault(); ED.toggle(); }
    });
    if (/[?&]edit\b/.test(location.search)) ED.enable();
  };

})(window.PROTO = window.PROTO || {});
