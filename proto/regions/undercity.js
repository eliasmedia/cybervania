/* CYBERVANIA — proto/regions/undercity.js
   THE OPENING. "Nothing down here was ever finished."

   Played left to right, teaching the game entirely through geometry — there is no
   tutorial text anywhere in this file.

     (5,7) CRADLE 17    wake up. one light. one exit. nothing can hurt you.
     (6,7) DRIP SPUR    walking. a step to clear. the first dead unit.
     (7,7) THE CISTERN  the space opens. first Crawler. first fight.
     (8,7) THE CLIMB    vertical, and optional. the ground route runs straight through.
     (9,7) JUNCTION 4-A a Sentinel Eye sees you, and ATLAS answers.
     (10,7) THE SPUR    two Crawlers, no cover, and the floor runs out.
     (10,8) SUMP        where the drop lands, and the way back out of it.

   Level-design rules from REDESIGN.md section 5 are applied literally here: big spaces,
   no spike carpets, gaps with margin, and long stretches where nothing is happening
   except the room.

   PLATFORMS (section 5a). Playtest: you could run the ledges and skip every ground
   enemy. Every ledge in this file now names what it is for in the comment above it, and
   `PROTO.Validate.bypass()` fails the build if any encounter can be crossed past without
   entering its reach. Seven rooms, eight ledges total — and four of those eight are the
   single climb out of the sump. Two of the three rooms with an enemy in them have no
   ledge at all. */
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
     The first real space, and the first fight. Ceiling goes up, the camera has room.
     ========================================================================== */
  A.chunk(7, 7, function (b) {
    b.backdrop(b.M.wall, -6);

    /* NO LEDGES. The room is a basin, and its SHAPE is the vantage.

       The first draft put a balcony on the west wall so you could look before you
       committed. Driving the real controller at it proved it was not jumpable — its only
       access was its east end, which meant walking into the Crawler's alert radius to
       reach the thing whose whole purpose was to see the Crawler first. A ledge that has
       to be explained that hard is the wrong answer.

       So the floor does the work instead. You walk in on a shelf at 4.5, level with the
       corridor behind you. Eight units in, the floor falls away to 0 and you are looking
       down into the cistern with the Crawler in the bottom of it — outside its 11-unit
       alert radius, under no time pressure, from a place you arrived at by walking.
       Then you drop in, because the only way east is across the basin floor.

       Getting out is two single-jump steps up the east side. The basin is 16 units wide
       and the longest jump in the game clears about 9, so there is no version of this
       room that is crossed above the fight. */
    b.floor(0, 8, 4.5);                  // the shelf you walk in on, and look from
    b.floor(8, 20, 0);                   // the basin — the fight happens down here
    b.floor(20, 24, 2.25);               // the step out, readable from across the room
    b.ceiling(0, 24, 23);                // high: the room breathes

    b.enemy('crawler', 17, 0.5, { facing: -1 });

    b.lamp(2, 4.5, 0xffb23d, 3.6);
    /* The sign is meant to be read from the floor, not stood on. Nothing reaches it. */
    b.neon('SUB 4', 12, 19, 0xffb23d, { scale: 0.8, intensity: 2.6 });
    b.light(12, 10, 0xffb23d, 1.4, 16);

    b.steam(9, 0);
    b.clutter(21, 2.25);
    b.cable(0, 21, 24, 20, 1.6);
    b.pipes(12, 22, 24, 2);

    b.fg(1, 10, 1.4, 20);
    b.fg(22, 7, 1.0, 14);

    b.trigger('cistern', 4, 4.5, 6, 9, 'cistern');
  });

  /* ==========================================================================
     (8,7) THE CLIMB
     The ground route runs straight through — the fourth room of the game is not the
     place for a gate. The climb is an OPTIONAL branch that dead-ends at a reward.
     ========================================================================== */
  A.chunk(8, 7, function (b) {
    b.backdrop(b.M.wall, -6);
    b.floor(0, 24, 4.5);                 // continuous: you can simply walk east
    b.ceiling(0, 24, 23);

    /* THREE ledges, not five. The first pass had five and it read as scaffolding — a
       staircase you climb because it is there. Three big ones in a switchback read as a
       route, and each one is a single decision rather than a rung.

       Purpose: reach the dead unit at the top. That is the whole reason the climb
       exists, there is nothing else up here, and the top ledge goes nowhere. Because
       this room has no enemy, an elevated route costs nothing — the ledges only have to
       justify themselves as somewhere to go, and they do.

       Three hard constraints, all three violated by earlier drafts:
         1. R-17 is 3 units tall, so anything over a walking surface needs its underside
            at least 3 clear. The lowest ledge is at y=9 (underside 8) over a floor at
            4.5 — 3.5 clear.
         2. Two ledges that overlap horizontally must be more than 3 apart vertically or
            the lower one is a pocket. The only overlapping pair here is 9 apart.
         3. Every step is 4.5 units, against a measured 4.97-unit double jump. A 5-unit
            step is technically clearable and was here for one draft, but it lands on the
            ledge grab a third of the time, and a climb built out of assists is a
            precision climb. 4.5 leaves the assist as slack instead of as the plan.
       The switchback puts each landing directly above the previous ledge's end, so no
       jump in the room needs aim either. */
    b.platform(14, 22, 9);               // east: step up off the floor
    b.platform(3, 13, 13.5);             // west: the long shelf, the room's balcony
    b.platform(13, 21, 18);              // east: the top, and the end of the line

    /* What the climb is for: a dead unit slumped at the top, and the region's first
       piece of environmental storytelling that is not on the critical path. */
    b.deadBot(16, 18, 1);
    b.neon('AUX', 16, 20.5, 0x5cff9d, { scale: 0.55, intensity: 1.8 });

    b.catwalk(5, 14.1, 6);               // decoration only — carries no collider
    b.lamp(11, 4.5, 0x7ecfff, 3.0);
    b.light(8, 14, 0x4de3ff, 1.1, 12);
    b.clutter(4, 4.5);
    b.steam(20, 4.5);
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

    /* Purpose: the only way to reach the Sentinel. It is mounted at y=12.5, out of reach
       from the floor, and this ledge ends at x=12 — one unit short of it, at a height
       where a single jump puts your blade through it. That is the entire argument for
       the ledge existing, and it is why it is short and why it points at the enemy.

       It is not a bypass: the Sentinel does no damage and sees 13 units in every
       direction, so there is no height and no route that avoids being seen. The choice
       the room offers is whether to kill it before it finishes reporting, not whether to
       walk past it. */
    b.platform(6, 12, 10);

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
    b.floor(0, 12, 4.5);
    /* The floor stops. Beyond is the drop into the rest of the Undercity — eight units
       of it, and that number was chosen by measurement. A single running jump clears it
       from exactly one takeoff spot and fails everywhere else; a double jump clears it
       comfortably from half the approach. So this is the room where the second jump
       stops being optional, and the game says so without a line of text: if you have not
       worked it out, you land in the sump, which is not a punishment but the other half
       of the level. */
    b.floor(20, 24, 4.5);
    b.ceiling(0, 24, 20);

    /* NO LEDGES. This room had two, and they were the clearest case of the problem:
       one sat directly over the first Crawler at a height it cannot lunge to, and the
       other spanned the gap the second Crawler is guarding. Together they were an
       elevated lane over the entire encounter, which made both enemies scenery.

       What is left is the actual content — two Crawlers on open ground and a five-unit
       gap. The gap is a running jump with room to spare, so it is a beat, not a skill
       check, and the Crawler on the far lip is a fair ambush because you can see it
       before you commit to the jump. Height is not offered here because there is nothing
       up there worth reaching, and the moment it is offered the fight stops mattering. */

    b.enemy('crawler', 9, 5, { facing: -1 });
    b.enemy('crawler', 22, 5, { facing: -1 });

    /* THE END OF THE AUTHORED WORLD, for now. With procedural fill gone there is
       nothing east of here, so the region seals itself rather than letting the player
       walk into empty space. A bulkhead reads as "this opens later" — which is true —
       where a blank wall would read as the level running out. The way on from this room
       is the drop. */
    b.wall(23, 24, 4.5, 20);
    b.neon('SEALED', 21, 9, 0xff4459, { scale: 0.5, intensity: 1.6 });

    b.lamp(3, 4.5, 0xffb23d, 3.2);
    b.neon('4-B', 18, 16, 0xff4459, { scale: 0.7, intensity: 2.2 });
    b.catwalk(4, 12, 8);                 // reads as height without being height
    b.light(12, 12, 0xff4459, 1.2, 14);
    b.pipes(12, 18.5, 24, 2);
    b.cable(0, 19, 24, 18, 1.4);
    b.steam(17, 4.5);
    b.clutter(5, 4.5);
    b.fg(23, 11, 1.2, 20);
  });

  /* ==========================================================================
     (10,8) SUMP — below the gap
     A soft landing, so the first drop is an invitation and not a punishment. The drop
     is the first thing in the game that is not eastward, and it has to stay an
     invitation on the way back too: before R-17 has a single traversal module, a
     one-way hole is a softlock. It was one. The four ledges here are the fix.
     ========================================================================== */
  A.chunk(10, 8, function (b) {
    b.backdrop(b.M.wallDark);
    b.floor(0, 24, 6);
    b.wall(0, 2, 6, 24);
    b.wall(22, 24, 6, 24);

    /* THE WAY OUT. Four ledges, and all four exist for one reason: this chamber is
       sealed on both sides and nothing else in it goes up.

       Every step is 4.5 units, measured against a real double jump of 4.97 — the first
       draft used 5 and cleared it only because the ledge grab caught the lip every time,
       which is a precision jump wearing a disguise.

       The shape of the climb is set by a constraint that took a frame-by-frame trace to
       see. (10,7)'s floor is a three-unit slab, so everything in this chamber outside
       the hole has a hard ceiling at y=25.5. A ledge at 19.5 out there has exactly 3
       units of headroom: you can stand on it and you cannot jump off it — the trace
       showed R-17 topping out at 22.5 and sliding back down, on every timing. So the
       climb starts wide in the open chamber and finishes inside the shaft, where there
       is nothing overhead at all.

       That is also why the hole above is eight units and not six. Measured against the
       real controller, a 4.5-unit jump peaks about three units of travel from the
       takeoff and holds enough height to land for roughly two and a half units after
       that. Which gives the three numbers every step in this file is now built from:

         a landing zone starts about 3 units from the takeoff,
         it is at least 4 units wide,
         and the takeoff has 7.5 units of clear air above it — 4.5 to rise plus R-17.

       That last one is what nothing here obeyed before. Overlapping ledges 4.5 apart are
       fine to stand between and impossible to jump from, so the ledges alternate sides
       and each takeoff end is deliberately left uncovered.

       The top ledge stops at 19.5 and the floor above resumes at 20, so nothing is ever
       pinned under the slab. */
    b.platform(16, 21, 10.5);            // east, clear of everything overhead
    b.platform(8, 15, 15);               // the wide shelf, and the room's landmark
    b.platform(12, 16, 19.5);            // into the shaft, where the ceiling stops
    b.platform(16, 19.5, 24);            // the far lip is half a unit away

    b.lamp(6, 6, 0xffb23d, 3.0);
    b.light(12, 11, 0xffb23d, 1.3, 16);
    b.deadBot(17, 6, -1);
    b.clutter(9, 6);
    b.steam(20, 6);
    b.drip(12, 22, 6.2);
    b.fg(2, 12, 1.2, 18);
  });

  /* Fill the chunks directly above the opening so the ceiling reads as rock rather
     than as the edge of the world. */
  [5, 6, 7, 8, 9, 10].forEach(function (cx) {
    A.chunk(cx, 6, function (b) {
      b.wall(0, 24, 0, 24, b.M.wallDark);
    });
  });

})(window.PROTO = window.PROTO || {});
