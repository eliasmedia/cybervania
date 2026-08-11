/* CYBERVANIA — maps/factory.js
   "Order fulfilment: nominal."
   A plant producing consumer goods for a market with no consumers. Conveyors alter
   your ground velocity; the warehouse holds 61 years of a product nobody collected.
   Home of Seismic Slam, and therefore of the game's big retroactive unlock. */
(function (CV) {
  'use strict';
  var R = CV.Rooms, C = CV.Palette.c;

  R.add({
    id: 'fac_entry', region: 'factory', name: 'GOODS INWARD',
    map: { x: 44, y: -1 },
    tiles: [
      '################################################################',
      '#                                                              #',
      '#    ------                                  ------            #',
      '#    ------                                  ------            #',
      '#                                                              #',
      '#            ======                                            #',
      '#                              ======                          #',
      '#                                            ======            #',
      '#    ======                                                    #',
      '#                                                              #',
      '#                     ======                                   #',
      '#                                                              #',
      '#   ####                                              ####     #',
      '    ####            ####              ####            ####      ',
      '    ####CCCCCCCCCCCC####CCCCCCCCCCCCCC####CCCCCCCCCCCC####      ',
      '################################################################',
      '################################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromOld', x: 2, y: 11 },
      { t: 'spawn', name: 'fromLine', x: 61, y: 11 },
      { t: 'dock', id: 'dock_fac', x: 6, y: 11 },
      { t: 'sign', label: 'LINE 4', x: 30, y: 3, w: 6, h: 2, color: C.amber },
      { t: 'enemy', e: 'welder', x: 24, y: 13 },
      { t: 'enemy', e: 'hauler', x: 44, y: 13 },
      { t: 'enemy', e: 'assembler', x: 34, y: 13 },
      { t: 'enemy', e: 'welder', x: 52, y: 13 },
      { t: 'enemy', e: 'eye', x: 34, y: 8 },
      { t: 'door', x: 0, y: 12, w: 1, h: 3, to: 'old_arena', spawn: 'fromFactory' },
      { t: 'door', x: 63, y: 12, w: 1, h: 3, to: 'fac_line', spawn: 'fromEntry' }
    ]
  });

  R.add({
    id: 'fac_line', region: 'factory', name: 'ASSEMBLY LINE 4',
    map: { x: 52, y: -1 },
    tiles: [
      '#############################    #######################################',
      '#                                                                      #',
      '#                           ======                                     #',
      '#      vvvv          vvvv          vvvv          vvvv                  #',
      '#                   ======    ======                                   #',
      '#                                                                      #',
      '#            =====        =====        =====        =====              #',
      '#      =====        =====        =====        =====                    #',
      '#                                                                      #',
      '#   =====                                                      =====   #',
      '#          =====        =====        =====        =====                #',
      '#                                                                      #',
      '#  ####                                                        ####    #',
      '   ####     BBBB      ####      BBBB      ####      BBBB       ####     ',
      '   ####cccccBBBBccccccc####cccccBBBBccccccc####cccccBBBBcccccccc####    ',
      '########################################################################',
      '########################################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromEntry', x: 2, y: 11 },
      { t: 'spawn', name: 'fromWare', x: 69, y: 11 },
      { t: 'spawn', name: 'fromSlam', x: 36, y: 11 },
      { t: 'enemy', e: 'assembler', x: 20, y: 12 },
      { t: 'enemy', e: 'welder', x: 40, y: 13 },
      { t: 'enemy', e: 'welder', x: 56, y: 13 },
      { t: 'enemy', e: 'hauler', x: 30, y: 13 },
      { t: 'enemy', e: 'eye', x: 48, y: 9 },
      { t: 'enemy', e: 'assembler', x: 62, y: 13 },
      { t: 'terminal', lore: 'atlas_efficiency', x: 14, y: 11 },
      { t: 'door', x: 29, y: 0, w: 4, h: 1, to: 'fac_slam', spawn: 'fromLine' },
      { t: 'door', x: 0, y: 12, w: 1, h: 3, to: 'fac_entry', spawn: 'fromLine' },
      { t: 'door', x: 71, y: 12, w: 1, h: 3, to: 'fac_ware', spawn: 'fromLine' }
    ]
  });

  /* Warehouse 9. Two hundred million water filters, stacked to the ceiling. */
  R.add({
    id: 'fac_ware', region: 'factory', name: 'WAREHOUSE 9',
    map: { x: 61, y: -2 },
    tiles: [
      '##################################################',
      '#                                                #',
      '#                                                #',
      '#   ####    ####    ####    ####    ####         #',
      '#   ####    ####    ####    ####    ####         #',
      '#                                                #',
      '#   ####    ####    ####    ####    ####         #',
      '#   ####    ####    ####    ####    ####         #',
      '#                                                #',
      '#   ####    ####    ####    ####    ####         #',
      '#   ####    ####    ####    ####    ####         #',
      '#                                                #',
      '#   ####    ####    ####    ####    ####    BBBB #',
      '#   ####    ####    ####    ####    ####    BBBB #',
      '                                            BBBB #',
      '                                            BBBB  ',
      '##################################################',
      '##################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromLine', x: 2, y: 15 },
      { t: 'spawn', name: 'fromArena', x: 48, y: 15 },
      { t: 'terminal', lore: 'civ_filter', x: 40, y: 15 },
      { t: 'prop', kind: 'crate', x: 37, y: 15 },
      { t: 'enemy', e: 'assembler', x: 22, y: 15 },
      { t: 'enemy', e: 'hauler', x: 34, y: 15 },
      { t: 'enemy', e: 'welder', x: 14, y: 15 },
      { t: 'enemy', e: 'eye', x: 28, y: 11 },
      { t: 'pickup', kind: 'shard', id: 'shard_fac_1', x: 46, y: 11 },
      { t: 'pickup', kind: 'module', mod: 'extract', id: 'mod_extract', x: 8, y: 11 },
      { t: 'door', x: 0, y: 14, w: 1, h: 3, to: 'fac_line', spawn: 'fromWare' },
      { t: 'door', x: 49, y: 14, w: 1, h: 2, to: 'fac_arena', spawn: 'fromWare' }
    ]
  });

  /* Seismic Slam. Deliberately placed *before* the boss so the arena can use it. */
  R.add({
    id: 'fac_slam', region: 'factory', name: 'PRESS HOUSE',
    map: { x: 52, y: -4 },
    tiles: [
      '########################################',
      '#                                      #',
      '#   vvvv      vvvv      vvvv           #',
      '#                                      #',
      '#                                      #',
      '#        =====       =====             #',
      '#                                      #',
      '#                             ====     #',
      '#   =====                              #',
      '#                                      #',
      '#            BBBBBBBBBBBB              #',
      '#            BBBBBBBBBBBB              #',
      '#   ####     BBBBBBBBBBBB      ####    #',
      '    ####     BBBBBBBBBBBB      ####     ',
      '    ####     ############      ####     ',
      '########################################',
      '########################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromLine', x: 2, y: 12 },
      { t: 'pickup', kind: 'module', mod: 'slam', id: 'mod_slam', x: 12, y: 9 },
      { t: 'pickup', kind: 'augment', aug: 'siphon', id: 'aug_siphon', x: 10, y: 13 },
      { t: 'enemy', e: 'hauler', x: 26, y: 8 },
      { t: 'enemy', e: 'welder', x: 28, y: 13 },
      { t: 'door', x: 0, y: 12, w: 1, h: 3, to: 'fac_line', spawn: 'fromSlam' }
    ]
  });

  /* ASSEMBLY PRIME — you fight the production line by riding it. */
  R.add({
    id: 'fac_arena', region: 'factory', name: 'FINAL ASSEMBLY', music: 'boss',
    map: { x: 68, y: -2 },
    tiles: [
      '############################################',
      '#                                          #',
      '#                                          #',
      '#                                          #',
      '#     ======                  ======       #',
      '#                                          #',
      '#                                          #',
      '#                                          #',
      '#            ==================            #',
      '#                                          #',
      '#                                          #',
      '#                                          #',
      '#                                          #',
      '#                                          #',
      '#CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC#',
      '############################################',
      '############################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromWare', x: 3, y: 13 },
      { t: 'spawn', name: 'fromReactor', x: 39, y: 13 },
      { t: 'boss', boss: 'assembly', x: 22, y: 12 },
      { t: 'pickup', kind: 'frame', frame: 'arc', id: 'frame_arc', x: 22, y: 12,
        gate: 'boss:assembly' },
      { t: 'door', x: 0, y: 12, w: 1, h: 3, to: 'fac_ware', spawn: 'fromArena' },
      { t: 'door', x: 43, y: 12, w: 1, h: 3, to: 'rct_entry', spawn: 'fromFactory' }
    ]
  });

})(window.CV = window.CV || {});
