/* CYBERVANIA — proto/regions/undercity.js
   THE OPENING. "Nothing down here was ever finished."

   Five hand-authored chunks, played left to right, teaching the game entirely through
   geometry — there is no tutorial text anywhere in this file.

     (5,7) CRADLE 17    wake up. one light. one exit. nothing can hurt you.
     (6,7) DRIP SPUR    walking. a step to clear. the first dead unit.
     (7,7) THE CISTERN  the space opens. first Crawler. first fight.
     (8,7) THE CLIMB    vertical, and optional. the ground route runs straight through.
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
     The ground route runs straight through — the fourth room of the game is not the
     place for a gate. The climb is an OPTIONAL branch: a reward is visible from the
     floor, and taking it is a choice. Steps are 2.5 units against a 2.9-unit jump, and
     every ledge overlaps the one below it horizontally, so no jump needs precision and
     a short one gets caught by the ledge grab.
     ========================================================================== */
  A.chunk(8, 7, function (b) {
    b.backdrop(b.M.wall, -6);
    b.floor(0, 24, 4.5);                 // continuous: you can simply walk east
    b.ceiling(0, 24, 23);

    /* Optional ascent.

       Two constraints govern every ledge here, and getting them wrong is what made the
       first attempt a trap:
         1. R-17 is 3 units tall, so ANYTHING over the walking lane needs its underside
            at least 3 units above the floor. The lowest ledge sits at y=9 (underside 8)
            against a floor at 4.5.
         2. Two ledges that overlap horizontally must be more than 3 units apart
            vertically, or the player standing on the lower one cannot walk out from
            under the upper one. Every overlapping pair here is 5 apart.

       The first ledge is a double-jump off the floor, which is also how the room
       teaches that the second jump exists. */
    b.platform(8, 15, 9);
    b.platform(17, 23, 11.5);
    b.platform(6, 13, 14);
    b.platform(15, 22, 16.5);
    b.platform(4, 11, 19);

    /* What the climb is for: a dead unit slumped at the top, and the region's first
       piece of environmental storytelling that is not on the critical path. */
    b.deadBot(7, 19, 1);
    b.neon('AUX', 7, 21.5, 0x5cff9d, { scale: 0.55, intensity: 1.8 });

    b.catwalk(19, 11.6, 6);
    b.lamp(11, 4.5, 0x7ecfff, 3.0);
    b.light(8, 15, 0x4de3ff, 1.1, 12);
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

  /* ==========================================================================
     (10,7) THE SPUR — where the opening hands off
     ATLAS has dispatched maintenance, so this is the first room that is actively
     hostile: two Crawlers and no cover. It also opens downward, which is the first
     time the world admits it goes somewhere other than east.
     ========================================================================== */
  A.chunk(10, 7, function (b) {
    b.backdrop(b.M.wall, -6);
    b.floor(0, 15, 4.5);
    /* The floor stops. Beyond is the drop into the rest of the Undercity. */
    b.floor(20, 24, 4.5);
    b.ceiling(0, 24, 20);

    b.platform(6, 13, 10);
    b.platform(15, 21, 14);

    b.enemy('crawler', 9, 5, { facing: -1 });
    b.enemy('crawler', 22, 5, { facing: -1 });

    b.lamp(3, 4.5, 0xffb23d, 3.2);
    b.neon('4-B', 18, 16, 0xff4459, { scale: 0.7, intensity: 2.2 });
    b.light(12, 12, 0xff4459, 1.2, 14);
    b.pipes(12, 18.5, 24, 2);
    b.cable(0, 19, 24, 18, 1.4);
    b.steam(17, 4.5);
    b.clutter(5, 4.5);
    b.fg(23, 11, 1.2, 20);
  });

  /* (10,8) below the gap: a soft landing, so the first drop is an invitation and
     not a punishment. */
  A.chunk(10, 8, function (b) {
    b.backdrop(b.M.wallDark);
    b.floor(0, 24, 3);
    b.wall(0, 2, 3, 24);
    b.wall(22, 24, 3, 24);
    b.platform(13, 20, 15);
    b.platform(4, 11, 10);
    b.lamp(6, 3, 0xffb23d, 3.0);
    b.light(12, 8, 0xffb23d, 1.3, 16);
    b.deadBot(17, 3, -1);
    b.clutter(9, 3);
    b.steam(20, 3);
    b.drip(12, 22, 3.2);
    b.fg(2, 9, 1.2, 18);
  });

  /* Fill the chunks directly above the opening so the ceiling reads as rock rather
     than as the edge of the world. */
  [5, 6, 7, 8, 9, 10].forEach(function (cx) {
    A.chunk(cx, 6, function (b) {
      b.wall(0, 24, 0, 24, b.M.wallDark);
    });
  });

})(window.PROTO = window.PROTO || {});
