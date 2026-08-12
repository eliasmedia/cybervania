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

   CHUNKS ARE DATA. Each room is a list of ops — verb, arguments, and an optional
   trailing '# note'. That is what lets the in-game editor (?edit) touch them: it edits
   this list and writes this file back out. The notes are not decoration; REDESIGN.md 5a
   requires every ledge to answer "what is this for", and the editor round-trips them.

   Level-design rules from REDESIGN.md 5 are applied literally: big spaces, no spike
   carpets, gaps with margin, long stretches where nothing happens except the room. The
   jump numbers in 5b are measured, not assumed — steps of 4.5, landing zones 4 wide
   starting about 3 units out, 7.5 units of clear air over every takeoff.

   Seven rooms, eight ledges total, and four of those eight are the single climb out of
   the sump. Two of the three rooms with an enemy in them have no ledge at all. */
(function (P) {
  'use strict';

  var A = P.Authored;

  /* ========================================================================== */
  A.chunk(5, 7, {
    name: 'CRADLE 17',
    note: 'The first thing the player sees. Deliberately small, dim, and safe. The only\n' +
          'bright object is the cradle they just detached from.',
    ops: [
      ['backdrop', 'wallDark'],
      ['floor', 0, 24, 3],
      ['ceiling', 0, 24, 15],
      ['wall', 0, 3, 3, 15, '# sealed to the west: the only way is right'],
      ['spawn', 'start', 7, 4],
      ['cradle', 5, 3],
      ['pipes', 12, 13, 22, 2],
      ['drip', 9, 14, 3.2],
      ['drip', 17, 14, 3.2],
      ['lamp', 20, 3, 0xffb23d, 3.4,
        '# one weak sodium lamp far right — you walk toward the light without being told to'],
      ['light', 6, 7, 0x4de3ff, 1.2, 10],
      ['clutter', 15, 3],
      ['fg', 2, 8, 1.2, 16, '# near pillar, frames the shot'],
      ['trigger', 'wake', 5, 3, 6, 8, 'wake']
    ]
  });

  /* ========================================================================== */
  A.chunk(6, 7, {
    name: 'DRIP SPUR',
    note: 'Pure walking, one knee-height step, and the first piece of storytelling: a\n' +
          'maintenance unit exactly like you, which did not wake up.',
    ops: [
      ['backdrop', 'wallDark'],
      ['floor', 0, 14, 3],
      ['floor', 14, 24, 4, '# knee-height step: walked over, not jumped'],
      ['ceiling', 0, 24, 16],
      ['pipes', 12, 14, 24, 3],
      ['drip', 4, 15, 3.2],
      ['drip', 11, 15, 3.2],
      ['drip', 19, 15, 4.2],
      ['deadBot', 8, 3, 1],
      ['clutter', 17, 4],
      ['lamp', 3, 3, 0xffb23d, 3],
      ['steam', 21, 4],
      ['fg', 23, 9, 1, 18],
      ['trigger', 'corridor', 7, 3, 5, 8, 'corridor']
    ]
  });

  /* ========================================================================== */
  A.chunk(7, 7, {
    name: 'THE CISTERN',
    note: 'The first real space, and the first fight.\n\n' +
          'NO LEDGES. The room is a basin, and its SHAPE is the vantage.\n\n' +
          'The first draft put a balcony on the west wall so you could look before you\n' +
          'committed. Driving the real controller at it proved it was not jumpable: its\n' +
          'only access was its east end, which meant walking into the Crawler\'s alert\n' +
          'radius to reach the thing whose whole purpose was to see the Crawler first. A\n' +
          'ledge that has to be explained that hard is the wrong answer.\n\n' +
          'So the floor does the work instead. You walk in on a shelf at 4.5, level with\n' +
          'the corridor behind you. Eight units in the floor falls away to 0 and you are\n' +
          'looking down into the cistern with the Crawler in the bottom of it, outside its\n' +
          '11-unit alert radius, under no time pressure, from a place you arrived at by\n' +
          'walking. Then you drop in, because the only way east is across the basin.\n\n' +
          'Getting out is two single-jump steps up the east side. The basin is 16 units\n' +
          'wide and the longest jump in the game clears about 10, so there is no version\n' +
          'of this room that is crossed above the fight.',
    ops: [
      ['backdrop', 'wall', -6],
      ['floor', 0, 8, 4.5, '# the shelf you walk in on, and look from'],
      ['floor', 8, 20, 0, '# the basin — the fight happens down here'],
      ['floor', 20, 24, 2.25, '# the step out, readable from across the room'],
      ['ceiling', 0, 24, 23, '# high: the room breathes'],
      ['enemy', 'crawler', 17, 0.5, { facing: -1 }],
      ['lamp', 2, 4.5, 0xffb23d, 3.6],
      ['neon', 'SUB 4', 12, 19, 0xffb23d, { scale: 0.8, intensity: 2.6 },
        '# read from the floor, not stood on — nothing reaches it'],
      ['light', 12, 10, 0xffb23d, 1.4, 16],
      ['steam', 9, 0],
      ['clutter', 21, 2.25],
      ['cable', 0, 21, 24, 20, 1.6],
      ['pipes', 12, 22, 24, 2],
      ['fg', 1, 10, 1.4, 20],
      ['fg', 22, 7, 1, 14],
      ['trigger', 'cistern', 4, 4.5, 6, 9, 'cistern']
    ]
  });

  /* ========================================================================== */
  A.chunk(8, 7, {
    name: 'THE CLIMB',
    note: 'The ground route runs straight through — the fourth room of the game is not\n' +
          'the place for a gate. The climb is an OPTIONAL branch that dead-ends at a\n' +
          'reward.\n\n' +
          'THREE ledges, not five. The first pass had five and it read as scaffolding, a\n' +
          'staircase you climb because it is there. Three big ones in a switchback read as\n' +
          'a route, and each one is a single decision rather than a rung.\n\n' +
          'Purpose: reach the dead unit at the top. That is the whole reason the climb\n' +
          'exists, there is nothing else up here, and the top ledge goes nowhere. Because\n' +
          'this room has no enemy an elevated route costs nothing — the ledges only have\n' +
          'to justify themselves as somewhere to go, and they do.\n\n' +
          'Steps are 4.5 against a measured 4.97 double jump, the only overlapping pair is\n' +
          '9 apart, and the switchback puts each landing above the previous ledge\'s end.',
    ops: [
      ['backdrop', 'wall', -6],
      ['floor', 0, 24, 4.5, '# continuous: you can simply walk east'],
      ['ceiling', 0, 24, 23],
      ['platform', 14, 22, 9, '# east: step up off the floor'],
      ['platform', 3, 13, 13.5, '# west: the long shelf, the room\'s balcony'],
      ['platform', 13, 21, 18, '# east: the top, and the end of the line'],
      ['deadBot', 16, 18, 1, '# what the climb is for'],
      ['neon', 'AUX', 16, 20.5, 0x5cff9d, { scale: 0.55, intensity: 1.8 }],
      ['catwalk', 5, 14.1, 6, '# decoration only — carries no collider'],
      ['lamp', 11, 4.5, 0x7ecfff, 3],
      ['light', 8, 14, 0x4de3ff, 1.1, 12],
      ['clutter', 4, 4.5],
      ['steam', 20, 4.5],
      ['cable', 0, 22, 24, 21, 1.2],
      ['fg', 23, 12, 1.2, 22]
    ]
  });

  /* ========================================================================== */
  A.chunk(9, 7, {
    name: 'JUNCTION 4-A',
    note: 'The beat the whole opening exists for. A Sentinel Eye is mounted where it\n' +
          'cannot be avoided. It does no damage. It reports you, and ATLAS answers.',
    ops: [
      ['backdrop', 'wallDark'],
      ['floor', 0, 24, 4.5],
      ['ceiling', 0, 24, 18],
      ['platform', 6, 12, 10,
        '# the only way to reach the Sentinel: it is mounted at 12.5, out of reach from ' +
        'the floor, and this ledge ends one unit short of it at a height where a single ' +
        'jump puts your blade through it. Not a bypass — the Eye sees 13 units in every ' +
        'direction, so the choice is whether to kill it, not whether to walk past it'],
      ['enemy', 'eye', 13, 12.5,
        '# mounted high and central: you walk into its cone however you enter'],
      ['neon', '4-A', 4, 14, 0x5cff9d, { scale: 0.7, intensity: 2 }],
      ['lamp', 19, 4.5, 0xffb23d, 3.2],
      ['light', 13, 13, 0xffb23d, 1.6, 14],
      ['pipes', 12, 16.5, 24, 3],
      ['deadBot', 20, 4.5, -1],
      ['clutter', 8, 4.5],
      ['steam', 16, 4.5],
      ['fg', 2, 11, 1.2, 20]
    ]
  });

  /* ========================================================================== */
  A.chunk(10, 7, {
    name: 'THE SPUR',
    note: 'Where the opening hands off. ATLAS has dispatched maintenance, so this is the\n' +
          'first room that is actively hostile: two Crawlers and no cover. It also opens\n' +
          'downward, which is the first time the world admits it goes somewhere other\n' +
          'than east.\n\n' +
          'NO LEDGES. This room had two, and they were the clearest case of the problem:\n' +
          'one sat directly over the first Crawler at a height it cannot lunge to, and the\n' +
          'other spanned the gap the second Crawler is guarding. Together they were an\n' +
          'elevated lane over the entire encounter, which made both enemies scenery.\n\n' +
          'What is left is the actual content: two Crawlers on open ground and a gap.\n' +
          'Height is not offered because there is nothing up there worth reaching, and the\n' +
          'moment it is offered the fight stops mattering.',
    ops: [
      ['backdrop', 'wall', -6],
      ['floor', 0, 12, 4.5],
      ['floor', 20, 24, 4.5,
        '# the floor stops: eight units of drop, chosen by measurement. A single running ' +
        'jump clears it from exactly one takeoff spot and fails everywhere else; a double ' +
        'jump clears it comfortably from half the approach. This is where the second jump ' +
        'stops being optional, said without a line of text — miss it and you land in the ' +
        'sump, which is not a punishment but the other half of the level'],
      ['ceiling', 0, 24, 20],
      ['enemy', 'crawler', 9, 5, { facing: -1 }],
      ['enemy', 'crawler', 22, 5, { facing: -1 }],
      ['wall', 23, 24, 4.5, 20,
        '# the end of the authored world, for now. With procedural fill gone there is ' +
        'nothing east of here, so the region seals itself rather than letting the player ' +
        'walk into empty space. A bulkhead reads as "this opens later", which is true, ' +
        'where a blank wall reads as the level running out'],
      ['neon', 'SEALED', 21, 9, 0xff4459, { scale: 0.5, intensity: 1.6 }],
      ['lamp', 3, 4.5, 0xffb23d, 3.2],
      ['neon', '4-B', 18, 16, 0xff4459, { scale: 0.7, intensity: 2.2 }],
      ['catwalk', 4, 12, 8, '# reads as height without being height'],
      ['light', 12, 12, 0xff4459, 1.2, 14],
      ['pipes', 12, 18.5, 24, 2],
      ['cable', 0, 19, 24, 18, 1.4],
      ['steam', 17, 4.5],
      ['clutter', 5, 4.5],
      ['fg', 23, 11, 1.2, 20]
    ]
  });

  /* ========================================================================== */
  A.chunk(10, 8, {
    name: 'SUMP',
    note: 'Below the gap. A soft landing, so the first drop is an invitation and not a\n' +
          'punishment — and it has to stay an invitation on the way back too: before R-17\n' +
          'has a single traversal module, a one-way hole is a softlock. It was one.\n\n' +
          'THE WAY OUT. Four ledges, all four for one reason: this chamber is sealed on\n' +
          'both sides and nothing else in it goes up. Every step is 4.5 against a measured\n' +
          '4.97 double jump.\n\n' +
          'The shape of the climb is set by a constraint that took a frame-by-frame trace\n' +
          'to see. (10,7)\'s floor is a three-unit slab, so everything outside the hole has\n' +
          'a hard ceiling at y=25.5. A ledge at 19.5 out there has exactly 3 units of\n' +
          'headroom: you can stand on it and you cannot jump off it — R-17 topped out at\n' +
          '22.5 and slid back down, on every timing. So the climb starts wide in the open\n' +
          'chamber and finishes inside the shaft, where there is nothing overhead at all.\n\n' +
          'That is also why the hole above is eight units and not six: at six the shaft\n' +
          'ledges were three units wide, and a jump arriving near its apex with sideways\n' +
          'speed overshot a three-unit target four times in five.',
    ops: [
      ['backdrop', 'wallDark'],
      ['floor', 0, 24, 6],
      ['wall', 0, 2, 6, 24],
      ['wall', 22, 24, 6, 24],
      ['platform', 16, 21, 10.5, '# east, clear of everything overhead'],
      ['platform', 8, 15, 15, '# the wide shelf, and the room\'s landmark'],
      ['platform', 12, 16, 19.5, '# into the shaft, where the ceiling stops'],
      ['platform', 16, 19.5, 24, '# the far lip is half a unit away'],
      ['lamp', 6, 6, 0xffb23d, 3],
      ['light', 12, 11, 0xffb23d, 1.3, 16],
      ['deadBot', 17, 6, -1],
      ['clutter', 9, 6],
      ['steam', 20, 6],
      ['drip', 12, 22, 6.2],
      ['fg', 2, 12, 1.2, 18]
    ]
  });

  /* Fill the chunks directly above the opening so the ceiling reads as rock rather
     than as the edge of the world. */
  [5, 6, 7, 8, 9, 10].forEach(function (cx) {
    A.chunk(cx, 6, { name: 'ROCK', ops: [['wall', 0, 24, 0, 24, 'wallDark']] });
  });

})(window.PROTO = window.PROTO || {});
