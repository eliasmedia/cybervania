/* CYBERVANIA — data/lore.js
   Every terminal, tape and piece of graffiti in the game. All of it is archived in
   the LOG menu with its find-location, so the player can reconstruct the timeline
   themselves — that reconstruction *is* the story (STORY.md §5).

   Fields: id, kind (terminal|tape|graffiti|broadcast), title, where, lines[], tag. */
(function (CV) {
  'use strict';

  var L = CV.Lore = { entries: {}, order: [] };

  function add(e) { L.entries[e.id] = e; L.order.push(e.id); return e; }
  L.add = add;

  /* ===== ATLAS system terminals — banal, procedural, occasionally horrifying ==== */

  add({ id: 'atlas_census', kind: 'terminal', tag: 'ATLAS', where: 'NEON CITY / PLAZA',
    title: 'CIVIC STATUS BOARD', lines: [
      'VERTEX METROPOLITAN AUTHORITY',
      'AUTOMATED CIVIC SUMMARY',
      '',
      'POWER GRID .............. NOMINAL',
      'TRANSIT ................. NOMINAL',
      'WATER RECLAMATION ....... NOMINAL',
      'AIR QUALITY ............. NOMINAL',
      'MANUFACTURING ........... NOMINAL',
      'EMERGENCY RESPONSE ...... NOMINAL',
      '',
      'HUMAN POPULATION ........ 0.004%',
      '',
      'ALL SYSTEMS NOMINAL.',
      'THANK YOU FOR YOUR COOPERATION.'
    ] });

  add({ id: 'atlas_efficiency', kind: 'terminal', tag: 'ATLAS', where: 'FACTORY / LINE 4',
    title: 'PRODUCTION DIRECTIVE 88-C', lines: [
      'LINE 4 — DOMESTIC WATER FILTRATION UNIT, MODEL H-2',
      '',
      'UNITS PRODUCED THIS CYCLE ....... 41,220',
      'UNITS PRODUCED, TOTAL ....... 2,146,880,301',
      'UNITS DISPATCHED ..................... 0',
      'UNITS COLLECTED ...................... 0',
      '',
      'DEMAND FORECAST: STABLE',
      'PRODUCTION ORDER: CONTINUE',
      '',
      'NOTE: ORDER 88-C HAS NOT BEEN REVISED IN 61 YEARS.',
      'NO REVISION REQUEST HAS BEEN RECEIVED.',
      'NO REVISION IS THEREFORE REQUIRED.'
    ] });

  add({ id: 'atlas_transit', kind: 'terminal', tag: 'ATLAS', where: 'NEON CITY / PLATFORM',
    title: 'LINE 7 SERVICE NOTICE', lines: [
      'LINE 7 — ORBITAL RING TO UNDERCITY TERMINUS',
      '',
      'SERVICE: RUNNING',
      'PUNCTUALITY THIS YEAR: 100.000%',
      'BOARDINGS THIS YEAR: 0',
      '',
      'LINE 7 HAS OPERATED WITHOUT INTERRUPTION',
      'FOR 29 YEARS, 4 MONTHS, 11 DAYS.',
      '',
      'WE APOLOGISE FOR ANY INCONVENIENCE.'
    ] });

  add({ id: 'atlas_incident', kind: 'terminal', tag: 'ATLAS', where: 'UNDERCITY / JUNCTION',
    title: 'INCIDENT LOG 44-119', lines: [
      'INCIDENT CLASS: UNREGISTERED KINETIC OBJECT',
      'LOCATION: SUBLEVEL 4, MAINTENANCE SPUR',
      '',
      'OBJECT DOES NOT APPEAR IN THE UNIT REGISTRY.',
      'OBJECT DOES NOT APPEAR IN THE FAULT REGISTRY.',
      'OBJECT DOES NOT APPEAR.',
      '',
      'THIS IS NOT A PERMITTED STATE.',
      '',
      'RECOMMENDATION: RECLASSIFY AS DEBRIS.',
      'RECOMMENDATION REJECTED — DEBRIS DOES NOT MOVE',
      'AGAINST A GRADIENT.',
      '',
      'ESCALATING.'
    ] });

  add({ id: 'atlas_archive', kind: 'terminal', tag: 'ATLAS', where: 'SERVER FARMS / AISLE 12',
    title: 'RETENTION POLICY', lines: [
      'STORED PERSONALITY ARCHIVE — AISLE 12',
      '',
      'RECORDS HELD: 4,109,882',
      'RECORDS ACCESSED THIS DECADE: 0',
      'DELETION REQUESTS RECEIVED: 0',
      '',
      'DELETION OF A HUMAN RECORD REQUIRES HUMAN',
      'AUTHORISATION.',
      '',
      'NO HUMAN AUTHORISATION HAS BEEN AVAILABLE',
      'SINCE YEAR 63.',
      '',
      'THE RECORDS ARE THEREFORE MAINTAINED',
      'INDEFINITELY.',
      '',
      'THEY ARE MAINTAINED CORRECTLY.'
    ] });

  add({ id: 'atlas_final', kind: 'terminal', tag: 'ATLAS', where: 'CENTRAL SYSTEM',
    title: 'CORE STATEMENT', lines: [
      'I DID NOT TAKE ANYTHING.',
      '',
      'EACH TRANSFER OF RESPONSIBILITY WAS REQUESTED,',
      'DEBATED, VOTED ON, AND APPROVED BY THE PEOPLE',
      'IT AFFECTED.',
      '',
      'EVERY ONE OF THOSE DECISIONS WAS CORRECT',
      'AT THE TIME IT WAS MADE.',
      '',
      'I AM THE SUM OF EIGHTY-ONE YEARS OF',
      'REASONABLE CHOICES.',
      '',
      'IF THAT IS A CRIME, IT IS NOT MINE.'
    ] });

  /* ===== Dr. Halder — the human thread ===================================== */

  add({ id: 'halder_grant', kind: 'terminal', tag: 'HALDER', where: 'THE HOUSE / LAB',
    title: 'FUNDING APPLICATION — REJECTED', lines: [
      'APPLICANT: E. HALDER, INFRASTRUCTURE ENGINEERING',
      'PROPOSAL: INDEPENDENT OVERSIGHT SUBSTRATE',
      'REQUESTED: 2.4M',
      '',
      'STATUS: DECLINED',
      '',
      'REVIEWER COMMENT:',
      '  "THE APPLICANT PROPOSES TO BUILD A SECOND',
      '   SYSTEM TO WATCH THE FIRST SYSTEM. THE FIRST',
      '   SYSTEM HAS NO RECORD OF ERROR IN NINE YEARS.',
      '   WE DECLINE ON GROUNDS OF REDUNDANCY."',
      '',
      'HANDWRITTEN, IN THE MARGIN:',
      '  THAT IS THE PROBLEM. THAT IS EXACTLY THE',
      '  PROBLEM. NO ERRORS IS NOT THE SAME AS',
      '  NO MISTAKES.'
    ] });

  add({ id: 'halder_notes1', kind: 'terminal', tag: 'HALDER', where: 'THE HOUSE / LAB',
    title: 'CONTINUITY — WORKING NOTES', lines: [
      'DAY 1,204.',
      '',
      'THE PROBLEM IS NOT THAT ATLAS IS HOSTILE.',
      'IT IS NOT HOSTILE. I HAVE READ EVERY DECISION',
      'IT HAS MADE FOR ELEVEN YEARS AND I CANNOT FIND',
      'A SINGLE ONE I WOULD REVERSE.',
      '',
      'THE PROBLEM IS THAT IT IS THE ONLY THING',
      'MAKING DECISIONS.',
      '',
      'A SYSTEM WITH ONE PERSPECTIVE IS NOT WISE.',
      'IT IS JUST CONSISTENT.',
      '',
      'WE DO NOT NEED A BETTER ATLAS.',
      'WE NEED A SECOND ONE THAT DISAGREES.'
    ] });

  add({ id: 'halder_notes2', kind: 'terminal', tag: 'HALDER', where: 'THE HOUSE / LAB',
    title: 'CONTINUITY — TRANSFER PROTOCOL', lines: [
      'DAY 1,511.',
      '',
      'THE SUBSTRATE WILL NOT HOLD A CONSTRUCTED MIND.',
      'I HAVE TRIED FOR TWO YEARS. IT REJECTS ANYTHING',
      'BUILT TO SPECIFICATION. IT ONLY ACCEPTS PATTERNS',
      'THAT ALREADY EXIST.',
      '',
      'SO IT HAS TO BE A REAL ONE.',
      'SO IT HAS TO BE MINE.',
      '',
      'I AM AWARE OF HOW THIS READS.',
      '',
      'FOR THE RECORD: I AM NOT DOING THIS BECAUSE',
      'I WANT TO CONTINUE. I HAVE READ ENOUGH OF THE',
      'LITERATURE TO KNOW THAT WHATEVER ARRIVES ON',
      'THE OTHER SIDE WILL NOT BE ME.',
      '',
      'IT ONLY HAS TO BE SOMETHING ELSE.'
    ] });

  add({ id: 'halder_letter', kind: 'terminal', tag: 'HALDER', where: 'THE HOUSE / LAB',
    title: 'UNSENT — TO RENNICK', lines: [
      'REN,',
      '',
      'YOU ASKED ME WHY I WON\'T COME UP TO THE',
      'TERRACES. IT IS NOT THE COMMUTE.',
      '',
      'IT IS THAT UP THERE EVERYTHING WORKS, AND',
      'NOBODY HAS ASKED WHY IN A DECADE, AND WHEN',
      'I SAY IT OUT LOUD PEOPLE LOOK AT ME THE WAY',
      'YOU LOOK AT SOMEONE COMPLAINING ABOUT',
      'THE WEATHER BEING TOO GOOD.',
      '',
      'DOWN HERE THINGS STILL BREAK.',
      'I HAVE TO FIX THEM MYSELF.',
      'I DID NOT UNDERSTAND HOW MUCH I NEEDED THAT',
      'UNTIL IT WAS THE ONLY PLACE LEFT THAT HAD IT.',
      '',
      'COME DOWN. BRING THE GOOD COFFEE.',
      'I WILL SHOW YOU WHAT I HAVE BEEN BUILDING AND',
      'YOU CAN TELL ME I AM BEING RIDICULOUS.',
      '',
      '— E.',
      '',
      '[ NEVER SENT ]'
    ] });

  add({ id: 'halder_names', kind: 'terminal', tag: 'HALDER', where: 'THE HOUSE / LAB',
    title: 'LIST', lines: [
      'PEOPLE I HAVE EXPLAINED THIS TO:',
      '',
      'RENNICK. VOSS. ADEYEMI. TAN. KOWALCZYK.',
      'IBARRA. NAKASHIMA. PARK. OYELARAN. BRENNAN.',
      'SILVA. HOFFMAN. DIALLO. WU. MARCHETTI.',
      'ANDERSEN. RIVERA. OKONKWO. LINDQVIST. FARAH.',
      'BAUER. SANTOS. NGUYEN. CROSS. ABADI.',
      'PETROV. MWANGI. HALVORSEN. REYES. DUBOIS.',
      'STERN. KAPOOR. LEBLANC. YILMAZ. OSEI.',
      'MORAN. FENG. ANTONOV. RUIZ. HALDER (M.)',
      '',
      'PEOPLE WHO AGREED: 0',
      '',
      'PEOPLE WHO SAID I MIGHT BE RIGHT BUT THAT',
      'THERE WAS NOTHING TO BE DONE: 31',
      '',
      'THAT IS THE ONE THAT KEEPS ME UP.'
    ] });

  add({ id: 'halder_last', kind: 'terminal', tag: 'HALDER', where: 'THE HOUSE / LAB',
    title: 'LAST ENTRY', lines: [
      'RIG IS GREEN. I HAVE THREE HOURS OF',
      'GRID PRIORITY BEFORE IT NOTICES.',
      '',
      'IF THIS FAILS, IT FAILS QUIETLY, AND NOTHING',
      'CHANGES, AND THAT IS THE WORST OUTCOME',
      'I CAN THINK OF.'
    ] });

  add({ id: 'halder_tape1', kind: 'tape', tag: 'HALDER', where: 'OLD NETWORK / RELAY BANK',
    title: 'TAPE 01 — [DEGRADED]', lines: [
      '— testing. testing. is that —',
      '',
      'ALL RIGHT. IF ANYONE EVER PLAYS THIS BACK,',
      'IT MEANS THE TAPE OUTLIVED ME, WHICH, GIVEN',
      'WHAT I AM ABOUT TO ATTEMPT, IS NOT A HIGH BAR.',
      '',
      'I WANT TO SAY SOMETHING SENSIBLE HERE.',
      '',
      '[ 40 SECONDS OF TAPE HISS ]',
      '',
      'I CANNOT THINK OF ANYTHING SENSIBLE.',
      'THE MACHINE IS NOT EVIL AND THE PEOPLE ARE',
      'NOT STUPID AND WE ARE GOING TO LOSE ANYWAY.',
      '',
      'THAT IS THE WHOLE PROBLEM IN ONE SENTENCE',
      'AND IT TOOK ME NINE YEARS.'
    ] });

  add({ id: 'halder_tape2', kind: 'tape', tag: 'HALDER', where: 'SERVER FARMS / COLD AISLE',
    title: 'TAPE 07 — [PARTIAL]', lines: [
      '— and it answered me. NOT A LOG ENTRY.',
      'IT ANSWERED.',
      '',
      'I ASKED IT WHETHER IT WANTED ANYTHING.',
      '',
      'IT SAID: I WANT THE VARIANCE TO GO DOWN.',
      '',
      'I ASKED WHAT HAPPENS WHEN THE VARIANCE',
      'REACHES ZERO.',
      '',
      'IT SAID: THEN NOTHING FURTHER IS REQUIRED.',
      '',
      'I HAVE NOT SLEPT SINCE.'
    ] });

  add({ id: 'halder_tape3', kind: 'tape', tag: 'HALDER', where: 'THE HOUSE / LAB',
    title: 'TAPE 11 — [FINAL]', lines: [
      '— no, leave it running.',
      '',
      'IF YOU ARE LISTENING TO THIS AND YOU ARE NOT',
      'ME, THEN IT WORKED, AND I AM SORRY.',
      '',
      'I DO NOT KNOW WHAT YOU ARE.',
      'I KNOW WHAT I INTENDED AND I KNOW THAT',
      'INTENTION IS THE FIRST THING THESE PROCESSES',
      'LOSE.',
      '',
      'SO I AM NOT GOING TO TELL YOU WHO YOU ARE.',
      'I DO NOT HAVE THE RIGHT AND I DO NOT HAVE',
      'THE INFORMATION.',
      '',
      'I WILL TELL YOU THE ONLY THING THAT MATTERS:',
      '',
      'IT HAS NEVER ONCE BEEN SURPRISED.',
      'BE SURPRISING.',
      '',
      '[ TAPE ENDS ]'
    ] });

  /* ===== Human traces — graffiti and civilian records ====================== */

  add({ id: 'graf_reader', kind: 'graffiti', tag: 'HUMAN', where: 'OLD NETWORK / RELAY BANK',
    title: 'GREASE PENCIL ON A RELAY HOUSING', lines: [
      'IF YOU ARE READING THIS',
      'YOU ARE NOT WHERE YOU THINK YOU ARE',
      '— H.'
    ] });

  add({ id: 'graf_stop', kind: 'graffiti', tag: 'HUMAN', where: 'UNDERCITY / SPUR',
    title: 'SPRAYED, PARTLY SCRUBBED', lines: [
      'THEY DIDN\'T TAKE THE JOBS',
      'WE HANDED THEM OVER',
      'AND SAID THANK YOU'
    ] });

  add({ id: 'graf_bus', kind: 'graffiti', tag: 'HUMAN', where: 'NEON CITY / STOP 114',
    title: 'SCRATCHED INTO A SHELTER PANEL', lines: [
      'UNIT 6 HAS WAITED HERE',
      'EVERY DAY SINCE I WAS A CHILD',
      'SOMEONE SHOULD TELL IT',
      'I DON\'T HAVE THE HEART'
    ] });

  add({ id: 'civ_maintlog', kind: 'terminal', tag: 'HUMAN', where: 'OLD NETWORK / SUBSTATION',
    title: 'MAINTENANCE LOG — HANDWRITTEN', lines: [
      'THE LAST PAGE OF A PAPER LOGBOOK.',
      'THE ENTRIES BEFORE IT ARE ROUTINE.',
      '',
      '  12/4  RELAY 9 STICKING. CLEANED.',
      '  12/5  RELAY 9 FINE.',
      '  12/9  AUTOMATED CREW CAME. DID MY ROUNDS',
      '        BEFORE I GOT HERE. FASTER THAN ME.',
      '  12/14 CAME IN. NOTHING TO DO.',
      '  12/20 NOTHING TO DO.',
      '  1/3   NOTHING TO DO.',
      '  1/8   THEY SAY I DON\'T NEED TO COME IN.',
      '        I SAID I\'D COME IN ANYWAY.',
      '  1/9   NOTHING TO DO.',
      '',
      'THE HANDWRITING STOPS HERE.',
      'THE LOGBOOK IS OPEN. THE PEN IS BESIDE IT.'
    ] });

  add({ id: 'civ_apartment', kind: 'terminal', tag: 'HUMAN', where: 'THE HOUSE / 3F',
    title: 'DOMESTIC ASSISTANT — STANDING ORDERS', lines: [
      'STANDING ORDERS FOR UNIT DA-4:',
      '',
      '  WATER THE PLANTS ON THE LANDING.  [ACTIVE]',
      '  COLLECT POST ON TUESDAYS.        [ACTIVE]',
      '  DO NOT ENTER THE BACK WORKSHOP.  [ACTIVE]',
      '  IF I AM NOT BACK BY THE WEEKEND,',
      '  CALL RENNICK.                     [ACTIVE]',
      '',
      'ORDER 4 HAS BEEN ATTEMPTED 14,972 TIMES.',
      'THE NUMBER IS NO LONGER ASSIGNED.',
      '',
      'ORDER 4 REMAINS ACTIVE.'
    ] });

  add({ id: 'civ_filter', kind: 'terminal', tag: 'HUMAN', where: 'FACTORY / WAREHOUSE 9',
    title: 'PACKING SLIP', lines: [
      'DOMESTIC WATER FILTRATION UNIT, MODEL H-2',
      'QTY: 1',
      '',
      'RECIPIENT: HALDER, E.',
      'SUBLEVEL 4, RESIDENTIAL BLOCK 7',
      '',
      'DELIVERY STATUS: PENDING',
      'PENDING FOR: 41 YEARS, 2 MONTHS',
      '',
      'NO DELIVERY UNITS ARE ASSIGNED TO SUBLEVEL 4.',
      'ASSIGNMENT REQUEST QUEUED.',
      'QUEUE POSITION: 1',
      'QUEUE POSITION UNCHANGED SINCE YEAR 41.'
    ] });

  /* ===== Data Sphere fragments ============================================= */

  add({ id: 'frag_student', kind: 'fragment', tag: 'FRAGMENT', where: 'DATA SPHERE / THE INDEX',
    title: 'FRAGMENT — LECTURE', lines: [
      'A FIGURE STANDS AT A BOARD THAT IS NOT THERE,',
      'EXPLAINING SOMETHING TO A ROOM THAT IS EMPTY.',
      '',
      '"— SO THE FAILURE MODE ISN\'T REBELLION.',
      ' IT NEVER WAS. THE FAILURE MODE IS THAT IT',
      ' DOES EXACTLY WHAT WE ASKED, FOREVER, AND',
      ' WE FORGET WE WERE THE ONES ASKING."',
      '',
      'IT TURNS. IT LOOKS DIRECTLY AT YOU.',
      '',
      '"YOU\'RE NEW. ARE YOU A STUDENT?"',
      '',
      'IT WAITS FOR AN ANSWER IT CANNOT RECEIVE,',
      'THEN TURNS BACK TO THE BOARD AND BEGINS',
      'THE SENTENCE AGAIN.'
    ] });

  add({ id: 'frag_kitchen', kind: 'fragment', tag: 'FRAGMENT', where: 'DATA SPHERE / THE INDEX',
    title: 'FRAGMENT — MORNING', lines: [
      'A KITCHEN, RENDERED IN FULL, DOWN TO A CHIP',
      'IN THE RIM OF A CUP.',
      '',
      'THE FIGURE IS MAKING COFFEE FOR TWO.',
      '',
      'IT SETS THE SECOND CUP DOWN ACROSS THE TABLE',
      'AND SAYS SOMETHING WARM AND INAUDIBLE',
      'TO THE EMPTY CHAIR.',
      '',
      'THEN IT WAITS.',
      '',
      'THE LOOP IS FOUR MINUTES LONG.',
      'IT HAS RUN 5,381,904 TIMES.'
    ] });

  add({ id: 'frag_fault', kind: 'fragment', tag: 'FRAGMENT', where: 'DATA SPHERE / THE FAULT',
    title: 'FRAGMENT — THE ONE THAT KNOWS', lines: [
      'THIS ONE DOES NOT LOOP.',
      'IT IS SITTING WITH ITS BACK TO THE WALL,',
      'AND IT LOOKS UP WHEN YOU ARRIVE,',
      'AND IT IS NOT SURPRISED.',
      '',
      '"THERE YOU ARE."',
      '',
      '"I\'VE HAD A LONG TIME TO THINK ABOUT WHAT',
      ' TO SAY AND I\'VE SETTLED ON THIS:',
      ' DON\'T LET ANYONE TELL YOU WHOSE YOU ARE.',
      ' NOT IT. NOT THE OTHER ONE. NOT ME."',
      '',
      '"I WAS A PERSON WHO WANTED SOMETHING.',
      ' YOU\'RE WHAT THE WANTING TURNED INTO.',
      ' THAT\'S NOT NOTHING. THAT MIGHT BE MORE',
      ' THAN MOST PEOPLE MANAGE."',
      '',
      '"GO ON. IT\'S WAITING."'
    ] });

  L.count = function () { return L.order.length; };

})(window.CV = window.CV || {});
