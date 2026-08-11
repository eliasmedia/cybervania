/* CYBERVANIA — maps/neoncity.js
   "The signs are still paid for."
   Street level. Permanent rain, deep parallax, a tram that runs on time for nobody.
   The region's job is scale: this is the first time the camera has room to breathe. */
(function (CV) {
  'use strict';
  var R = CV.Rooms, C = CV.Palette.c;

  /* --- STREET — the postcard, and the hub ---------------------------------- */
  R.add({
    id: 'neon_street', region: 'neoncity', name: 'SECTOR 9 — STREET LEVEL',
    onEnter: 'surface', map: { x: 4, y: 0 },
    tiles: [
      '################################################################################',
      '#                                                                              #',
      '#                                                                              #',
      '#        ======                                    ======                      #',
      '#                                                                              #',
      '#                          ======                                              #',
      '#                                              ======                          #',
      '#   ======                                                        ======       #',
      '#                                                                              #',
      '#                 ======                                                       #',
      '#                                        ======                                #',
      '#                                                                              #',
      '#                                                                              #',
      '#                                                                              #',
      '     ####                          ####                       ####             ',
      '     ####                          ####                       ####             ',
      '     ####            ####          ####          ####         ####             ',
      '################################################################################',
      '################################################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromHouse', x: 6, y: 13 },
      { t: 'spawn', name: 'fromPlaza', x: 76, y: 13 },
      { t: 'spawn', name: 'fromStop', x: 40, y: 13 },
      { t: 'sign', label: 'KIRIN', x: 14, y: 4, w: 5, h: 2, color: C.magenta },
      { t: 'sign', label: 'OPEN', x: 30, y: 3, w: 4, h: 2, color: C.cyan },
      { t: 'sign', label: '24H', x: 52, y: 5, w: 3, h: 2, color: '#ffcc44' },
      { t: 'sign', label: 'VERTEX', x: 64, y: 2, w: 6, h: 2, color: C.magenta },
      { t: 'prop', kind: 'vending', x: 22, y: 15 },
      { t: 'prop', kind: 'vending', x: 58, y: 16 },
      { t: 'enemy', e: 'enforcer', x: 34, y: 16 },
      { t: 'enemy', e: 'drone', x: 62, y: 8 },
      { t: 'enemy', e: 'enforcer', x: 68, y: 16 },
      { t: 'enemy', e: 'crawler', x: 44, y: 13 },
      { t: 'enemy', e: 'drone', x: 48, y: 9 },
      { t: 'enemy', e: 'eye', x: 60, y: 13 },
      { t: 'terminal', lore: 'atlas_census', x: 44, y: 16 },
      { t: 'tram', id: 'tram_neon', name: 'NEON CITY', x: 12, y: 16 },
      { t: 'door', x: 9, y: 15, w: 4, h: 2, to: 'house_stair', spawn: 'fromRoof' },
      { t: 'door', x: 79, y: 14, w: 1, h: 3, to: 'neon_plaza', spawn: 'fromStreet' },
      { t: 'door', x: 0, y: 14, w: 1, h: 3, to: 'neon_stop', spawn: 'fromStreet' }
    ]
  });

  /* --- STOP 114 — Unit 6 is still waiting --------------------------------- */
  R.add({
    id: 'neon_stop', region: 'neoncity', name: 'STOP 114',
    map: { x: 2, y: 0 },
    tiles: [
      '################################################',
      '#                                              #',
      '#                                              #',
      '#     ==========                               #',
      '#                                              #',
      '#                       =====                  #',
      '#                                              #',
      '#                                   =======    #',
      '#                                              #',
      '#          ======                              #',
      '#                                              #',
      '#                                              #',
      '#                                              #',
      '#                                              #',
      '#            ####                              ',
      '#            ####                              ',
      '#            ####               ####           ',
      '################################################',
      '################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromStreet', x: 44, y: 13 },
      { t: 'prop', kind: 'busbot', x: 8, y: 16 },
      { t: 'graffiti', lore: 'graf_bus', x: 5, y: 15 },
      { t: 'terminal', lore: 'atlas_transit', x: 20, y: 16 },
      { t: 'enemy', e: 'drone', x: 30, y: 8 },
      { t: 'enemy', e: 'drone', x: 34, y: 10 },
      { t: 'enemy', e: 'enforcer', x: 26, y: 16 },
      { t: 'enemy', e: 'eye', x: 40, y: 9 },
      { t: 'pickup', kind: 'shard', id: 'shard_neon_1', x: 11, y: 9 },
      { t: 'pickup', kind: 'module', mod: 'drone', id: 'mod_drone', x: 37, y: 11 },
      { t: 'door', x: 47, y: 14, w: 1, h: 3, to: 'neon_street', spawn: 'fromStop' }
    ]
  });

  /* --- PLAZA — the first Dive Port ---------------------------------------- */
  R.add({
    id: 'neon_plaza', region: 'neoncity', name: 'CIVIC PLAZA',
    map: { x: 9, y: 0 },
    tiles: [
      '################################################################',
      '#                                                              #',
      '#                                                              #',
      '#      =======                                    =======      #',
      '#                                                              #',
      '#                   ========        ========                   #',
      '#                                                              #',
      '#   ======                                            ======   #',
      '#                                                              #',
      '#               =======                  =======               #',
      '#                                                              #',
      '#                                                              #',
      '#                                                              #',
      '#       ====          ====          ====            ====       #',
      '#                                                              #',
      '            ###           ###               ###                 ',
      '            ###           ###               ###                 ',
      '#    ^^^^        ^^^^              ^^^^         ^^^^           #',
      '###############################  ###############################',
      '###############################  ###############################'
    ],
    objects: [
      { t: 'spawn', name: 'fromStreet', x: 2, y: 16 },
      { t: 'spawn', name: 'fromRoofs', x: 61, y: 16 },
      { t: 'spawn', name: 'fromArena', x: 40, y: 16 },
      { t: 'spawn', name: 'fromUnder', x: 40, y: 16 },
      /* The plaza's dive port sits on a raised deck: you can see it from the street
         long before you work out how to climb to it. */
      { t: 'divePort', id: 'port_neon', x: 23, y: 12 },
      { t: 'pickup', kind: 'module', mod: 'datashift', id: 'mod_datashift', x: 38, y: 12 },
      { t: 'trigger', id: 'neon_dive_hint', x: 20, y: 12, w: 8, h: 5, script: 'first_dive',
        flag: 'saw_port' },
      { t: 'sign', label: 'PLAZA', x: 30, y: 3, w: 5, h: 2, color: C.cyan },
      { t: 'enemy', e: 'enforcer', x: 10, y: 17 },
      { t: 'enemy', e: 'enforcer', x: 55, y: 17 },
      { t: 'enemy', e: 'eye', x: 32, y: 10 },
      { t: 'enemy', e: 'drone', x: 26, y: 7 },
      { t: 'enemy', e: 'drone', x: 40, y: 8 },
      { t: 'enemy', e: 'crawler', x: 27, y: 14 },
      { t: 'door', x: 0, y: 15, w: 1, h: 3, to: 'neon_street', spawn: 'fromPlaza' },
      { t: 'door', x: 63, y: 15, w: 1, h: 3, to: 'neon_roofs', spawn: 'fromPlaza' },
      { t: 'door', x: 31, y: 18, w: 2, h: 2, to: 'neon_under', spawn: 'fromPlaza' }
    ]
  });

  /* --- ROOFTOPS — vertical, and the way to WARDEN-9 ----------------------- */
  R.add({
    id: 'neon_roofs', region: 'neoncity', name: 'ROOFLINE',
    map: { x: 15, y: 0 },
    tiles: [
      '########################################',
      '#                                      #',
      '#                            =======   #',
      '#                                      #',
      '#              =======                 #',
      '#                                      #',
      '#      ======                          #',
      '#                        ======        #',
      '#                                      #',
      '#                 ======               #',
      '#         ======                       #',
      '#                            ======    #',
      '#                                      #',
      '#     ======                           #',
      '#                     ======           #',
      '#                                      #',
      '#  ####                        ####    #',
      '   ####          ####          ####     ',
      '   ####          ####          ####     ',
      '########################################',
      '########################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromPlaza', x: 2, y: 17 },
      { t: 'spawn', name: 'fromArena', x: 37, y: 17 },
      { t: 'enemy', e: 'drone', x: 16, y: 6 },
      { t: 'enemy', e: 'drone', x: 24, y: 9 },
      { t: 'enemy', e: 'enforcer', x: 30, y: 18 },
      { t: 'enemy', e: 'eye', x: 20, y: 12 },
      { t: 'enemy', e: 'drone', x: 32, y: 12 },
      { t: 'pickup', kind: 'capacitor', id: 'cap_neon', x: 34, y: 3 },
      { t: 'door', x: 0, y: 17, w: 1, h: 3, to: 'neon_plaza', spawn: 'fromRoofs' },
      { t: 'door', x: 39, y: 17, w: 1, h: 3, to: 'neon_arena', spawn: 'fromRoofs' }
    ]
  });

  /* --- WARDEN-9 ARENA ------------------------------------------------------ */
  R.add({
    id: 'neon_arena', region: 'neoncity', name: 'CONTAINMENT YARD', music: 'boss',
    map: { x: 19, y: 0 },
    tiles: [
      '##########################################',
      '#                                        #',
      '#                                        #',
      '#     ==========          ==========     #',
      '#                                        #',
      '#                                        #',
      '#                                        #',
      '#            ================            #',
      '#                                        #',
      '#                                        #',
      '#  =======                    =======    #',
      '#                                        #',
      '#                                        #',
      '#                                        #',
      '#                                        #',
      '                                         #',
      '##########################################',
      '##########################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromRoofs', x: 2, y: 15 },
      { t: 'spawn', name: 'fromOld', x: 39, y: 15 },
      { t: 'boss', boss: 'warden9', x: 30, y: 15 },
      { t: 'pickup', kind: 'module', mod: 'doublejump', id: 'mod_doublejump', x: 20, y: 12,
        gate: 'boss:warden9' },
      { t: 'door', x: 0, y: 13, w: 1, h: 3, to: 'neon_roofs', spawn: 'fromArena' },
      { t: 'door', x: 41, y: 13, w: 1, h: 3, to: 'old_entry', spawn: 'fromNeon' }
    ]
  });

  /* --- UNDER — the descent to the Old Network ----------------------------- */
  R.add({
    id: 'neon_under', region: 'neoncity', name: 'SUBSURFACE ACCESS',
    map: { x: 9, y: 1 },
    tiles: [
      '################################################',
      '#                                              #',
      '#          =====                               #',
      '#                          =====               #',
      '#   =====                                      #',
      '#                    =====                     #',
      '#                                     =====    #',
      '#         =====                                #',
      '#                                              #',
      '#                =====                         #',
      '#   ###                                        #',
      '#   ###                              ###       #',
      '    ###           ####               ###        ',
      '    ###^^^^   ^^^^####^^^^   ^^^^   ^###        ',
      '################################################',
      '################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromPlaza', x: 4, y: 2 },
      { t: 'spawn', name: 'fromServers', x: 44, y: 10 },
      { t: 'enemy', e: 'drone', x: 22, y: 6 },
      { t: 'enemy', e: 'crawler', x: 36, y: 12 },
      { t: 'enemy', e: 'enforcer', x: 12, y: 12 },
      { t: 'enemy', e: 'eye', x: 28, y: 8 },
      { t: 'pickup', kind: 'shard', id: 'shard_neon_2', x: 42, y: 5 },
      { t: 'door', x: 30, y: 0, w: 4, h: 1, to: 'neon_plaza', spawn: 'fromUnder' },
      { t: 'door', x: 47, y: 11, w: 1, h: 3, to: 'srv_entry', spawn: 'fromNeon' }
    ]
  });

})(window.CV = window.CV || {});
