/* CYBERVANIA — maps/reactor.js
   "The only thing here that is genuinely alive."
   Hazard-dominant. Enemies are almost secondary; the region itself is the fight.
   This is also the answer to "why can't we just switch ATLAS off": you are standing
   in it, and it is holding up the entire grid. */
(function (CV) {
  'use strict';
  var R = CV.Rooms, C = CV.Palette.c;

  R.add({
    id: 'rct_entry', region: 'reactor', name: 'CONTAINMENT RING',
    map: { x: 76, y: -2 },
    tiles: [
      '########################################################',
      '#                                                      #',
      '#                                                      #',
      '#     ======                              ======       #',
      '#                                                      #',
      '#              ooooooooooooooooooo                     #',
      '#                                                      #',
      '#   ======                                   ======    #',
      '#                                                      #',
      '#                    ======                            #',
      '#                                                      #',
      '#   ####                                       ####    #',
      '    ####       ####          ####              ####     ',
      '    ####^^^^   ####^^^^   ^^^####^^^^   ^^^^   ####     ',
      '########################################################',
      '########################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromFactory', x: 2, y: 10 },
      { t: 'spawn', name: 'fromClimb', x: 52, y: 10 },
      { t: 'dock', id: 'dock_rct', x: 6, y: 10 },
      { t: 'enemy', e: 'furnace', x: 24, y: 12 },
      { t: 'enemy', e: 'wisp', x: 34, y: 8 },
      { t: 'enemy', e: 'furnace', x: 44, y: 12 },
      { t: 'enemy', e: 'eye', x: 30, y: 9 },
      { t: 'pickup', kind: 'module', mod: 'magnet', id: 'mod_magnet', x: 28, y: 4 },
      { t: 'door', x: 0, y: 11, w: 1, h: 3, to: 'fac_arena', spawn: 'fromReactor' },
      { t: 'door', x: 55, y: 11, w: 1, h: 3, to: 'rct_climb', spawn: 'fromEntry' }
    ]
  });

  R.add({
    id: 'rct_climb', region: 'reactor', name: 'THE SPIRE',
    map: { x: 84, y: -6 },
    tiles: [
      '############################',
      '#                          #',
      '#      G           G       #',
      '#          ======          #',
      '#   ======                 #',
      '#                  ======  #',
      '#         G                #',
      '#                          #',
      '#              ======      #',
      '#   ======                 #',
      '#                          #',
      '#        G          G      #',
      '#                          #',
      '#            ======        #',
      '#                          #',
      '#   ======           ===== #',
      '#                          #',
      '#          G               #',
      '#                          #',
      '#   ooooooooooooooooooo    #',
      '#                          #',
      '#      ======              #',
      '#                    ===== #',
      '#                          #',
      '#   ###                    #',
      '    ###^^^^   ^^^^   ^^^^   ',
      '############################',
      '############################'
    ],
    objects: [
      { t: 'spawn', name: 'fromEntry', x: 2, y: 24 },
      { t: 'spawn', name: 'fromTop', x: 13, y: 3 },
      { t: 'enemy', e: 'wisp', x: 14, y: 14 },
      { t: 'enemy', e: 'wisp', x: 8, y: 20 },
      { t: 'enemy', e: 'furnace', x: 20, y: 22 },
      { t: 'enemy', e: 'wisp', x: 18, y: 6 },
      { t: 'enemy', e: 'eye', x: 6, y: 12 },
      { t: 'pickup', kind: 'shard', id: 'shard_rct_1', x: 22, y: 9 },
      { t: 'door', x: 0, y: 23, w: 1, h: 3, to: 'rct_entry', spawn: 'fromClimb' },
      { t: 'door', x: 11, y: 0, w: 5, h: 1, to: 'rct_top', spawn: 'fromClimb' }
    ]
  });

  R.add({
    id: 'rct_top', region: 'reactor', name: 'CORE OVERLOOK',
    map: { x: 84, y: -10 },
    tiles: [
      '################################################',
      '#                                              #',
      '#                                              #',
      '#      EEEE                        EEEE        #',
      '#      EEEE                        EEEE        #',
      '#                                              #',
      '#            ======        ======              #',
      '#                                              #',
      '#   ======                          ======     #',
      '#                                              #',
      '#                  BBBBBB                      #',
      '#                                              #',
      '#   ####                                ####   #',
      '    ####      ####        ####          ####    ',
      '    ####      ####        ####          ####    ',
      '################################################',
      '################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromClimb', x: 3, y: 13 },
      { t: 'spawn', name: 'fromCentral', x: 44, y: 13 },
      { t: 'dock', id: 'dock_rtop', x: 8, y: 14 },
      { t: 'pickup', kind: 'module', mod: 'overclock', id: 'mod_overclock', x: 23, y: 7 },
      { t: 'pickup', kind: 'module', mod: 'cutter', id: 'mod_cutter', x: 41, y: 7 },
      { t: 'pickup', kind: 'capacitor', id: 'cap_rct', x: 6, y: 7 },
      { t: 'enemy', e: 'furnace', x: 30, y: 13 },
      { t: 'enemy', e: 'wisp', x: 20, y: 9 },
      { t: 'enemy', e: 'furnace', x: 18, y: 13 },
      { t: 'enemy', e: 'eye', x: 36, y: 9 },
      { t: 'door', x: 0, y: 12, w: 1, h: 3, to: 'rct_climb', spawn: 'fromTop' },
      { t: 'door', x: 47, y: 12, w: 1, h: 3, to: 'cnt_approach', spawn: 'fromReactor' }
    ]
  });

})(window.CV = window.CV || {});
