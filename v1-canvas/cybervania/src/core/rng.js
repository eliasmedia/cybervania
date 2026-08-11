/* CYBERVANIA — core/rng.js
   Seeded RNG. Gameplay never calls Math.random(): boss patterns, enemy jitter and
   procedural art all route through here so runs are reproducible for debugging. */
(function (CV) {
  'use strict';

  function Rng(seed) { this.s = (seed >>> 0) || 0x9e3779b9; }

  /* mulberry32 — fast, tiny, statistically fine for a game. */
  Rng.prototype.next = function () {
    this.s = (this.s + 0x6D2B79F5) >>> 0;
    var t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  Rng.prototype.range = function (a, b) { return a + this.next() * (b - a); };
  Rng.prototype.int = function (a, b) { return Math.floor(this.range(a, b + 1)); };
  Rng.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  Rng.prototype.chance = function (p) { return this.next() < p; };
  Rng.prototype.sign = function () { return this.next() < .5 ? -1 : 1; };
  Rng.prototype.fork = function (salt) { return new Rng((this.s ^ (salt * 0x85ebca6b)) >>> 0); };

  CV.Rng = Rng;

  /* Three separate streams so that, e.g., spawning a particle can never desync
     a boss's attack selection. */
  CV.rng = new Rng(0xC17E1A);      // gameplay
  CV.rngFX = new Rng(0x5EED17);    // cosmetic effects
  CV.rngArt = new Rng(0xA57E11);   // boot-time asset generation

})(window.CV = window.CV || {});
