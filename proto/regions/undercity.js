/* CYBERVANIA — proto/regions/undercity.js
   THE OPENING. "Nothing down here was ever finished."

   Five hand-authored chunks, played left to right, teaching the game entirely through
   geometry — there is no tutorial text anywhere in this file.

     (5,7) CRADLE 17    wake up. one light. one exit. nothing can hurt you.
     (6,7) DRIP SPUR    walking. a step to clear. the first dead unit.
     (7,7) THE CISTERN  the space opens. first Crawler. first fight.
     (8,7) THE CLIMB    vertical. teaches jump height and the dash gap.
     (9,7) JUNCTION 4-A a Sentinel Eye sees you, and ATLAS answers.

   Level-design rules from REDESIGN.md section 5 are applied literally here: big spaces,
   no spike carpets, gaps with margin, and long stretches where nothing is happening
   except the room. */
(function (P) {
  'use strict';

  var A = P.Authored;

  /* ==========================================================================
     (5,7) CRADLE 17
     The first thing the player sees. Deliberately small, dim, and safe. The only
     bright object is the cradle they just detached from.
     ========================================================================== */
  A.chunk(5, 7, function (b) {
    b.backdrop(b.M.wallDark);
    b.floor(0, 24, 3);
    b.ceiling(0, 24, 15);
    b.wall(0, 3, 3, 15);                 // sealed to the west: the only way is right

    b.spawn('start', 7, 4);

    b.cradle(5, 3);
    b.pipes(12, 13, 22, 2);
    b.drip(9, 14, 3.2);
    b.drip(17, 14, 3.2);

    /* One weak sodium lamp far right — the player walks toward the light without
       being told to. */
    b.lamp(20, 3, 0xffb23d, 3.4);
    b.light(6, 7, 0x4de3ff, 1.2, 10);

    b.clutter(15, 3);
    b.fg(2, 8, 1.2, 16);                 // near pillar, frames the shot

    b.trigger('wake', 5, 3, 6, 8, 'wake');
  });

  /* ==========================================================================
     (6,7) DRIP SPUR
     Pure walking, one knee-height step, and the first piece of storytelling: a
     maintenance unit exactly like you, which did not wake up.
     ========================================================================== */
  A.chunk(6, 7, function (b) {
    b.backdrop(b.M.wallDark);
    b.floor(0, 14, 3);
    b.floor(14, 24, 4.0);                // knee-height step: walked over, not jumped
    b.ceiling(0, 24, 16);

    b.pipes(12, 14, 24, 3);
    b.drip(4, 15, 3.2);
    b.drip(11, 15, 3.2);
    b.drip(19, 15, 4.2);

    b.deadBot(8, 3, 1);
    b.clutter(17, 4.0);
    b.lamp(3, 3, 0xffb23d, 3.0);

    b.steam(21, 4.0);
    b.fg(23, 9, 1.0, 18);

    b.trigger('corridor', 7, 3, 5, 8, 'corridor');
  });

  /* ==========================================================================
     (7,7) THE CISTERN
     The first real space. Ceiling goes up, the camera has room, and there is a
     Crawler on the floor. Broad ledges, nothing precise, nothing lethal.
     ========================================================================== */
  A.chunk(7, 7, function (b) {
    b.backdrop(b.M.wall, -6);
    b.floor(0, 24, 4.5);
    b.ceiling(0, 24, 23);                // high: the room breathes

    /* Broad shelves. Deliberately generous — this is the first time the player
       jumps for anything, and it should be impossible to miss. */
    b.platform(3, 11, 9);
    b.platform(14, 22, 12);
    b.platform(6, 13, 16);

    b.enemy('crawler', 17, 5, { facing: -1 });

    b.lamp(2, 4.5, 0xffb23d, 3.6);
    b.neon('SUB 4', 12, 19, 0xffb23d, { scale: 0.8, intensity: 2.6 });
    b.light(12, 10, 0xffb23d, 1.4, 16);

    b.steam(9, 4.5);
    b.clutter(20, 4.5);
    b.cable(0, 21, 24, 20, 1.6);
    b.pipes(12, 22, 24, 2);

    b.fg(1, 10, 1.4, 20);
    b.fg(22, 7, 1.0, 14);

    b.trigger('cistern', 4, 4.5, 6, 9, 'cistern');
  });

  /* ==========================================================================
     (8,7) THE CLIMB
     Vertical. Staggered ledges with a comfortable 3-unit rise, then one gap that
     wants a dash — placed so failing it costs a short climb, never a life.
     ========================================================================== */
  A.chunk(8, 7, function (b) {
    b.backdrop(b.M.wall, -6);
    b.floor(0, 24, 4.5);
    b.ceiling(0, 24, 23);
    b.wall(21, 24, 4.5, 14);             // east face: you climb over it, not through

    b.platform(1, 8, 8);
    b.platform(11, 18, 11);
    b.platform(2, 9, 14);
    b.platform(12, 20, 17);

    /* The dash gap: 6 units between the last two ledges. A full jump covers ~5,
       a dash comfortably clears it. Missing drops you one ledge. */
    b.platform(1, 7, 20);

    b.catwalk(15, 17.1, 7);
    b.lamp(10, 4.5, 0x7ecfff, 3.0);
    b.light(6, 14, 0x4de3ff, 1.1, 12);
    b.clutter(4, 4.5);
    b.cable(0, 22, 24, 21, 1.2);
    b.fg(23, 12, 1.2, 22);
  });

  /* ==========================================================================
     (9,7) JUNCTION 4-A
     The beat the whole opening exists for. A Sentinel Eye is mounted where it
     cannot be avoided. It does no damage. It reports you, and ATLAS answers.
     ========================================================================== */
  A.chunk(9, 7, function (b) {
    b.backdrop(b.M.wallDark);
    b.floor(0, 24, 4.5);
    b.ceiling(0, 24, 18);
    b.wall(21, 24, 4.5, 18);             // dead end for now: the opening ends here

    b.platform(4, 12, 10);

    /* Mounted high and central: you walk into its cone no matter how you enter. */
    b.enemy('eye', 13, 12.5);

    b.neon('4-A', 4, 14, 0x5cff9d, { scale: 0.7, intensity: 2.0 });
    b.lamp(19, 4.5, 0xffb23d, 3.2);
    b.light(13, 13, 0xffb23d, 1.6, 14);

    b.pipes(12, 16.5, 24, 3);
    b.deadBot(20, 4.5, -1);
    b.clutter(8, 4.5);
    b.steam(16, 4.5);
    b.fg(2, 11, 1.2, 20);
  });

  /* Fill the chunks directly above the opening so the ceiling reads as rock rather
     than as the edge of the world. */
  [5, 6, 7, 8, 9].forEach(function (cx) {
    A.chunk(cx, 6, function (b) {
      b.wall(0, 24, 0, 24, b.M.wallDark);
    });
  });

})(window.PROTO = window.PROTO || {});
