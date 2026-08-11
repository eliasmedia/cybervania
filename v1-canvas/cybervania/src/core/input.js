/* CYBERVANIA — core/input.js
   Action-mapped input with edge detection, per-action buffering and rebinding.
   Gameplay code never sees a key code: it asks "is DASH buffered?", which is what
   makes buffer windows (game feel, rule 30) trivial to tune in one place. */
(function (CV) {
  'use strict';

  var I = CV.Input = {};

  /* Default bindings. Every action accepts several physical keys so both
     WASD+JKL and arrows+ZXC players are first-class. */
  var DEFAULTS = {
    left:    ['ArrowLeft', 'KeyA'],
    right:   ['ArrowRight', 'KeyD'],
    up:      ['ArrowUp', 'KeyW'],
    down:    ['ArrowDown', 'KeyS'],
    jump:    ['Space', 'KeyX', 'KeyK'],
    attack:  ['KeyZ', 'KeyJ'],
    dash:    ['ShiftLeft', 'KeyC', 'ShiftRight'],
    grapple: ['KeyV', 'KeyL'],
    special: ['KeyB', 'KeyU'],
    shift:   ['KeyF'],
    interact:['KeyE'],
    frame1:  ['Digit1'], frame2: ['Digit2'], frame3: ['Digit3'], frame4: ['Digit4'],
    cycleL:  ['KeyQ'], cycleR: ['KeyR'],
    map:     ['Tab'],
    pause:   ['Escape'],
    debug:   ['F3'],
    console: ['Backquote']
  };

  /* Buffer window per action, in seconds. A buffered press stays "fresh" this long,
     so an input made just before landing still fires. 0 = no buffering. */
  var BUFFER = {
    jump: 0.12, dash: 0.10, attack: 0.14, grapple: 0.10, special: 0.10, shift: 0.10
  };

  var binds = {}, down = {}, pressedAt = {}, consumed = {}, time = 0;
  /* Presses arrive from DOM events at arbitrary moments between frames. They are
     queued here and promoted to "pressed this step" at the top of the frame, then
     cleared after the first simulation step consumes them. Without this, an edge
     press that lands between two frames is silently lost. */
  var pendingPress = {}, pendingRelease = {}, pressedNow = {}, releasedNow = {};
  var actions = Object.keys(DEFAULTS);

  function resetBinds(src) {
    binds = {};
    for (var a in src) {
      for (var i = 0; i < src[a].length; i++) {
        (binds[src[a][i]] || (binds[src[a][i]] = [])).push(a);
      }
    }
  }

  I.bindings = JSON.parse(JSON.stringify(DEFAULTS));
  I.defaults = DEFAULTS;
  I.actions = actions;
  I.anyKeyAt = -999;
  I.lastCode = '';

  I.applyBindings = function (b) {
    I.bindings = b || JSON.parse(JSON.stringify(DEFAULTS));
    for (var a in DEFAULTS) if (!I.bindings[a]) I.bindings[a] = DEFAULTS[a].slice();
    resetBinds(I.bindings);
  };

  I.rebind = function (action, code) {
    /* A key may only serve one action; steal it from whoever had it. */
    for (var a in I.bindings) {
      var idx = I.bindings[a].indexOf(code);
      if (idx >= 0 && a !== action) I.bindings[a].splice(idx, 1);
    }
    I.bindings[action] = [code];
    resetBinds(I.bindings);
  };

  I.resetBindings = function () { I.applyBindings(null); };

  I.init = function (canvas) {
    I.applyBindings(I.bindings);

    window.addEventListener('keydown', function (e) {
      /* Tab and the arrows/space would otherwise scroll or move focus out of the game. */
      if (e.code === 'Tab' || e.code === 'Space' || e.code.indexOf('Arrow') === 0 ||
          e.code === 'F3' || e.code === 'Backquote') e.preventDefault();

      I.lastCode = e.code;
      I.anyKeyAt = time;
      if (e.repeat) return;
      if (!down[e.code]) { down[e.code] = true; markPress(e.code); }
    }, { passive: false });

    window.addEventListener('keyup', function (e) {
      down[e.code] = false;
      var list = binds[e.code];
      if (list) for (var i = 0; i < list.length; i++) pendingRelease[list[i]] = true;
    });

    /* Losing focus mid-dash used to leave a key stuck down. Clear everything. */
    window.addEventListener('blur', function () {
      down = {};
      CV.emit('focus:lost');
    });

    canvas.addEventListener('mousedown', function () { canvas.focus(); });
    canvas.focus();
  };

  function markPress(code) {
    var list = binds[code];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      pressedAt[list[i]] = time;
      consumed[list[i]] = false;
      pendingPress[list[i]] = true;
    }
  }

  /* Called once per rendered frame, before any simulation step. */
  I.update = function (dt) {
    time += dt;
    pressedNow = pendingPress; pendingPress = {};
    releasedNow = pendingRelease; pendingRelease = {};
  };

  /* Called by the engine after each fixed step, so a single physical press cannot
     be acted on twice when a frame runs several simulation steps. */
  I.endStep = function () {
    if (pressedNow !== EMPTY) pressedNow = EMPTY;
    if (releasedNow !== EMPTY) releasedNow = EMPTY;
  };
  var EMPTY = {};

  I.now = function () { return time; };

  /* Held this frame. */
  I.held = function (a) {
    var keys = I.bindings[a];
    if (!keys) return false;
    for (var i = 0; i < keys.length; i++) if (down[keys[i]]) return true;
    return false;
  };

  /* Pressed on this exact step — for menus and toggles, never for gameplay verbs
     (those use buffered(), which forgives a press made slightly too early). */
  I.pressed = function (a) { return pressedNow[a] === true; };
  I.released = function (a) { return releasedNow[a] === true; };

  /* Pressed recently and not yet used. This is what gameplay asks for: combined with
     coyote time it produces the "it did what I meant" feel. */
  I.buffered = function (a) {
    if (consumed[a]) return false;
    var w = BUFFER[a] || 0.02;
    return pressedAt[a] !== undefined && (time - pressedAt[a]) <= w;
  };

  /* Call after acting on a buffered press so it cannot fire twice. */
  I.consume = function (a) { consumed[a] = true; };

  I.axisX = function () { return (I.held('right') ? 1 : 0) - (I.held('left') ? 1 : 0); };
  I.axisY = function () { return (I.held('down') ? 1 : 0) - (I.held('up') ? 1 : 0); };

  I.clear = function () {
    down = {}; pressedAt = {}; consumed = {};
    pendingPress = {}; pendingRelease = {}; pressedNow = {}; releasedNow = {};
  };

  /* Human-readable key name for the controls screen. */
  I.label = function (code) {
    return code
      .replace('ArrowLeft', '←').replace('ArrowRight', '→')
      .replace('ArrowUp', '↑').replace('ArrowDown', '↓')
      .replace('Key', '').replace('Digit', '').replace('Left', ' L').replace('Right', ' R')
      .replace('Backquote', '`').replace('Space', 'SPACE').replace('Escape', 'ESC');
  };

  I.labelFor = function (action) {
    var k = I.bindings[action];
    return k && k.length ? I.label(k[0]) : '--';
  };

})(window.CV = window.CV || {});
