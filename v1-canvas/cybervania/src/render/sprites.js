/* CYBERVANIA — render/sprites.js
   The chassis grammar. Every robot in the game is assembled from the same seven
   primitives with the same palette and the same 1px ink outline, so stylistic drift
   is structurally impossible (GAME_DESIGN §8). Sprites are drawn procedurally rather
   than blitted from an atlas: a 14px robot ends up ~30 fillRects, which is far cheaper
   than it sounds and buys us free per-frame animation, recolour and damage flash. */
(function (CV) {
  'use strict';

  var S = CV.Sprites = {};
  var C = CV.Palette.c, G = CV.Gfx, U = CV.Util;

  /* ===========================================================================
     PRIMITIVES
     =========================================================================== */

  /* A machined plate: body, 1px top highlight, 1px bottom shade. This single
     primitive is why everything reads as "metal" at 14 pixels. */
  function plate(ctx, x, y, w, h, base, lit, dark) {
    if (w <= 0 || h <= 0) return;
    ctx.fillStyle = base; ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
    if (h > 1) {
      ctx.fillStyle = lit || CV.Palette.mix(base, '#ffffff', .3);
      ctx.fillRect(x | 0, y | 0, w | 0, 1);
      ctx.fillStyle = dark || CV.Palette.mix(base, '#000000', .45);
      ctx.fillRect(x | 0, (y + h - 1) | 0, w | 0, 1);
    }
  }

  /* Outline pass: a 1px ink border around a rect, drawn *behind* content.
     Applied to silhouette-critical parts only — full outlining costs readability. */
  function ink(ctx, x, y, w, h) {
    ctx.fillStyle = C.ink;
    ctx.fillRect((x - 1) | 0, (y - 1) | 0, (w + 2) | 0, (h + 2) | 0);
  }

  function strut(ctx, x, y, w, h, base) {
    ctx.fillStyle = base; ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
    ctx.fillStyle = CV.Palette.mix(base, '#000000', .4);
    ctx.fillRect((x + w - 1) | 0, y | 0, 1, h | 0);
  }

  /* The optic. Every hostile thing in this game has one and it is always the
     brightest pixel on the sprite — that is the readability contract. */
  function optic(ctx, x, y, w, h, color, bright) {
    ctx.fillStyle = C.ink; ctx.fillRect((x - 1) | 0, (y - 1) | 0, (w + 2) | 0, (h + 2) | 0);
    ctx.fillStyle = color; ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
    if (bright !== false) {
      ctx.fillStyle = CV.Palette.mix(color, '#ffffff', .7);
      ctx.fillRect(x | 0, y | 0, Math.max(1, (w / 2) | 0), 1);
    }
  }

  function panelLine(ctx, x, y, w, color) {
    ctx.fillStyle = color || CV.Palette.alpha(C.ink, .5);
    ctx.fillRect(x | 0, y | 0, w | 0, 1);
  }

  function thruster(ctx, x, y, w, h, color, power) {
    plate(ctx, x, y, w, h, C.steelDark);
    if (power > 0.02) {
      ctx.fillStyle = color;
      var fl = Math.round(h * power * 1.4);
      ctx.fillRect(x | 0, (y + h) | 0, w | 0, fl);
      ctx.fillStyle = CV.Palette.mix(color, '#ffffff', .6);
      ctx.fillRect((x + 1) | 0, (y + h) | 0, Math.max(1, w - 2) | 0, Math.max(1, (fl * .5) | 0));
    }
  }

  function joint(ctx, x, y, color) {
    ctx.fillStyle = color || C.steelLit;
    ctx.fillRect(x | 0, y | 0, 2, 2);
  }

  S.plate = plate; S.optic = optic; S.ink = ink; S.strut = strut;

  /* ===========================================================================
     PLAYER FRAMES
     Local space: origin at the sprite's feet centre, -y is up.
     `a` = animation state { t, walk, air, facing, state, power, flash, morph }
     =========================================================================== */

  function flashWrap(ctx, a, draw) {
    draw();
    if (a.flash > 0) {
      /* White-out on damage. Drawn as a source-atop pass over the sprite's own
         pixels so the silhouette stays exact. */
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = Math.min(1, a.flash);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-40, -60, 80, 70);
      ctx.restore();
    }
  }

  /* --- VECTOR -------------------------------------------------------------- */
  S.drawVector = function (ctx, a) {
    var f = a.facing, walk = a.walk, air = a.air;
    var bob = a.grounded ? Math.round(Math.sin(walk * 2) * 0.5) : 0;
    var legA = a.grounded ? Math.round(Math.sin(walk) * 2.2) : (air > 0 ? -1 : 2);
    var legB = a.grounded ? Math.round(Math.sin(walk + 3.14159) * 2.2) : (air > 0 ? 1 : 2);
    var sq = a.squash || 0;                       // landing squash, -1..+1
    var sy = 1 - sq * 0.28, sx = 1 + sq * 0.30;

    ctx.save();
    ctx.scale(f * sx, sy);

    // rear leg
    strut(ctx, -3 + legB, -6, 2, 6 - Math.abs(legB) * 0.5, C.steelDark);
    // backpack / heat sink
    plate(ctx, -6, -12, 2, 5, C.steelDark);
    ctx.fillStyle = a.energyLow ? C.redDim : C.cyanDim;
    ctx.fillRect(-6, -11, 2, 1);
    ctx.fillRect(-6, -9, 2, 1);

    // front leg
    ink(ctx, -1 + legA, -6, 2, 6);
    strut(ctx, -1 + legA, -6, 2, 6, C.steel);
    ctx.fillStyle = C.steelDark; ctx.fillRect((-1 + legA) | 0, -1, 3, 1);   // foot

    // torso
    ink(ctx, -4, -11 + bob, 8, 6);
    plate(ctx, -4, -11 + bob, 8, 6, C.steel, C.steelLit, C.steelDark);
    panelLine(ctx, -3, -8 + bob, 6);
    // chest core — reads energy level at a glance
    ctx.fillStyle = a.energyLow ? C.redDim : C.cyan;
    ctx.fillRect(-1, -10 + bob, 2, 2);

    // head
    ink(ctx, -3, -15 + bob, 6, 4);
    plate(ctx, -3, -15 + bob, 6, 4, C.steelLit, C.chrome, C.steel);
    optic(ctx, 0, -14 + bob, 3, 2, a.optic || C.cyan);
    // antenna
    ctx.fillStyle = C.steelDark; ctx.fillRect(-3, -16 + bob, 1, 2);

    // arm + service blade
    var swing = a.state === 'attack' ? a.attackPose : (a.grounded ? Math.sin(walk) * 1.5 : -1);
    ctx.save();
    ctx.translate(2, -9 + bob);
    if (a.state === 'attack') {
      ctx.rotate(a.attackAngle);
      plate(ctx, 0, -1, 4, 2, C.steel);
      ctx.fillStyle = C.cyanGlow;
      ctx.fillRect(4, -1, 6, 1);
      ctx.fillStyle = C.white;
      ctx.fillRect(4, -1, 6, 1);
    } else {
      plate(ctx, 0, -1 + swing * .5, 3, 2, C.steel);
      ctx.fillStyle = C.cyanDim; ctx.fillRect(3, -1 + swing * .5, 3, 1);
    }
    ctx.restore();

    ctx.restore();
  };

  /* --- BULWARK ------------------------------------------------------------- */
  S.drawBulwark = function (ctx, a) {
    var f = a.facing, walk = a.walk * .6;
    var bob = a.grounded ? Math.round(Math.sin(walk * 2) * 0.8) : 0;
    var legA = a.grounded ? Math.round(Math.sin(walk) * 2) : 1;
    var legB = a.grounded ? Math.round(Math.sin(walk + 3.14159) * 2) : -1;
    var sq = a.squash || 0;
    ctx.save();
    ctx.scale(f * (1 + sq * .22), 1 - sq * .22);

    // legs — wide, planted
    ink(ctx, -7 + legB, -7, 5, 7); plate(ctx, -7 + legB, -7, 5, 7, C.steelDark);
    ink(ctx, 2 + legA, -7, 5, 7);  plate(ctx, 2 + legA, -7, 5, 7, C.steel);
    ctx.fillStyle = C.steelDark;
    ctx.fillRect(-8 + legB, -1, 7, 1); ctx.fillRect(1 + legA, -1, 7, 1);

    // hip block
    plate(ctx, -6, -10 + bob, 12, 4, C.steelDark);

    // torso — the silhouette. Deliberately too wide for a normal corridor.
    ink(ctx, -9, -19 + bob, 18, 10);
    plate(ctx, -9, -19 + bob, 18, 10, C.steel, C.steelLit, C.steelDark);
    // hazard stripe: this frame is industrial equipment, not a soldier
    ctx.fillStyle = C.amberDim;
    for (var s = -8; s < 8; s += 4) ctx.fillRect(s, -13 + bob, 2, 2);
    panelLine(ctx, -8, -16 + bob, 16);

    // reactor core
    ctx.fillStyle = a.energyLow ? C.redDim : C.amber;
    ctx.fillRect(-2, -17 + bob, 4, 3);
    G.glow(ctx, 0, -15 + bob, 7, a.energyLow ? C.red : C.amber, .35);

    // pauldrons
    ink(ctx, -12, -19 + bob, 4, 6); plate(ctx, -12, -19 + bob, 4, 6, C.steelLit);
    ink(ctx, 8, -19 + bob, 4, 6);   plate(ctx, 8, -19 + bob, 4, 6, C.steelLit);

    // head — sunken between the shoulders, twin amber optics
    ink(ctx, -4, -22 + bob, 8, 3);
    plate(ctx, -4, -22 + bob, 8, 3, C.steelDark);
    optic(ctx, -2, -21 + bob, 2, 1, a.optic || C.amber);
    optic(ctx, 1, -21 + bob, 2, 1, a.optic || C.amber);

    // hydraulic forearm
    ctx.save();
    ctx.translate(9, -14 + bob);
    if (a.state === 'attack') ctx.rotate(a.attackAngle * .8);
    ink(ctx, 0, -3, 7, 6);
    plate(ctx, 0, -3, 7, 6, C.chrome, C.chromeLit, C.steel);
    ctx.fillStyle = C.steelDark; ctx.fillRect(2, -1, 4, 1);
    if (a.state === 'attack') { G.glow(ctx, 5, 0, 9, C.amber, .5); }
    ctx.restore();

    ctx.restore();
  };

  /* --- ARC ----------------------------------------------------------------- */
  S.drawArc = function (ctx, a) {
    var f = a.facing;
    var hov = Math.sin(a.t * 9) * 1.1;               // never rests. Always vibrating.
    ctx.save();
    ctx.scale(f, 1);
    ctx.translate(0, hov);

    // thruster ring — the silhouette
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(0, -5, 5, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.steel;
    ctx.beginPath(); ctx.arc(0, -5, 4, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.void;
    ctx.beginPath(); ctx.arc(0, -5, 2.2, 0, 6.283); ctx.fill();
    ctx.fillStyle = a.energyLow ? C.redDim : C.magenta;
    ctx.beginPath(); ctx.arc(0, -5, 1.4, 0, 6.283); ctx.fill();
    G.glow(ctx, 0, -5, 9, a.energyLow ? C.red : C.magenta, .45);

    // body pod, forward-leaning
    ink(ctx, -3, -10, 7, 5);
    plate(ctx, -3, -10, 7, 5, C.chrome, C.chromeLit, C.steel);
    optic(ctx, 1, -9, 3, 2, a.optic || C.magenta);

    // fins
    ctx.fillStyle = C.steelDark;
    ctx.fillRect(-6, -8, 3, 1);
    ctx.fillRect(-6, -4, 3, 1);

    // thrust plume, scales with speed
    if (a.power > .05) {
      ctx.fillStyle = CV.Palette.alpha(C.magenta, .8);
      var pl = 2 + a.power * 6;
      ctx.fillRect(-4 - pl, -6, pl, 3);
      ctx.fillStyle = CV.Palette.alpha(C.white, .7);
      ctx.fillRect(-3 - pl * .5, -5, pl * .5, 1);
    }
    ctx.restore();
  };

  /* --- CIPHER -------------------------------------------------------------- */
  S.drawCipher = function (ctx, a) {
    var f = a.facing, walk = a.walk;
    var bob = Math.round(Math.sin(a.t * 3) * 0.6);
    ctx.save();
    ctx.scale(f, 1);

    /* Lower body does not exist as geometry — it is a scatter of glyph pixels that
       thins toward the ground. Deterministic per-pixel so it reads as a body, not noise. */
    for (var i = 0; i < 22; i++) {
      var ph = a.t * 2 + i * 1.7;
      var yy = -1 - (i % 8) * 0.9;
      var xx = Math.round(U.noise1(ph) * 4 + Math.sin(walk + i) * 1.2);
      var al = 0.18 + (i % 8) / 8 * 0.6;
      ctx.fillStyle = CV.Palette.alpha(C.cyan, al);
      ctx.fillRect(xx, Math.round(yy + bob), 1, 1);
    }

    // torso
    ink(ctx, -4, -11 + bob, 8, 6);
    plate(ctx, -4, -11 + bob, 8, 6, '#16303c', '#2b5a6b', '#0b1a22');
    ctx.fillStyle = C.cyan; ctx.fillRect(-1, -10 + bob, 2, 3);
    // running glyph column on the chest
    ctx.fillStyle = CV.Palette.alpha(C.cyanGlow, .8);
    ctx.fillRect(-3, -9 + bob + (Math.floor(a.t * 12) % 3), 1, 1);

    // head
    ink(ctx, -3, -15 + bob, 6, 4);
    plate(ctx, -3, -15 + bob, 6, 4, '#1d3f4d', '#3d7d94', '#0d1f28');
    optic(ctx, 0, -14 + bob, 3, 2, a.optic || C.cyanGlow);

    // data arm
    ctx.save();
    ctx.translate(2, -9 + bob);
    if (a.state === 'attack') ctx.rotate(a.attackAngle);
    ctx.fillStyle = CV.Palette.alpha(C.cyan, .9);
    ctx.fillRect(0, -1, 3, 2);
    if (a.state === 'attack') {
      for (var j = 0; j < 7; j++) {
        ctx.fillStyle = CV.Palette.alpha(C.cyanGlow, 1 - j / 8);
        ctx.fillRect(3 + j, -1 + Math.round(U.noise1(a.t * 30 + j) * 2), 1, 1);
      }
    }
    ctx.restore();

    G.glow(ctx, 0, -9 + bob, 12, C.cyan, .22);
    ctx.restore();
  };

  S.drawPlayerFrame = function (ctx, frameId, a) {
    var fn = frameId === 'bulwark' ? S.drawBulwark :
             frameId === 'arc' ? S.drawArc :
             frameId === 'cipher' ? S.drawCipher : S.drawVector;
    flashWrap(ctx, a, function () { fn(ctx, a); });
  };

  /* ===========================================================================
     ENEMY ART
     Parameterised archetypes. A new enemy is a colour + a few numbers, which keeps
     the roster coherent and cheap (WORLD_DESIGN §6).
     =========================================================================== */

  var ART = S.enemyArt = {};

  /* Four-legged ground patrol. Low, wide, unmistakably not a person. */
  ART.crawler = function (ctx, e, a) {
    var w = e.w, h = e.h, key = e.def.color;
    ctx.scale(e.facing, 1);
    var step = Math.sin(a.t * 8 + e.seed) * 1.5;
    ctx.fillStyle = C.steelDark;
    for (var i = 0; i < 4; i++) {
      var lx = -w / 2 + 2 + i * (w - 4) / 3;
      var ly = Math.round(Math.sin(a.t * 8 + i * 1.6 + e.seed) * 1.5);
      ctx.fillRect(lx | 0, -3, 1, 3 + ly);
    }
    ink(ctx, -w / 2, -h, w, h - 2);
    plate(ctx, -w / 2, -h, w, h - 2, C.steel, C.steelLit, C.steelDark);
    ctx.fillStyle = C.steelDark;
    ctx.fillRect(-w / 2 + 1, -h + 3, w - 2, 1);
    optic(ctx, w / 2 - 4, -h + 2, 3, 2, key);
    G.glow(ctx, w / 2 - 2, -h + 3, 7, key, .3 + Math.sin(a.t * 4) * .08);
    if (step > 1.2) { /* footfall accent */ }
  };

  /* Stationary scanner. It does no damage. It calls things that do. */
  ART.eye = function (ctx, e, a) {
    var key = e.alerted ? C.red : e.def.color;
    ctx.fillStyle = C.steelDark; ctx.fillRect(-1, -e.h - 4, 2, 5);
    ink(ctx, -e.w / 2, -e.h, e.w, e.h);
    ctx.fillStyle = C.steel;
    ctx.beginPath(); ctx.arc(0, -e.h / 2, e.w / 2, 0, 6.283); ctx.fill();
    var ang = e.scanAngle || 0;
    ctx.save();
    ctx.translate(0, -e.h / 2); ctx.rotate(ang);
    optic(ctx, 1, -1.5, 3, 3, key);
    ctx.restore();
    G.glow(ctx, 0, -e.h / 2, 10, key, e.alerted ? .7 : .3);
    if (e.alerted) {
      ctx.fillStyle = CV.Palette.alpha(C.red, .5 + Math.sin(a.t * 20) * .3);
      ctx.fillRect(-e.w / 2 - 2, -e.h - 4, e.w + 4, 1);
    }
  };

  /* Charges in one direction and cannot stop. Punishes standing still. */
  ART.sweeper = function (ctx, e, a) {
    ctx.scale(e.facing, 1);
    var w = e.w, h = e.h, key = e.def.color;
    var spin = a.t * (e.charging ? 26 : 5);
    ink(ctx, -w / 2, -h, w, h);
    plate(ctx, -w / 2, -h, w, h, C.steelDark, C.steel, C.ink);
    // brush drum
    ctx.save(); ctx.translate(w / 2 - 1, -3); ctx.rotate(spin);
    ctx.fillStyle = e.charging ? C.amber : C.rust;
    for (var i = 0; i < 6; i++) {
      ctx.rotate(1.047);
      ctx.fillRect(0, -1, 4, 2);
    }
    ctx.restore();
    optic(ctx, -w / 2 + 2, -h + 2, 3, 2, key);
    if (e.charging) G.glow(ctx, w / 2, -3, 12, C.amber, .5);
  };

  /* Shield + gun. The shield only covers the front — the whole point of the enemy. */
  ART.enforcer = function (ctx, e, a) {
    ctx.scale(e.facing, 1);
    var w = e.w, h = e.h, key = e.def.color;
    var walk = e.vx !== 0 ? Math.sin(a.t * 7 + e.seed) * 2 : 0;
    ctx.fillStyle = C.steelDark;
    ctx.fillRect(-3 + walk, -6, 2, 6); ctx.fillRect(1 - walk, -6, 2, 6);
    ink(ctx, -w / 2, -h + 2, w - 2, h - 6);
    plate(ctx, -w / 2, -h + 2, w - 2, h - 6, C.steel, C.steelLit, C.steelDark);
    ink(ctx, -3, -h - 1, 6, 4);
    plate(ctx, -3, -h - 1, 6, 4, C.steelDark);
    optic(ctx, 0, -h, 3, 2, e.stunned > 0 ? C.chrome : key);
    // shield, front-facing only
    if (e.shield > 0) {
      ctx.fillStyle = CV.Palette.alpha(key, .18 + Math.sin(a.t * 3) * .05);
      ctx.fillRect(w / 2 - 3, -h - 1, 3, h + 1);
      ctx.fillStyle = key;
      ctx.fillRect(w / 2 - 1, -h - 1, 1, h + 1);
    }
    // barrel
    ctx.fillStyle = C.steelDark; ctx.fillRect(2, -8, 6, 2);
    if (e.windup > 0) G.glow(ctx, 8, -7, 8, C.red, e.windup);
  };

  /* Flier. Rotors as an X, body as a pod. Reads instantly as "airborne". */
  ART.drone = function (ctx, e, a) {
    var w = e.w, key = e.def.color;
    var blur = Math.sin(a.t * 40 + e.seed) > 0 ? 1 : -1;
    ctx.fillStyle = CV.Palette.alpha(C.chrome, .35);
    ctx.fillRect(-w / 2 - 2, -e.h + 1, w + 4, 1);
    ctx.fillStyle = C.steelDark;
    ctx.fillRect(-w / 2 - 2, -e.h + 1 + blur, 3, 1);
    ctx.fillRect(w / 2 - 1, -e.h + 1 - blur, 3, 1);
    ink(ctx, -w / 2, -e.h, w, e.h - 1);
    plate(ctx, -w / 2, -e.h, w, e.h - 1, C.steel, C.steelLit, C.steelDark);
    optic(ctx, -1, -e.h + 2, 3, 2, key);
    G.glow(ctx, 0, -e.h + 3, 8, key, .3);
  };

  /* Erratic sine-path flier with a stinger. Old Network. */
  ART.wasp = function (ctx, e, a) {
    ctx.scale(e.facing, 1);
    var key = e.def.color;
    var wing = Math.sin(a.t * 30 + e.seed) * 2;
    ctx.fillStyle = CV.Palette.alpha(C.green, .3);
    ctx.fillRect(-2, -e.h - 1 + wing, 5, 1);
    ink(ctx, -e.w / 2, -e.h, e.w, e.h - 2);
    plate(ctx, -e.w / 2, -e.h, e.w, e.h - 2, '#2a3a24', '#4a6440', '#131c11');
    ctx.fillStyle = C.amberDim;
    ctx.fillRect(-e.w / 2 + 1, -e.h + 2, e.w - 2, 1);
    optic(ctx, e.w / 2 - 3, -e.h + 1, 2, 2, key);
    ctx.fillStyle = C.steelDark; ctx.fillRect(-e.w / 2 - 3, -e.h + 3, 3, 1);
    G.glow(ctx, 0, -e.h + 2, 7, key, .25);
  };

  /* Fixed turret with a wind-up laser. Cover-based fight. */
  ART.turret = function (ctx, e, a) {
    var key = e.def.color;
    ctx.fillStyle = C.steelDark; ctx.fillRect(-e.w / 2, -3, e.w, 3);
    ink(ctx, -e.w / 2 + 1, -e.h, e.w - 2, e.h - 3);
    plate(ctx, -e.w / 2 + 1, -e.h, e.w - 2, e.h - 3, C.steel, C.steelLit, C.steelDark);
    ctx.save();
    ctx.translate(0, -e.h + 3);
    ctx.rotate(e.aim || 0);
    plate(ctx, 0, -1.5, 9, 3, C.steelDark);
    ctx.fillStyle = e.windup > 0 ? CV.Palette.mix(C.amber, C.red, e.windup) : C.steel;
    ctx.fillRect(8, -1, 2, 2);
    if (e.windup > 0) G.glow(ctx, 10, 0, 6 + e.windup * 6, C.red, e.windup);
    ctx.restore();
    optic(ctx, -1, -e.h + 1, 3, 2, key);
  };

  /* Data-layer entity. No plates — it is drawn as a resolving wireframe. */
  ART.daemon = function (ctx, e, a) {
    var key = e.def.color, r = e.w / 2;
    ctx.strokeStyle = key; ctx.lineWidth = 1;
    for (var k = 0; k < 3; k++) {
      var rr = r - k * 1.6 + Math.sin(a.t * 4 + k + e.seed) * .8;
      ctx.beginPath();
      for (var i = 0; i <= 6; i++) {
        var ang = i / 6 * 6.283 + a.t * (k % 2 ? -1 : 1) * .9;
        var px = Math.cos(ang) * rr, py = -e.h / 2 + Math.sin(ang) * rr;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    ctx.fillStyle = key; ctx.fillRect(-1, -e.h / 2 - 1, 2, 2);
    G.glow(ctx, 0, -e.h / 2, 12, key, .4);
    // glyph static
    for (var g = 0; g < 5; g++) {
      ctx.fillStyle = CV.Palette.alpha(key, .5);
      ctx.fillRect(Math.round(U.noise1(a.t * 6 + g + e.seed) * r),
                   Math.round(-e.h / 2 + U.noise1(a.t * 5 + g * 3) * r), 1, 1);
    }
  };

  /* Heavy industrial. Big, slow, shoves you into things. */
  ART.heavy = function (ctx, e, a) {
    ctx.scale(e.facing, 1);
    var w = e.w, h = e.h, key = e.def.color;
    var tread = (a.t * 30) % 4;
    ctx.fillStyle = C.steelDark; ctx.fillRect(-w / 2, -5, w, 5);
    ctx.fillStyle = C.ink;
    for (var i = -w / 2; i < w / 2; i += 4) ctx.fillRect((i + tread) | 0, -4, 2, 3);
    ink(ctx, -w / 2 + 1, -h, w - 2, h - 5);
    plate(ctx, -w / 2 + 1, -h, w - 2, h - 5, C.steel, C.steelLit, C.steelDark);
    ctx.fillStyle = C.amberDim;
    for (var s = -w / 2 + 2; s < w / 2 - 2; s += 5) ctx.fillRect(s, -h + 4, 3, 2);
    optic(ctx, w / 2 - 6, -h + 2, 4, 2, key);
    G.glow(ctx, w / 2 - 4, -h + 3, 9, key, .3);
  };

  /* Support unit: repairs others. Distinctive "arms up" silhouette. */
  ART.support = function (ctx, e, a) {
    ctx.scale(e.facing, 1);
    var w = e.w, h = e.h, key = e.def.color;
    var arm = Math.sin(a.t * 5 + e.seed) * 2;
    ctx.fillStyle = C.steelDark;
    ctx.fillRect(-2, -5, 2, 5); ctx.fillRect(1, -5, 2, 5);
    ink(ctx, -w / 2, -h + 1, w, h - 6);
    plate(ctx, -w / 2, -h + 1, w, h - 6, '#3a3a4a', '#5c5c72', '#1c1c26');
    ctx.fillStyle = C.steelDark;
    ctx.fillRect(-w / 2 - 3, -h - 1 + arm, 4, 1);
    ctx.fillRect(w / 2 - 1, -h - 1 - arm, 4, 1);
    optic(ctx, -1, -h + 3, 3, 2, key);
    if (e.healing > 0) G.glow(ctx, 0, -h + 3, 16, C.green, .5);
  };

  /* Data corruption made hostile. Deliberately unstable geometry. */
  ART.glitch = function (ctx, e, a) {
    var key = e.def.color;
    for (var i = 0; i < 9; i++) {
      var t = a.t * 8 + i * 2.3 + e.seed;
      var gx = Math.round(U.noise1(t) * e.w * .7);
      var gy = Math.round(-e.h / 2 + U.noise1(t + 40) * e.h * .7);
      var gw = 1 + Math.abs(Math.round(U.noise1(t + 80) * 4));
      ctx.fillStyle = CV.Palette.alpha(i % 3 ? key : C.magenta, .55 + (i % 3) * .15);
      ctx.fillRect(gx, gy, gw, 1 + (i % 2));
    }
    ctx.fillStyle = key;
    ctx.fillRect(-2, -e.h / 2 - 1, 4, 2);
    G.glow(ctx, 0, -e.h / 2, 11, key, .45);
  };

  /* Reactor melee unit — trails a heat field. */
  ART.furnace = function (ctx, e, a) {
    ctx.scale(e.facing, 1);
    var w = e.w, h = e.h;
    var g = 0.5 + Math.sin(a.t * 6 + e.seed) * .2;
    G.glow(ctx, 0, -h / 2, 20, '#ff8a2b', g * .5);
    ctx.fillStyle = C.ink;
    ctx.fillRect(-3, -6, 2, 6); ctx.fillRect(1, -6, 2, 6);
    ink(ctx, -w / 2, -h, w, h - 5);
    plate(ctx, -w / 2, -h, w, h - 5, '#2b1a12', '#5c3320', '#150b07');
    // grate: the fire inside
    for (var i = 0; i < 3; i++) {
      ctx.fillStyle = CV.Palette.mix('#ff8a2b', '#ffe08a', Math.abs(Math.sin(a.t * 4 + i)));
      ctx.fillRect(-w / 2 + 2, -h + 2 + i * 3, w - 4, 2);
    }
    optic(ctx, w / 2 - 4, -h + 1, 3, 2, '#ffd07a');
  };

  /* ===========================================================================
     PROPS
     =========================================================================== */
  var PR = S.props = {};

  /* Dock station — save point. Diegetically a maintenance cradle: R-17 plugs in. */
  PR.dock = function (ctx, o, t, active) {
    var key = active ? C.cyan : C.cyanDim;
    plate(ctx, -10, -28, 20, 28, C.steelDark, C.steel, C.ink);
    ctx.fillStyle = C.void; ctx.fillRect(-7, -25, 14, 20);
    // cradle arms
    plate(ctx, -9, -14, 4, 3, C.steel);
    plate(ctx, 5, -14, 4, 3, C.steel);
    var pulse = .55 + Math.sin(t * 2) * .3;
    ctx.fillStyle = CV.Palette.alpha(key, pulse);
    ctx.fillRect(-6, -24, 12, 1);
    ctx.fillRect(-6, -8, 12, 1);
    for (var i = 0; i < 4; i++) {
      ctx.fillStyle = CV.Palette.alpha(key, .3 + ((Math.floor(t * 3) + i) % 4) * .18);
      ctx.fillRect(-5 + i * 4, -20, 2, 2);
    }
    G.glow(ctx, 0, -16, 22, key, active ? .5 : .22);
  };

  /* Lore terminal. Green phosphor CRT on a stand. Pulses at 0.5Hz when unread. */
  PR.terminal = function (ctx, o, t, read) {
    plate(ctx, -2, -8, 4, 8, C.steelDark);
    ink(ctx, -8, -20, 16, 12);
    plate(ctx, -8, -20, 16, 12, C.steel, C.steelLit, C.steelDark);
    ctx.fillStyle = '#04120c'; ctx.fillRect(-6, -18, 12, 8);
    var a = read ? .35 : .55 + Math.sin(t * 3.14) * .35;
    ctx.fillStyle = CV.Palette.alpha(C.green, a);
    for (var i = 0; i < 3; i++) {
      var w = 4 + ((i * 3 + Math.floor(t * 2)) % 7);
      ctx.fillRect(-5, -17 + i * 3, w, 1);
    }
    ctx.fillStyle = CV.Palette.alpha(C.green, Math.sin(t * 8) > 0 ? .9 : .1);
    ctx.fillRect(-5 + 8, -17 + 6, 2, 1);
    G.glow(ctx, 0, -14, 16, C.green, read ? .18 : .34);
  };

  /* Dive Port — the fixed-point Data Sphere entrance. */
  PR.divePort = function (ctx, o, t) {
    ctx.fillStyle = C.steelDark; ctx.fillRect(-12, -2, 24, 2);
    for (var r = 0; r < 3; r++) {
      var rr = 5 + r * 4 + Math.sin(t * 2 - r * .8) * 1.6;
      ctx.strokeStyle = CV.Palette.alpha(C.cyan, .5 - r * .12);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, -14, rr, 0, 6.283); ctx.stroke();
    }
    ctx.fillStyle = C.cyanGlow;
    ctx.fillRect(-1, -15, 2, 2);
    G.glow(ctx, 0, -14, 26, C.cyan, .32 + Math.sin(t * 2) * .1);
    for (var i = 0; i < 6; i++) {
      var ph = t * 1.5 + i;
      ctx.fillStyle = CV.Palette.alpha(C.cyanGlow, .6);
      ctx.fillRect(Math.round(Math.cos(ph) * 10), Math.round(-14 + Math.sin(ph * 1.3) * 9), 1, 1);
    }
  };

  /* Pickup: module / shard / capacitor / augment / fragment. Shape encodes type. */
  PR.pickup = function (ctx, kind, t) {
    var col = kind === 'shard' ? C.green : kind === 'capacitor' ? C.amber :
              kind === 'augment' ? C.violet : kind === 'fragment' ? C.magenta : C.cyan;
    var bob = Math.sin(t * 3) * 1.6;
    ctx.save();
    ctx.translate(0, -8 + bob);
    G.glow(ctx, 0, 0, 16, col, .45 + Math.sin(t * 4) * .12);
    ctx.rotate(t * (kind === 'module' ? 1.2 : 0.6));
    ctx.fillStyle = col;
    if (kind === 'shard') {
      ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5);
      ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill();
    } else if (kind === 'capacitor') {
      ctx.fillRect(-3, -4, 6, 8);
      ctx.fillStyle = C.void; ctx.fillRect(-2, -1, 4, 2);
    } else if (kind === 'augment') {
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = C.void; ctx.fillRect(-2, -2, 4, 4);
      ctx.fillStyle = col; ctx.fillRect(-1, -1, 2, 2);
    } else if (kind === 'fragment') {
      for (var i = 0; i < 5; i++) {
        ctx.fillRect(Math.round(Math.cos(i * 1.257 + t) * 4),
                     Math.round(Math.sin(i * 1.257 + t) * 4), 2, 2);
      }
    } else {
      ctx.beginPath();
      for (var k = 0; k < 6; k++) {
        var a2 = k / 6 * 6.283;
        k ? ctx.lineTo(Math.cos(a2) * 5, Math.sin(a2) * 5)
          : ctx.moveTo(Math.cos(a2) * 5, Math.sin(a2) * 5);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.void;
      ctx.fillRect(-2, -2, 4, 4);
    }
    ctx.restore();
  };

  /* Tram node — fast travel. A real vehicle arrives; no menu teleport. */
  PR.tram = function (ctx, o, t, active) {
    var key = active ? C.magenta : C.magentaDim;
    plate(ctx, -20, -4, 40, 4, C.steelDark);
    plate(ctx, -18, -6, 36, 2, C.steel);
    ctx.fillStyle = CV.Palette.alpha(key, .5 + Math.sin(t * 2) * .3);
    ctx.fillRect(-16, -8, 32, 1);
    G.text(ctx, 'TRAM', -11, -18, key, 1);
    G.glow(ctx, 0, -8, 26, key, .28);
  };

  /* A ceiling-hung neon sign. Pure atmosphere, and the main light source in Neon City. */
  PR.sign = function (ctx, o, t) {
    var col = o.color || C.magenta;
    var flick = (U.noise1(t * 6 + o.seed) > -0.75) ? 1 : 0.25;
    ctx.fillStyle = C.ink;
    ctx.fillRect(-o.w / 2 - 1, -o.h - 1, o.w + 2, o.h + 2);
    ctx.fillStyle = CV.Palette.alpha(col, .85 * flick);
    G.frame(ctx, -o.w / 2, -o.h, o.w, o.h, CV.Palette.alpha(col, flick), 1);
    if (o.label) G.text(ctx, o.label, -G.textWidth(o.label, 1) / 2, -o.h / 2 - 3, col, 1);
    G.glow(ctx, 0, -o.h / 2, o.w, col, .35 * flick);
  };

})(window.CV = window.CV || {});
