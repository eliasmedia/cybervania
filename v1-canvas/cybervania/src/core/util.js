/* CYBERVANIA — core/util.js
   Maths, constants, tiny helpers and the object pool. No allocation in hot paths. */
(function (CV) {
  'use strict';

  CV.W = 512;          // internal framebuffer width  (32 tiles)
  CV.H = 288;          // internal framebuffer height (18 tiles)
  CV.TILE = 16;
  CV.STEP = 1 / 120;   // fixed simulation step — see TECHNICAL_DESIGN §2

  var U = CV.Util = {};

  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.sign = function (v) { return v < 0 ? -1 : v > 0 ? 1 : 0; };
  U.abs = Math.abs;

  /* Frame-rate independent exponential smoothing. `rate` = how much of the gap is closed
     per second. Using this instead of raw lerp keeps camera/UI motion identical at any fps. */
  U.damp = function (a, b, rate, dt) { return b + (a - b) * Math.exp(-rate * dt); };

  /* Move `v` toward `target` by at most `amount`. The workhorse for acceleration. */
  U.approach = function (v, target, amount) {
    return v < target ? Math.min(v + amount, target) : Math.max(v - amount, target);
  };

  U.aabb = function (a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };

  U.rectsOverlap = function (ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  };

  U.dist2 = function (ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay; return dx * dx + dy * dy;
  };

  U.dist = function (ax, ay, bx, by) { return Math.sqrt(U.dist2(ax, ay, bx, by)); };

  U.angleTo = function (ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); };

  /* Smooth 0..1 easing curves used all over the UI and boss telegraphs. */
  U.easeOut = function (t) { return 1 - (1 - t) * (1 - t); };
  U.easeIn = function (t) { return t * t; };
  U.easeInOut = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  U.easeOutBack = function (t) {
    var c = 1.70158, c3 = c + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  };

  /* Deterministic value noise — used for rain drift, glitch timing, background variety.
     Seeded, so replays and boss patterns stay reproducible. */
  U.hash11 = function (n) {
    n = (n << 13) ^ n;
    return 1 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824;
  };
  U.noise1 = function (x) {
    var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return U.lerp(U.hash11(i), U.hash11(i + 1), u);
  };

  U.pad = function (n, len, ch) {
    var s = String(n); ch = ch || '0';
    while (s.length < len) s = ch + s;
    return s;
  };

  U.timeString = function (sec) {
    var h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = Math.floor(sec) % 60;
    return U.pad(h, 2) + ':' + U.pad(m, 2) + ':' + U.pad(s, 2);
  };

  /* ---------------------------------------------------------------------------
     Object pool. Particles, projectiles, debris, damage popups and hit sparks all
     live in pools so the gameplay loop never allocates and the GC never stutters.
     --------------------------------------------------------------------------- */
  U.Pool = function (factory, reset, size) {
    this.items = new Array(size);
    this.reset = reset;
    this.count = 0;              // items[0 .. count-1] are live
    for (var i = 0; i < size; i++) this.items[i] = factory();
  };

  U.Pool.prototype.spawn = function () {
    if (this.count >= this.items.length) {
      /* Pool exhausted: recycle the oldest live item rather than growing. Visual
         effects degrade gracefully instead of the frame budget degrading. */
      var oldest = this.items[0];
      this.items.copyWithin(0, 1, this.count);
      this.items[this.count - 1] = oldest;
      this.reset(oldest);
      return oldest;
    }
    var it = this.items[this.count++];
    this.reset(it);
    return it;
  };

  /* Swap-remove: O(1), order not preserved (irrelevant for effects). */
  U.Pool.prototype.release = function (index) {
    var last = --this.count, tmp = this.items[index];
    this.items[index] = this.items[last];
    this.items[last] = tmp;
  };

  U.Pool.prototype.clear = function () { this.count = 0; };

  /* ---------------------------------------------------------------------------
     Minimal event bus — decouples systems (a boss death does not need to know that
     the map, the save system and the music director all care about it).
     --------------------------------------------------------------------------- */
  var handlers = {};
  CV.on = function (evt, fn) { (handlers[evt] || (handlers[evt] = [])).push(fn); };
  CV.emit = function (evt, a, b) {
    var list = handlers[evt];
    if (!list) return;
    for (var i = 0; i < list.length; i++) list[i](a, b);
  };

})(window.CV = window.CV || {});
