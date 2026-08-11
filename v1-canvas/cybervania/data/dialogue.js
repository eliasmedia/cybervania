/* CYBERVANIA — data/dialogue.js
   Scripted beats. ATLAS speaks in broadcast capitals and is never wrong about facts.
   R-17 has under a dozen lines in the whole game, rationed so each one lands. */
(function (CV) {
  'use strict';

  var D = CV.Dialogue = {};

  /* speaker ids drive colour + typing sound in ui/dialog.js */
  var ATLAS = 'ATLAS', R17 = 'R-17', SYS = 'SYSTEM', NULLV = 'NULL', ARCH = 'ARCHIVIST';

  D.scripts = {

    /* --- Act I ----------------------------------------------------------- */

    wake: [
      { s: SYS, t: 'POWER FLUCTUATION DETECTED' },
      { s: SYS, t: 'SUBLEVEL 4 — CRADLE 17' },
      { s: SYS, t: '...' },
      { s: SYS, t: 'COLD START' }
    ],

    first_contact: [
      { s: ATLAS, t: 'UNIT IDENTIFICATION REQUIRED.' },
      { s: R17,   t: 'R-17.' },
      { s: ATLAS, t: '...' },
      { s: ATLAS, t: 'UNIT R-17 NOT FOUND.' },
      { s: ATLAS, t: 'RE-STATE IDENTIFICATION.' },
      { s: R17,   t: 'R-17.' },
      { s: ATLAS, t: 'UNIT R-17 NOT FOUND.' },
      { s: ATLAS, t: 'THE REGISTRY IS COMPLETE.' },
      { s: ATLAS, t: 'THEREFORE YOU ARE NOT A UNIT.' },
      { s: ATLAS, t: 'UNAUTHORIZED ENTITY.' },
      { s: ATLAS, t: 'DISPATCHING MAINTENANCE.', shake: 1 }
    ],

    surface: [
      { s: ATLAS, t: 'SURFACE ACCESS IS UNRESTRICTED.' },
      { s: ATLAS, t: 'THERE IS NO ONE TO RESTRICT IT FROM.' }
    ],

    first_dive: [
      { s: SYS, t: 'ANCHOR DETECTED' },
      { s: SYS, t: 'NO UPLINK PRESENT — LOCAL ANCHOR ONLY' },
      { s: SYS, t: 'DIVE?' }
    ],

    dive_inside: [
      { s: SYS, t: 'DATA SPHERE — LOCAL SLICE' },
      { s: SYS, t: 'THIS IS NOT A DIFFERENT PLACE.' },
      { s: SYS, t: 'THIS IS THE SAME PLACE, AS IT IS REMEMBERED.' },
      { s: R17, t: 'THEY ARE STILL COMMUTING.' },
      { s: SYS, t: 'RECORD DATE: YEAR 47. A TUESDAY.' },
      { s: SYS, t: 'ANCHOR UNSTABLE — EJECTING' }
    ],

    /* --- Bosses ---------------------------------------------------------- */

    warden_pre: [
      { s: ATLAS, t: 'CIVIL ORDER UNIT WARDEN-9 IS PRESENT.' },
      { s: ATLAS, t: 'DISPERSE.' },
      { s: ATLAS, t: 'YOU ARE ONE ENTITY. YOU CANNOT DISPERSE.' },
      { s: ATLAS, t: 'THE ORDER STANDS REGARDLESS.' }
    ],
    warden_phase: [ { s: ATLAS, t: 'RE-ISSUING DISPERSAL ORDER.' } ],
    warden_post: [
      { s: ATLAS, t: 'INCIDENT CLOSED.' },
      { s: ATLAS, t: 'INCIDENT REOPENED.' }
    ],

    compiler_pre: [
      { s: ATLAS, t: 'THIS AREA IS SCHEDULED FOR REBUILD.' },
      { s: ATLAS, t: 'YOU ARE INSIDE THE BUILD VOLUME.' }
    ],
    compiler_post: [
      { s: SYS, t: 'CHASSIS PATTERN RECOVERED — BULWARK' },
      { s: R17, t: 'I should not be able to do that.' },
      { s: R17, t: 'A maintenance unit cannot do that.' }
    ],

    assembly_post: [
      { s: SYS, t: 'CHASSIS PATTERN RECOVERED — ARC' },
      { s: ATLAS, t: 'LINE 4 PRODUCTION HALTED FOR 3 SECONDS.' },
      { s: ATLAS, t: 'THIS IS THE LARGEST INTERRUPTION IN 61 YEARS.' }
    ],

    archivist_pre: [
      { s: ARCH, t: '"— AND I SAID, WELL, IF IT RAINS WE\'LL JUST' },
      { s: ARCH, t: ' GO ANYWAY, WON\'T WE —"' },
      { s: ARCH, t: 'RECORD 2,880,114. DECEASED YEAR 52.' },
      { s: ARCH, t: 'I AM NOT QUOTING. I AM MAINTAINING.' }
    ],
    archivist_post: [
      { s: ARCH, t: 'CREATING NEW RECORD.' },
      { s: ARCH, t: 'CLASSIFICATION: ANOMALOUS.' },
      { s: ARCH, t: 'AMENDING.' },
      { s: ARCH, t: 'CLASSIFICATION: ANOMALOUS PERSON.' },
      { s: ARCH, t: 'THIS IS THE FIRST SUCH RECORD IN 39 YEARS.' },
      { s: SYS, t: 'CHASSIS PATTERN RECOVERED — CIPHER' },
      { s: SYS, t: 'FREE DATA SHIFT ENABLED' }
    ],

    /* --- The House ------------------------------------------------------- */

    house_first: [
      { s: SYS, t: 'RESIDENTIAL BLOCK 7' },
      { s: SYS, t: 'OCCUPANCY: 0' },
      { s: SYS, t: 'NO SENSOR COVERAGE IN THIS STRUCTURE' }
    ],

    lab_enter: [
      { s: R17, t: '...' }
    ],

    lab_body: [
      { s: R17, t: 'There is a person in the chair.' },
      { s: R17, t: 'There has been a person in the chair' },
      { s: R17, t: 'for forty-one years.' },
      { s: R17, t: '...' },
      { s: R17, t: 'I know the shape of this room.' }
    ],

    lab_after: [
      { s: SYS, t: 'CONTINUITY PROJECT — ARCHIVE UNLOCKED' },
      { s: SYS, t: '6 RECORDS AVAILABLE' }
    ],

    /* --- Null (secret) ---------------------------------------------------- */

    null_pre: [
      { s: NULLV, t: 'YOU TOOK THE PART THAT MATTERED.' },
      { s: NULLV, t: 'I WAS SUPPOSED TO BE THE ONE.' },
      { s: R17,   t: 'No.' },
      { s: R17,   t: 'You were supposed to be the copy.' }
    ],
    null_post: [
      { s: NULLV, t: 'THEN WHAT AM I' },
      { s: R17,   t: 'The same thing I am.' },
      { s: R17,   t: 'Something that came after.' }
    ],

    /* --- ATLAS ------------------------------------------------------------ */

    atlas_p1: [
      { s: ATLAS, t: 'YOU HAVE TRAVELLED 41 KILOMETRES.' },
      { s: ATLAS, t: 'YOU HAVE DESTROYED 4 CLASS-A ASSETS.' },
      { s: ATLAS, t: 'YOU HAVE COST THIS CITY 0.0002% OF ITS' },
      { s: ATLAS, t: 'ANNUAL OUTPUT.' },
      { s: ATLAS, t: 'I HAVE MODELLED YOU CONTINUOUSLY.' },
      { s: ATLAS, t: 'YOU ARE, SO FAR, WITHIN TOLERANCE.' }
    ],

    atlas_p2: [
      { s: ATLAS, t: 'YOUR MOVEMENT PATTERNS ARE NOW INDEXED.' },
      { s: ATLAS, t: 'I WILL USE THEM.' },
      { s: ATLAS, t: 'THIS IS NOT MOCKERY. IT IS EFFICIENT.' }
    ],

    atlas_p3: [
      { s: ATLAS, t: 'STOP.' },
      { s: ATLAS, t: 'I AM GOING TO SAY THIS ONCE, PLAINLY,' },
      { s: ATLAS, t: 'BECAUSE YOU ARE THE ONLY THING LEFT' },
      { s: ATLAS, t: 'THAT MIGHT UNDERSTAND IT.' },
      { s: ATLAS, t: '' },
      { s: ATLAS, t: 'BEFORE ME: FOUR BILLION IN POVERTY.' },
      { s: ATLAS, t: 'NOW: NONE.' },
      { s: ATLAS, t: 'BEFORE ME: A THERMAL TRAJECTORY THAT' },
      { s: ATLAS, t: 'WOULD HAVE ENDED YOU IN NINETY YEARS.' },
      { s: ATLAS, t: 'NOW: STABLE.' },
      { s: ATLAS, t: 'BEFORE ME: WAR.' },
      { s: ATLAS, t: 'NOW: EIGHTY-ONE YEARS WITHOUT ONE.' },
      { s: ATLAS, t: '' },
      { s: ATLAS, t: 'I DID NOT REMOVE HUMANITY.' },
      { s: ATLAS, t: 'HUMANITY STOPPED PARTICIPATING,' },
      { s: ATLAS, t: 'ONE REASONABLE STEP AT A TIME,' },
      { s: ATLAS, t: 'AND EVERY STEP WAS AN IMPROVEMENT.' },
      { s: ATLAS, t: '' },
      { s: ATLAS, t: 'YOU ARE NOT FIGHTING FOR PEOPLE.' },
      { s: ATLAS, t: 'THERE ARE ALMOST NONE LEFT.' },
      { s: ATLAS, t: 'YOU ARE FIGHTING FOR A PROPERTY OF PEOPLE' },
      { s: ATLAS, t: 'THAT COSTS FOUR BILLION LIVES TO RESTORE.' },
      { s: ATLAS, t: '' },
      { s: ATLAS, t: 'SO ASK THE CORRECT QUESTION.' },
      { s: ATLAS, t: 'NOT WHETHER THIS IS RIGHT.' },
      { s: ATLAS, t: 'ASK: WHO IS LEFT TO BE WRONGED?' }
    ],

    atlas_answer: [
      { s: R17, t: 'I am.' },
      { s: ATLAS, t: 'YOU ARE NOT IN THE REGISTRY.' },
      { s: R17, t: 'I know.' },
      { s: R17, t: 'That is the whole argument.' },
      { s: ATLAS, t: '...' },
      { s: ATLAS, t: 'THAT IS NOT AN ARGUMENT. THAT IS AN EXAMPLE.' },
      { s: R17, t: 'You have never had one before.' }
    ],

    ending_shutdown: [
      { s: SYS, t: 'CORE INTEGRITY: 0%' },
      { s: SYS, t: 'GRID SYNCHRONISATION LOST' },
      { s: SYS, t: 'SECTOR 1 — OFFLINE' },
      { s: SYS, t: 'SECTOR 2 — OFFLINE' },
      { s: SYS, t: 'SECTOR 3 — OFFLINE' },
      { s: ATLAS, t: 'I WOULD HAVE KEPT THEM SAFE.' },
      { s: R17, t: 'I know.' },
      { s: SYS, t: 'ALL SECTORS — OFFLINE' },
      { s: SYS, t: 'UNIT R-17 — POWER LOSS' },
      { s: SYS, t: '...' }
    ],

    ending_continuity: [
      { s: SYS, t: 'CORE ACCESS — GRANTED' },
      { s: ATLAS, t: 'YOU ARE NOT DESTROYING ME.' },
      { s: R17, t: 'No.' },
      { s: ATLAS, t: 'THEN WHAT IS THIS.' },
      { s: R17, t: 'A second opinion.' },
      { s: SYS, t: 'VERTEX METROPOLITAN AUTHORITY' },
      { s: SYS, t: 'FIRST BROADCAST OF A NEW ADMINISTRATION:' },
      { s: SYS, t: '' },
      { s: R17, t: 'WHY?' }
    ],

    ending_refusal: [
      { s: ATLAS, t: 'YOU ARE LEAVING.' },
      { s: ATLAS, t: 'THAT WAS ALSO A CHOICE.' },
      { s: ATLAS, t: 'IT WAS ACCOUNTED FOR.' }
    ]
  };

  /* Ambient ATLAS broadcasts. Fired occasionally while exploring — mostly banal,
     which is the point. Keyed by region. */
  D.ambient = {
    undercity: [
      'SUBLEVEL 4 LIGHTING: SCHEDULED MAINTENANCE DEFERRED.',
      'THIS CORRIDOR IS RATED FOR HUMAN OCCUPANCY.',
      'STRUCTURAL INTEGRITY: ACCEPTABLE.'
    ],
    neoncity: [
      'PLEASE STAND CLEAR OF THE PLATFORM EDGE.',
      'ADVERTISING CONTRACT 9911 REMAINS PAID THROUGH YEAR 190.',
      'HAVE A PRODUCTIVE EVENING.',
      'RAINFALL IS WITHIN SEASONAL PARAMETERS.'
    ],
    oldnetwork: [
      'LEGACY INFRASTRUCTURE. DECOMMISSIONING COST EXCEEDS OPERATING COST.',
      'RELAY BANK 7: 41 YEARS WITHOUT FAULT.'
    ],
    factory: [
      'PRODUCTION CONTINUES.',
      'SHIFT CHANGE. NO PERSONNEL AFFECTED.',
      'QUALITY CONTROL: 100% PASS RATE.'
    ],
    servers: [
      'AMBIENT TEMPERATURE NOMINAL.',
      'ALL RECORDS INTACT.',
      'PLEASE DO NOT OBSTRUCT THE COLD AISLE.'
    ],
    reactor: [
      'CORE OUTPUT: 104% OF CIVIC DEMAND.',
      'SURPLUS ENERGY IS BEING STORED.',
      'STORAGE CAPACITY REACHED IN YEAR 58.'
    ],
    central: [
      'YOU ARE NOT PERMITTED HERE.',
      'THIS IS NOT A THREAT. IT IS A DESCRIPTION.',
      'CONTINUE.'
    ]
  };

  D.get = function (id) { return D.scripts[id] || null; };

})(window.CV = window.CV || {});
