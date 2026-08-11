/* CYBERVANIA — render/palette.js
   One 24-colour master palette, plus per-region tints. Every generated sprite and tile
   pulls from here, which is what makes procedural art stay stylistically coherent
   (GAME_DESIGN §8). Adding a colour outside this list is a bug, not a feature. */
(function (CV) {
  'use strict';

  var P = CV.Palette = {};

  /* Master ramp. Named by role, not by hue, so a region tint can swap the hue
     without any sprite code changing meaning. */
  P.c = {
    void:      '#05060a',
    ink:       '#0a0d14',   // 1px outline on every sprite — the style's backbone
    shadow:    '#131a26',
    steelDark: '#1e2938',
    steel:     '#33445c',
    steelLit:  '#4d6484',
    chrome:    '#7d94ad',
    chromeLit: '#b6c8d8',
    white:     '#eef6ff',

    cyan:      '#4de3ff',   // the player. Nothing else in the physical world is this colour.
    cyanDim:   '#1d6f8c',
    cyanGlow:  '#a8f4ff',

    magenta:   '#ff3d9e',
    magentaDim:'#8c1c53',
    violet:    '#8b5cf6',

    amber:     '#ffb23d',   // hazard / heavy frame
    amberDim:  '#8c5c14',
    red:       '#ff4459',   // damage. Only ever damage.
    redDim:    '#8c1f2c',

    green:     '#5cff9d',   // phosphor / data-safe
    greenDim:  '#1c6b3f',
    phosphor:  '#7ef2d0',

    rust:      '#8c5230',
    concrete:  '#3a3f47'
  };

  /* Per-region look. `bg` drives the parallax gradient, `key` is the region's
     neon accent, `solid`/`solidLit` are the tileset body colours. */
  P.regions = {
    undercity: {
      name: 'UNDERCITY',
      bg: ['#100c07', '#211710', '#33200d'],
      key: P.c.amber, key2: P.c.rust,
      solid: '#463527', solidLit: '#6b533a', solidEdge: '#9c7148',
      fog: 'rgba(60,36,16,0.16)', light: 'rgba(255,178,61,0.10)'
    },
    house: {
      name: 'RESIDENTIAL BLOCK 7',
      bg: ['#0c0e14', '#161c2b', '#242c40'],
      key: P.c.green, key2: P.c.phosphor,
      solid: '#39434f', solidLit: '#59677a', solidEdge: '#8496a8',
      fog: 'rgba(40,60,60,0.10)', light: 'rgba(92,255,157,0.07)'
    },
    neoncity: {
      name: 'NEON CITY',
      bg: ['#080a16', '#111834', '#1e2857'],
      key: P.c.magenta, key2: P.c.cyan,
      solid: '#232e42', solidLit: '#3d4f70', solidEdge: '#6d88b5',
      fog: 'rgba(30,20,60,0.20)', light: 'rgba(255,61,158,0.09)', rain: 1
    },
    oldnetwork: {
      name: 'OLD NETWORK',
      bg: ['#061013', '#0c2028', '#123630'],
      key: P.c.green, key2: '#c8a24a',
      solid: '#243a30', solidLit: '#3d5c4a', solidEdge: '#639770',
      fog: 'rgba(20,60,40,0.18)', light: 'rgba(92,255,157,0.09)'
    },
    factory: {
      name: 'FACTORY SECTOR',
      bg: ['#130c05', '#291b0a', '#42280c'],
      key: P.c.amber, key2: '#ff6a2b',
      solid: '#413424', solidLit: '#6b563c', solidEdge: '#a87e3e',
      fog: 'rgba(80,50,10,0.16)', light: 'rgba(255,120,40,0.11)'
    },
    servers: {
      name: 'SERVER FARMS',
      bg: ['#070c15', '#0e1d2e', '#153349'],
      key: P.c.cyan, key2: P.c.white,
      solid: '#243440', solidLit: '#3d5563', solidEdge: '#63909f',
      fog: 'rgba(20,60,90,0.13)', light: 'rgba(77,227,255,0.10)'
    },
    reactor: {
      name: 'REACTOR CORE',
      bg: ['#150a04', '#301108', '#511c0a'],
      key: '#ff8a2b', key2: P.c.green,
      solid: '#3a241b', solidLit: '#5e3a2a', solidEdge: '#b85c33',
      fog: 'rgba(120,40,10,0.18)', light: 'rgba(255,140,40,0.14)'
    },
    central: {
      name: 'CENTRAL SYSTEM',
      bg: ['#040406', '#0c0c12', '#16161f'],
      key: P.c.white, key2: P.c.red,
      solid: '#1a1a24', solidLit: '#2e2e3c', solidEdge: '#7a7a94',
      fog: 'rgba(10,10,20,0.22)', light: 'rgba(255,255,255,0.06)'
    }
  };

  /* The Data Sphere overrides every region's palette. Same geometry, ATLAS's reading
     of it: wireframe cyan on absolute black, no warmth anywhere. */
  P.data = {
    name: 'DATA SPHERE',
    bg: ['#000206', '#00080f', '#001622'],
    key: P.c.cyan, key2: P.c.violet,
    solid: '#07202c', solidLit: '#103f52', solidEdge: '#2ee0ff',
    fog: 'rgba(0,60,90,0.14)', light: 'rgba(77,227,255,0.16)'
  };

  P.region = function (id) { return P.regions[id] || P.regions.undercity; };

  /* Blend two hex colours — used for layer cross-fades and damage flashes. */
  P.mix = function (a, b, t) {
    var ai = parseInt(a.slice(1), 16), bi = parseInt(b.slice(1), 16);
    var ar = ai >> 16, ag = (ai >> 8) & 255, ab = ai & 255;
    var br = bi >> 16, bg = (bi >> 8) & 255, bb = bi & 255;
    return 'rgb(' + ((ar + (br - ar) * t) | 0) + ',' + ((ag + (bg - ag) * t) | 0) + ',' +
           ((ab + (bb - ab) * t) | 0) + ')';
  };

  P.alpha = function (hex, a) {
    var i = parseInt(hex.slice(1), 16);
    return 'rgba(' + (i >> 16) + ',' + ((i >> 8) & 255) + ',' + (i & 255) + ',' + a + ')';
  };

})(window.CV = window.CV || {});
