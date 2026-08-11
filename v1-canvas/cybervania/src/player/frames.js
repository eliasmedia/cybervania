/* CYBERVANIA — player/frames.js
   The four transformations (GAME_DESIGN §3). These are not skins: every number the
   player controller reads comes from here, so switching frames re-tunes physics,
   combat and the energy economy at once.

   Tuning note: speeds are px/s, accelerations px/s^2, gravity px/s^2. Jump heights
   are quoted in 16px tiles and derived as v^2 / (2g). */
(function (CV) {
  'use strict';

  var C = CV.Palette.c;
  var F = CV.Frames = {};

  F.defs = {

    /* ---------------------------------------------------------------------
       VECTOR — the maintenance chassis. The control against which the other
       three are read. Nothing it does is best; everything it does is fine.
       --------------------------------------------------------------------- */
    vector: {
      id: 'vector', name: 'VECTOR', order: 0, color: C.cyan,
      blurb: 'STANDARD MAINTENANCE CHASSIS. BALANCED. WALL-CAPABLE.',
      long: 'WHAT YOU WERE BUILT AS. THE ONLY FRAME WITH NO WEAKNESS AND NO EDGE.',

      w: 10, h: 14,
      runSpeed: 165, accel: 1500, friction: 1900, airAccel: 1000, airFriction: 420,
      gravity: 1350, fallMax: 520, jumpVel: 355, jumpCut: 0.45,   // ~3.0 tiles
      coyote: 0.10, jumpBuffer: 0.12,

      wallSlide: 72, wallJumpX: 210, wallJumpY: -330, canWallJump: true, canClimb: true,
      airDashes: 1, dashSpeed: 480, dashTime: 0.155, dashCooldown: 0.42,
      dashIFrames: 0.12, dashKeepsMomentum: false,

      maxEnergy: 100, regen: 22, regenDelay: 0.5, gainOnHit: 3, drain: 0,
      costMul: 1.0,

      attack: {
        combo: 3, damage: [7, 7, 11], reach: 20, arc: 1.5,
        windup: 0.045, active: 0.09, recover: 0.13, comboWindow: 0.42,
        stepOnHit: [0, 0, 34], knockback: 90, hitstop: 0.055, ranged: false
      },
      damageTaken: 1.0, contactImmune: false, armour: 0, noStaggerUnder: 0,
      optic: C.cyan
    },

    /* ---------------------------------------------------------------------
       BULWARK — heavy frame. Treats the level as a material, not a constraint.
       Energy is a combat meter: it fills by fighting and empties into fighting.
       --------------------------------------------------------------------- */
    bulwark: {
      id: 'bulwark', name: 'BULWARK', order: 1, color: C.amber,
      blurb: 'HEAVY FRAME. ARMOURED. BREAKS TERRAIN. ENERGY FROM VIOLENCE.',
      long: 'WHAT THEY USED WHEN A THING NEEDED TO STOP EXISTING.',

      w: 18, h: 20,
      runSpeed: 105, accel: 900, friction: 1500, airAccel: 560, airFriction: 260,
      gravity: 1900, fallMax: 700, jumpVel: 270, jumpCut: 0.85,   // ~1.9 tiles, little control
      coyote: 0.08, jumpBuffer: 0.12,

      wallSlide: 150, wallJumpX: 0, wallJumpY: 0, canWallJump: false, canClimb: false,
      airDashes: 1, dashSpeed: 380, dashTime: 0.20, dashCooldown: 0.60,
      dashIFrames: 0, dashDamage: 12, dashKeepsMomentum: false,

      maxEnergy: 160, regen: 4, regenDelay: 1.2, gainOnHit: 14, drain: 0,
      costMul: 1.0,

      attack: {
        combo: 2, damage: [20, 30], reach: 26, arc: 2.0,
        windup: 0.13, active: 0.11, recover: 0.24, comboWindow: 0.55,
        stepOnHit: [12, 20], knockback: 260, hitstop: 0.11, ranged: false,
        shake: [0.18, 0.36]
      },
      damageTaken: 0.60, contactImmune: false, armour: 1, noStaggerUnder: 8,
      canSlamBreak: true, crushImmune: true,
      optic: C.amber
    },

    /* ---------------------------------------------------------------------
       ARC — flight frame. The movement-tech frame and the sequence-break frame.
       Fast recovery, tiny pool, expensive abilities: rhythmic play.
       --------------------------------------------------------------------- */
    arc: {
      id: 'arc', name: 'ARC', order: 2, color: C.magenta,
      blurb: 'FLIGHT FRAME. FASTEST. TWO AIR DASHES. GLIDE. VERY FRAGILE.',
      long: 'A COURIER DRONE THAT SOMEONE TAUGHT TO BE ANGRY.',

      w: 8, h: 10,
      runSpeed: 215, accel: 1700, friction: 1500, airAccel: 1400, airFriction: 300,
      gravity: 950, fallMax: 340, jumpVel: 285, jumpCut: 0.40,    // ~2.6 tiles, floaty
      coyote: 0.12, jumpBuffer: 0.14,

      wallSlide: 55, wallJumpX: 230, wallJumpY: -300, canWallJump: true, canClimb: false,
      airDashes: 2, dashSpeed: 520, dashTime: 0.14, dashCooldown: 0.26,
      dashIFrames: 0.08, dashKeepsMomentum: true,
      glide: true, glideFall: 62, glideDrift: 40,

      maxEnergy: 70, regen: 40, regenDelay: 0.32, gainOnHit: 2, drain: 0,
      costMul: 1.6,

      attack: {
        combo: 1, damage: [5], reach: 0, arc: 0,
        windup: 0.02, active: 0.03, recover: 0.11, comboWindow: 0.2,
        stepOnHit: [0], knockback: 20, hitstop: 0.02,
        ranged: true, projSpeed: 420, projLife: 0.55, projCost: 0
      },
      damageTaken: 1.45, contactImmune: false, armour: 0, noStaggerUnder: 0,
      optic: C.magenta
    },

    /* ---------------------------------------------------------------------
       CIPHER — data frame. A lens, not a weapon. Rich in information, poor in
       time: it drains in the physical world and only refills in the Data Sphere.
       --------------------------------------------------------------------- */
    cipher: {
      id: 'cipher', name: 'CIPHER', order: 3, color: C.cyanGlow,
      blurb: 'DATA FRAME. FREE DATA SHIFT. PASSES DATA-WALLS. CORRUPTS.',
      long: 'THE PART OF YOU THAT WAS NEVER A ROBOT.',

      w: 10, h: 15, hurtInset: 2,
      runSpeed: 150, accel: 1300, friction: 1700, airAccel: 950, airFriction: 380,
      gravity: 1200, fallMax: 480, jumpVel: 330, jumpCut: 0.45,   // ~2.8 tiles
      coyote: 0.11, jumpBuffer: 0.13,

      wallSlide: 80, wallJumpX: 190, wallJumpY: -310, canWallJump: true, canClimb: true,
      airDashes: 1, dashSpeed: 460, dashTime: 0.17, dashCooldown: 0.40,
      dashIFrames: 0.14, dashPhases: true, dashKeepsMomentum: false,

      maxEnergy: 120, regen: 0, regenDelay: 0.4, gainOnHit: 1,
      drain: 0.8,               // per second, physical layer only
      dataRegen: 30,            // per second while in the Data Sphere
      costMul: 0.85,

      attack: {
        combo: 2, damage: [3, 3], reach: 24, arc: 1.2,
        windup: 0.05, active: 0.10, recover: 0.12, comboWindow: 0.40,
        stepOnHit: [0, 0], knockback: 40, hitstop: 0.03, ranged: false,
        corrupt: 1
      },
      damageTaken: 1.0, contactImmune: true, armour: 0, noStaggerUnder: 0,
      freeDataShift: true, seesHidden: true,
      optic: C.cyanGlow
    }
  };

  F.order = ['vector', 'bulwark', 'arc', 'cipher'];

  F.get = function (id) { return F.defs[id] || F.defs.vector; };

  /* Corruption: Cipher's damage model. Stacks tick, amplify other damage sources,
     and at 3 stacks make robotic units briefly hostile to each other. */
  F.CORRUPT_TICK = 4;        // damage per second per stack
  F.CORRUPT_TIME = 3.0;      // seconds a stack lasts
  F.CORRUPT_AMP = 0.25;      // +25% incoming damage while corrupted
  F.CORRUPT_TURN = 3;        // stacks required to turn a unit

})(window.CV = window.CV || {});
