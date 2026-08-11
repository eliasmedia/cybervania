/* CYBERVANIA — render/gfx.js
   Canvas helpers and the bitmap font. The whole game is uppercase 5x7 phosphor type;
   that is a style decision (CRT terminals) and a practical one (one legible glyph set
   at 5 px, no font files, no FOUT, works offline). */
(function (CV) {
  'use strict';

  var G = CV.Gfx = {};

  G.makeCanvas = function (w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return c;
  };

  G.ctxOf = function (canvas) {
    var x = canvas.getContext('2d');
    x.imageSmoothingEnabled = false;
    return x;
  };

  /* ---------------------------------------------------------------------------
     5x7 bitmap font. Rows separated by '/', '#' = ink.
     --------------------------------------------------------------------------- */
  var GLYPHS = {
    'A': '.###./#...#/#...#/#####/#...#/#...#/#...#',
    'B': '####./#...#/#...#/####./#...#/#...#/####.',
    'C': '.###./#...#/#..../#..../#..../#...#/.###.',
    'D': '####./#...#/#...#/#...#/#...#/#...#/####.',
    'E': '#####/#..../#..../####./#..../#..../#####',
    'F': '#####/#..../#..../####./#..../#..../#....',
    'G': '.###./#...#/#..../#.###/#...#/#...#/.####',
    'H': '#...#/#...#/#...#/#####/#...#/#...#/#...#',
    'I': '#####/..#../..#../..#../..#../..#../#####',
    'J': '..###/...#./...#./...#./...#./#..#./.##..',
    'K': '#...#/#..#./#.#../##.../#.#../#..#./#...#',
    'L': '#..../#..../#..../#..../#..../#..../#####',
    'M': '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
    'N': '#...#/##..#/##..#/#.#.#/#..##/#..##/#...#',
    'O': '.###./#...#/#...#/#...#/#...#/#...#/.###.',
    'P': '####./#...#/#...#/####./#..../#..../#....',
    'Q': '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
    'R': '####./#...#/#...#/####./#.#../#..#./#...#',
    'S': '.###./#...#/#..../.###./....#/#...#/.###.',
    'T': '#####/..#../..#../..#../..#../..#../..#..',
    'U': '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
    'V': '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
    'W': '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
    'X': '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
    'Y': '#...#/#...#/.#.#./..#../..#../..#../..#..',
    'Z': '#####/....#/...#./..#../.#.../#..../#####',
    '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
    '1': '..#../.##../..#../..#../..#../..#../.###.',
    '2': '.###./#...#/....#/..##./.#.../#..../#####',
    '3': '####./....#/....#/.###./....#/....#/####.',
    '4': '...#./..##./.#.#./#..#./#####/...#./...#.',
    '5': '#####/#..../####./....#/....#/#...#/.###.',
    '6': '..##./.#.../#..../####./#...#/#...#/.###.',
    '7': '#####/....#/...#./..#../.#.../.#.../.#...',
    '8': '.###./#...#/#...#/.###./#...#/#...#/.###.',
    '9': '.###./#...#/#...#/.####/....#/...#./.##..',
    ' ': '...../...../...../...../...../...../.....',
    '.': '...../...../...../...../...../...../..#..',
    ',': '...../...../...../...../...../..#../.#...',
    ':': '...../...#./...#./...../...#./...#./.....',
    ';': '...../..#../..#../...../..#../..#../.#...',
    '!': '..#../..#../..#../..#../..#../...../..#..',
    '?': '.###./#...#/....#/..##./..#../...../..#..',
    "'": '..#../..#../...../...../...../...../.....',
    '"': '.#.#./.#.#./...../...../...../...../.....',
    '-': '...../...../...../.###./...../...../.....',
    '_': '...../...../...../...../...../...../#####',
    '+': '...../..#../..#../#####/..#../..#../.....',
    '=': '...../...../#####/...../#####/...../.....',
    '*': '...../.#.#./..#../#####/..#../.#.#./.....',
    '/': '....#/....#/...#./..#../.#.../#..../#....',
    '\\':'#..../#..../.#.../..#../...#./....#/....#',
    '(': '..##./.#.../#..../#..../#..../.#.../..##.',
    ')': '.##../...#./....#/....#/....#/...#./.##..',
    '[': '.###./.#.../.#.../.#.../.#.../.#.../.###.',
    ']': '.###./...#./...#./...#./...#./...#./.###.',
    '<': '...#./..#../.#.../#..../.#.../..#../...#.',
    '>': '.#.../..#../...#./....#/...#./..#../.#...',
    '%': '#...#/#..#./...#./..#../.#.../#..#./#...#',
    '#': '.#.#./#####/.#.#./#####/.#.#./...../.....',
    '@': '.###./#...#/#.###/#.#.#/#.###/#..../.###.',
    '&': '.##../#..#./.##../##.#./#..##/#..#./.##.#',
    '$': '..#../.####/#.#../.###./..#.#/####./..#..',
    '|': '..#../..#../..#../..#../..#../..#../..#..',
    '^': '..#../.#.#./#...#/...../...../...../.....',
    '~': '...../...../.#..#/#.#.#/#..#./...../.....',
    '\u00b0': '.##../#..#./.##../...../...../...../.....',
    '\u2588': '#####/#####/#####/#####/#####/#####/#####',
    '\u2592': '#.#.#/.#.#./#.#.#/.#.#./#.#.#/.#.#./#.#.#'
  };

  var FW = 5, FH = 7, FGAP = 1;
  G.charW = FW + FGAP;   // 6
  G.charH = FH;

  /* Glyphs are baked once per (colour) into a strip canvas. Text rendering is then
     one drawImage per character — no per-pixel work at runtime. */
  var strips = {};
  var ORDER = Object.keys(GLYPHS);
  var INDEX = {};
  for (var gi = 0; gi < ORDER.length; gi++) INDEX[ORDER[gi]] = gi;

  function buildStrip(color) {
    var c = G.makeCanvas(ORDER.length * FW, FH), x = G.ctxOf(c);
    x.fillStyle = color;
    for (var i = 0; i < ORDER.length; i++) {
      var rows = GLYPHS[ORDER[i]].split('/');
      for (var r = 0; r < FH; r++) {
        var row = rows[r] || '';
        for (var col = 0; col < FW; col++) {
          if (row.charAt(col) === '#') x.fillRect(i * FW + col, r, 1, 1);
        }
      }
    }
    return c;
  }

  function strip(color) {
    return strips[color] || (strips[color] = buildStrip(color));
  }

  /* Typographic characters that turn up in authored prose get folded onto the nearest
     glyph we actually have, rather than rendering as '?'. */
  var ALIAS = {
    '—': '-', '–': '-', '−': '-',       // em dash, en dash, minus
    '‘': "'", '’': "'", '“': '"', '”': '"',
    '·': '.', '•': '*', '…': '.',        // middot, bullet, ellipsis
    '→': '>', '←': '<', '↑': '^', '↓': 'v',
    ' ': ' '
  };
  G.alias = ALIAS;

  G.textWidth = function (str, scale) {
    scale = scale || 1;
    return str.length * (FW + FGAP) * scale - FGAP * scale;
  };

  /* Draw uppercase text. Lowercase is folded to uppercase — the game speaks in
     terminal caps everywhere, by design. */
  G.text = function (ctx, str, x, y, color, scale, opts) {
    scale = scale || 1;
    opts = opts || 0;
    str = String(str).toUpperCase();
    var s = strip(color), px = x | 0, py = y | 0, step = (FW + FGAP) * scale;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      var idx = INDEX[ch];
      if (idx === undefined) {
        var a = ALIAS[ch];
        idx = a !== undefined ? INDEX[a] : INDEX['?'];
        if (a === ' ') ch = ' ';
      }
      if (ch !== ' ') {
        ctx.drawImage(s, idx * FW, 0, FW, FH, px + i * step, py, FW * scale, FH * scale);
      }
    }
    return px + str.length * step;
  };

  G.textCentered = function (ctx, str, cx, y, color, scale) {
    scale = scale || 1;
    G.text(ctx, str, cx - G.textWidth(String(str), scale) / 2, y, color, scale);
  };

  G.textRight = function (ctx, str, rx, y, color, scale) {
    scale = scale || 1;
    G.text(ctx, str, rx - G.textWidth(String(str), scale), y, color, scale);
  };

  /* Text with a soft neon halo. Used sparingly — headers and the title only. */
  G.textGlow = function (ctx, str, x, y, color, scale, glow) {
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.globalCompositeOperation = 'lighter';
    for (var d = 1; d <= (glow || 1); d++) {
      G.text(ctx, str, x - d, y, color, scale);
      G.text(ctx, str, x + d, y, color, scale);
      G.text(ctx, str, x, y - d, color, scale);
      G.text(ctx, str, x, y + d, color, scale);
    }
    ctx.restore();
    G.text(ctx, str, x, y, color, scale);
  };

  /* Word-wrap into an array of lines that fit `maxW` pixels. */
  G.wrap = function (str, maxW, scale) {
    scale = scale || 1;
    var per = (FW + FGAP) * scale;
    var max = Math.max(1, Math.floor(maxW / per));
    var words = String(str).split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (w === '\n') { lines.push(cur); cur = ''; continue; }
      var test = cur ? cur + ' ' + w : w;
      if (test.length > max && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  /* ---------------------------------------------------------------------------
     Shape helpers. All integer-snapped: sub-pixel rects produce blurry edges that
     ruin the pixel look.
     --------------------------------------------------------------------------- */
  G.rect = function (ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0));
  };

  G.frame = function (ctx, x, y, w, h, color, t) {
    t = t || 1;
    ctx.fillStyle = color;
    x |= 0; y |= 0; w |= 0; h |= 0;
    ctx.fillRect(x, y, w, t);
    ctx.fillRect(x, y + h - t, w, t);
    ctx.fillRect(x, y, t, h);
    ctx.fillRect(x + w - t, y, t, h);
  };

  /* A terminal panel: dark fill, bright frame, corner ticks. The UI's basic unit. */
  G.panel = function (ctx, x, y, w, h, color, fillAlpha) {
    x |= 0; y |= 0; w |= 0; h |= 0;
    ctx.fillStyle = 'rgba(4,8,12,' + (fillAlpha === undefined ? 0.88 : fillAlpha) + ')';
    ctx.fillRect(x, y, w, h);
    G.frame(ctx, x, y, w, h, color, 1);
    ctx.fillStyle = color;
    var k = 3;
    ctx.fillRect(x + 1, y + 1, k, 1); ctx.fillRect(x + 1, y + 1, 1, k);
    ctx.fillRect(x + w - 1 - k, y + 1, k, 1); ctx.fillRect(x + w - 2, y + 1, 1, k);
    ctx.fillRect(x + 1, y + h - 2, k, 1); ctx.fillRect(x + 1, y + h - 1 - k, 1, k);
    ctx.fillRect(x + w - 1 - k, y + h - 2, k, 1); ctx.fillRect(x + w - 2, y + h - 1 - k, 1, k);
  };

  G.line = function (ctx, x0, y0, x1, y1, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    ctx.beginPath();
    ctx.moveTo((x0 | 0) + .5, (y0 | 0) + .5);
    ctx.lineTo((x1 | 0) + .5, (y1 | 0) + .5);
    ctx.stroke();
  };

  /* Dashed line used for grapple rope, scan beams and map connections. */
  G.dashLine = function (ctx, x0, y0, x1, y1, color, dash, phase) {
    var dx = x1 - x0, dy = y1 - y0, len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) return;
    var steps = Math.floor(len / dash), ux = dx / len, uy = dy / len;
    ctx.fillStyle = color;
    for (var i = 0; i < steps; i++) {
      if (((i + (phase | 0)) & 1) === 0) continue;
      var t = i * dash;
      ctx.fillRect((x0 + ux * t) | 0, (y0 + uy * t) | 0, 1, 1);
    }
  };

  G.circle = function (ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.28318);
    ctx.fill();
  };

  G.ring = function (ctx, cx, cy, r, color, w) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w || 1;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0.5, r), 0, 6.28318);
    ctx.stroke();
  };

  /* Additive glow blob — the neon workhorse. Cached gradients by (radius,colour). */
  var glowCache = {};
  G.glow = function (ctx, cx, cy, r, color, alpha) {
    var key = color + '|' + (r | 0);
    var img = glowCache[key];
    if (!img) {
      var d = (r | 0) * 2;
      img = G.makeCanvas(d, d);
      var gx = G.ctxOf(img);
      var grad = gx.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, CV.Palette.alpha(color, 0.9));
      grad.addColorStop(0.45, CV.Palette.alpha(color, 0.28));
      grad.addColorStop(1, CV.Palette.alpha(color, 0));
      gx.fillStyle = grad;
      gx.fillRect(0, 0, d, d);
      glowCache[key] = img;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.drawImage(img, (cx - r) | 0, (cy - r) | 0);
    ctx.restore();
  };

  /* Scanline-style horizontal bar with a bright cap — used for the energy meter. */
  G.meter = function (ctx, x, y, w, h, frac, color, back) {
    G.rect(ctx, x, y, w, h, back || '#0d1620');
    var fw = Math.round(w * CV.Util.clamp(frac, 0, 1));
    if (fw > 0) {
      G.rect(ctx, x, y, fw, h, color);
      G.rect(ctx, x, y, fw, 1, CV.Palette.mix(color, '#ffffff', .55));
      if (fw < w) G.rect(ctx, x + fw - 1, y, 1, h, '#ffffff');
    }
  };

})(window.CV = window.CV || {});
