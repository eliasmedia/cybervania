/* CYBERVANIA — maps/central.js
   "Nothing here was built for a body."
   ATLAS's own architecture. Environmental storytelling stops here — there is nothing
   human left to tell a story with, and that absence is the point. No docks past the
   entrance. Both layers are active simultaneously. */
(function (CV) {
  'use strict';
  var R = CV.Rooms;

  R.add({
    id: 'cnt_approach', region: 'central', name: 'ADDRESS',
    map: { x: 92, y: -10 },
    tiles: [
      '################################################################',
      '#                                                              #',
      '#                                                              #',
      '#     dddd        dddd        dddd        dddd                 #',
      '#                                                              #',
      '#                                                              #',
      '#           ppppp        ppppp        ppppp                    #',
      '#                                                              #',
      '#   ======                                        ======       #',
      '#                                                              #',
      '#                 dddddddd        dddddddd                     #',
      '#                                                              #',
      '#                                                              #',
      '#   ####                                            ####       ',
      '    ####                                            ####       ',
      '####################        ####        ####################   ',
      '################################################################',
      '################################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromReactor', x: 2, y: 12 },
      { t: 'spawn', name: 'fromCore', x: 60, y: 12 },
      { t: 'dock', id: 'dock_cnt', x: 6, y: 12 },
      { t: 'terminal', lore: 'atlas_final', x: 32, y: 14 },
      { t: 'enemy', e: 'nullifier', x: 26, y: 14 },
      { t: 'enemy', e: 'turret', x: 44, y: 14 },
      { t: 'enemy', e: 'glitch', x: 36, y: 8 },
      { t: 'enemy', e: 'turret', x: 20, y: 14 },
      { t: 'enemy', e: 'glitch', x: 52, y: 9 },
      { t: 'door', x: 0, y: 12, w: 1, h: 3, to: 'rct_top', spawn: 'fromCentral' },
      { t: 'door', x: 63, y: 12, w: 1, h: 3, to: 'cnt_fault', spawn: 'fromApproach' }
    ]
  });

  /* THE FAULT — the corrupted region around the failed upload, and the only place
     ATLAS cannot see into. Optional. Contains NULL and the fragment that knows. */
  R.add({
    id: 'cnt_fault', region: 'central', name: 'THE FAULT',
    map: { x: 100, y: -10 },
    tiles: [
      '################################################',
      '#                                              #',
      '#   dddd                              dddd     #',
      '#                                              #',
      '#          DDDD              DDDD              #',
      '#          DDDD              DDDD              #',
      '#                                              #',
      '#     ======                        ======     #',
      '#                                              #',
      '#                 dddddddddd                   #',
      '#                                              #',
      '#                                              #',
      '#   ####                                ####   #',
      '    ####                                ####    ',
      '    ####                                ####    ',
      '################################################',
      '################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromApproach', x: 2, y: 12 },
      { t: 'spawn', name: 'fromCore', x: 44, y: 12 },
      { t: 'boss', boss: 'nullboss', x: 24, y: 12 },
      { t: 'pickup', kind: 'fragment', lore: 'frag_fault', id: 'frag_fault',
        x: 24, y: 10, gate: 'boss:nullboss' },
      { t: 'enemy', e: 'glitch', x: 14, y: 11 },
      { t: 'enemy', e: 'glitch', x: 36, y: 11 },
      { t: 'enemy', e: 'glitch', x: 24, y: 6 },
      { t: 'enemy', e: 'daemon', x: 30, y: 9 },
      { t: 'door', x: 0, y: 12, w: 1, h: 3, to: 'cnt_approach', spawn: 'fromCore' },
      { t: 'door', x: 47, y: 12, w: 1, h: 3, to: 'cnt_core', spawn: 'fromFault' }
    ]
  });

  /* ATLAS. Three phases; the last one is a conversation you have to survive. */
  R.add({
    id: 'cnt_core', region: 'central', name: 'CORE', music: 'atlas',
    map: { x: 108, y: -10 },
    tiles: [
      '##############################################',
      '#                                            #',
      '#                                            #',
      '#                                            #',
      '#      ======                  ======        #',
      '#                                            #',
      '#                                            #',
      '#                                            #',
      '#              ==================            #',
      '#                                            #',
      '#                                            #',
      '#                                            #',
      '#      ======                  ======        #',
      '#                                            #',
      '#                                            #',
      '#                                            #',
      '##############################################',
      '##############################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromFault', x: 3, y: 15 },
      { t: 'boss', boss: 'atlas', x: 23, y: 8 },
      { t: 'trigger', id: 'cnt_ending', x: 20, y: 12, w: 6, h: 4,
        gate: 'boss:atlas', flag: 'at_ending' },
      { t: 'door', x: 0, y: 13, w: 1, h: 3, to: 'cnt_fault', spawn: 'fromCore' }
    ]
  });

})(window.CV = window.CV || {});
