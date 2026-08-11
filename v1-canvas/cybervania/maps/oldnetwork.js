/* CYBERVANIA — maps/oldnetwork.js
   "The first city's nervous system."
   Buried infrastructure ATLAS never decommissioned because decommissioning costs more
   than leaving it on. Vertical, grapple-shaped, and where the first human handwriting
   in the game survives. */
(function (CV) {
  'use strict';
  var R = CV.Rooms;

  R.add({
    id: 'old_entry', region: 'oldnetwork', name: 'SUBSTATION 7',
    map: { x: 24, y: 1 },
    tiles: [
      '######################################################',
      '#                                                    #',
      '#      -----                            -----        #',
      '#      -----                            -----        #',
      '#                                                    #',
      '#            =======                                 #',
      '#                              =======               #',
      '#   =====                                            #',
      '#                    ======                          #',
      '#                                        =====       #',
      '#                                                    #',
      '#      ####                                          #',
      '#      ####            ####                   ####   #',
      '       ####            ####                   ####    ',
      '       ####~~~~~~~~~~~~####~~~~~~~~~~~~~~~~~~~####    ',
      '######################################################',
      '######################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromNeon', x: 2, y: 10 },
      { t: 'spawn', name: 'fromRelay', x: 51, y: 10 },
      { t: 'dock', id: 'dock_old', x: 8, y: 10 },
      { t: 'terminal', lore: 'civ_maintlog', x: 37, y: 5 },
      { t: 'enemy', e: 'wasp', x: 26, y: 7 },
      { t: 'enemy', e: 'crawler', x: 47, y: 11 },
      { t: 'enemy', e: 'splicer', x: 34, y: 9 },
      { t: 'enemy', e: 'wasp', x: 44, y: 6 },
      { t: 'door', x: 0, y: 12, w: 1, h: 3, to: 'neon_arena', spawn: 'fromOld' },
      { t: 'door', x: 53, y: 12, w: 1, h: 3, to: 'old_relay', spawn: 'fromEntry' }
    ]
  });

  R.add({
    id: 'old_relay', region: 'oldnetwork', name: 'RELAY BANK 7',
    map: { x: 30, y: 1 },
    tiles: [
      '########################################################',
      '#                                                      #',
      '#   ----  ----  ----  ----  ----  ----  ----  ----     #',
      '#   ----  ----  ----  ----  ----  ----  ----  ----     #',
      '#   ----  ----  ----  ----  ----  ----  ----  ----     #',
      '#                                                      #',
      '#                                                      #',
      '#        ======              ======                    #',
      '#                                                      #',
      '#                   ======              ======         #',
      '#   ======                                             #',
      '#                                                      #',
      '#                                            ####      #',
      '#   ####          ####                       ####      ',
      '    ####          ####          ####         ####      ',
      '    ####^^^^   ^^^####^^^^   ^^^####^^^^   ^^####      ',
      '########################################################',
      '########################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromEntry', x: 2, y: 11 },
      { t: 'spawn', name: 'fromShaft', x: 52, y: 11 },
      { t: 'graffiti', lore: 'graf_reader', x: 26, y: 4 },
      { t: 'terminal', lore: 'halder_tape1', x: 46, y: 11 },
      { t: 'enemy', e: 'splicer', x: 20, y: 11 },
      { t: 'enemy', e: 'wasp', x: 34, y: 8 },
      { t: 'enemy', e: 'eye', x: 40, y: 12 },
      { t: 'enemy', e: 'wasp', x: 14, y: 7 },
      { t: 'enemy', e: 'splicer', x: 44, y: 9 },
      { t: 'pickup', kind: 'shard', id: 'shard_old_1', x: 6, y: 9 },
      { t: 'door', x: 0, y: 12, w: 1, h: 3, to: 'old_entry', spawn: 'fromRelay' },
      { t: 'door', x: 55, y: 12, w: 1, h: 3, to: 'old_shaft', spawn: 'fromRelay' }
    ]
  });

  /* Anchor-dense vertical shaft. Reachable without grapple, trivial with it —
     which is exactly the feeling a good module unlock should produce. */
  R.add({
    id: 'old_shaft', region: 'oldnetwork', name: 'CABLE RISER',
    map: { x: 36, y: 0 },
    tiles: [
      '########################',
      '#                      #',
      '#         G            #',
      '#        =====         #',
      '#                 ==== #',
      '#   G                  #',
      '#                      #',
      '#              G       #',
      '#  ====                #',
      '#                      #',
      '#         G            #',
      '#                      #',
      '#                ====  #',
      '#      G               #',
      '#                      #',
      '#             G        #',
      '#   ====               #',
      '#                      #',
      '#          G           #',
      '#                      #',
      '#                 ==== #',
      '#     G                #',
      '#                      #',
      '#  ###                 #',
      '   ###         ###      ',
      '   ###^^^^   ^^###      ',
      '########################',
      '########################'
    ],
    objects: [
      { t: 'spawn', name: 'fromRelay', x: 2, y: 24 },
      { t: 'spawn', name: 'fromDeep', x: 20, y: 24 },
      { t: 'spawn', name: 'fromArena', x: 11, y: 3 },
      { t: 'enemy', e: 'wasp', x: 12, y: 8 },
      { t: 'enemy', e: 'wasp', x: 8, y: 18 },
      { t: 'enemy', e: 'splicer', x: 17, y: 21 },
      { t: 'enemy', e: 'wasp', x: 13, y: 13 },
      { t: 'enemy', e: 'eye', x: 5, y: 11 },
      { t: 'pickup', kind: 'capacitor', id: 'cap_old', x: 19, y: 19 },
      { t: 'door', x: 0, y: 23, w: 1, h: 3, to: 'old_relay', spawn: 'fromShaft' },
      { t: 'door', x: 23, y: 23, w: 1, h: 3, to: 'old_deep', spawn: 'fromShaft' },
      { t: 'door', x: 9, y: 0, w: 5, h: 1, to: 'old_arena', spawn: 'fromShaft' }
    ]
  });

  R.add({
    id: 'old_deep', region: 'oldnetwork', name: 'TAPE VAULT',
    map: { x: 42, y: 2 },
    tiles: [
      '################################################',
      '#                                              #',
      '#   ----------            ----------           #',
      '#   ----------            ----------           #',
      '#                                              #',
      '#          G                        G          #',
      '#                                              #',
      '#     ======                  ======           #',
      '#                                              #',
      '#                 ======                       #',
      '#                                              #',
      '#                                       BBBB   #',
      '#   ####                                BBBB   #',
      '    ####          ####          ####    BBBB   #',
      '    ####^^^^   ^^^####^^^^   ^^^####^^^^BBBB   #',
      '################################################',
      '################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromShaft', x: 2, y: 11 },
      { t: 'pickup', kind: 'module', mod: 'grapple', id: 'mod_grapple', x: 24, y: 7 },
      { t: 'pickup', kind: 'augment', aug: 'anchor', id: 'aug_anchor', x: 40, y: 10 },
      { t: 'enemy', e: 'splicer', x: 16, y: 11 },
      { t: 'enemy', e: 'wasp', x: 32, y: 6 },
      { t: 'enemy', e: 'splicer', x: 40, y: 8 },
      { t: 'enemy', e: 'wasp', x: 22, y: 5 },
      { t: 'door', x: 0, y: 12, w: 1, h: 3, to: 'old_shaft', spawn: 'fromDeep' }
    ]
  });

  /* THE COMPILER — it does not attack you. It builds the arena around you. */
  R.add({
    id: 'old_arena', region: 'oldnetwork', name: 'BUILD VOLUME', music: 'boss',
    onEnter: 'compiler_pre', map: { x: 36, y: -1 },
    tiles: [
      '##########################################',
      '#                                        #',
      '#                                        #',
      '#                                        #',
      '#                                        #',
      '#      =====                  =====      #',
      '#                                        #',
      '#                                        #',
      '#                                        #',
      '#                                        #',
      '#             ==============             #',
      '#                                        #',
      '#                                        #',
      '#                                        #',
      '#                                        #',
      '#                                        #',
      '##########################################',
      '##########################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromShaft', x: 5, y: 15 },
      { t: 'spawn', name: 'fromFactory', x: 36, y: 15 },
      { t: 'boss', boss: 'compiler', x: 20, y: 8 },
      { t: 'pickup', kind: 'frame', frame: 'bulwark', id: 'frame_bulwark', x: 20, y: 14,
        gate: 'boss:compiler' },
      { t: 'door', x: 3, y: 16, w: 5, h: 1, to: 'old_shaft', spawn: 'fromArena' },
      { t: 'door', x: 41, y: 13, w: 1, h: 3, to: 'fac_entry', spawn: 'fromOld' }
    ]
  });

})(window.CV = window.CV || {});
