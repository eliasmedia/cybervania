/* CYBERVANIA — maps/undercity.js
   "Nothing down here was ever finished."
   Teaching region. Narrow corridors, honest jumps, generous docks. The first B-wall
   and the first unreachable ledge are both planted here, hours before their keys.

   Tile legend (world/tiles.js):
     #solid  =platform  ^spike  ~coolant  Ddata-wall  ddata-floor  Bbreakable
     Ebarrier  Ganchor  Crail  *lamp  -panel  .decor  (space)=air                   */
(function (CV) {
  'use strict';
  var R = CV.Rooms;

  /* --- 1. WAKE ------------------------------------------------------------ */
  R.add({
    id: 'und_wake', region: 'undercity', name: 'CRADLE 17', onEnter: 'wake',
    map: { x: 0, y: 6 },
    tiles: [
      '################################',
      '#                              #',
      '#      ----            ###     #',
      '#      ----            ###     #',
      '#                              #',
      '#                              #',
      '#                    ==        #',
      '#                              #',
      '#          ==                  #',
      '#                              #',
      '#   *                          #',
      '#                              #',
      '#                        --    #',
      '#                        --     ',
      '#                               ',
      '#                               ',
      '################################',
      '################################'
    ],
    objects: [
      { t: 'spawn', name: 'start', x: 5, y: 15 },
      { t: 'spawn', name: 'fromCorridor', x: 29, y: 15 },
      { t: 'prop', kind: 'rig', x: 4, y: 15 },
      { t: 'prop', kind: 'crate', x: 22, y: 15 },
      { t: 'door', x: 31, y: 13, w: 1, h: 3, to: 'und_corridor', spawn: 'fromWake' }
    ]
  });

  /* --- 2. CORRIDOR — movement taught by geometry, not by text -------------- */
  R.add({
    id: 'und_corridor', region: 'undercity', name: 'MAINTENANCE SPUR',
    map: { x: 1, y: 6 },
    tiles: [
      '################################################',
      '#                                              #',
      '#           ---                                #',
      '#           ---                       *        #',
      '#                                              #',
      '#                        ===                   #',
      '#                                              #',
      '#     *          ===                   ====    #',
      '#                                              #',
      '#                                              #',
      '#                                   ###        #',
      '#              ####                 ###        #',
      '#              ####                 ###        #',
      '     ###       ####      ^^^^       ###         ',
      '     ###       ####      ####       ###         ',
      '     ###       ####      ####       ###         ',
      '################################################',
      '################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromWake', x: 2, y: 15 },
      { t: 'spawn', name: 'fromJunction', x: 45, y: 15 },
      { t: 'enemy', e: 'crawler', x: 20, y: 12 },
      { t: 'enemy', e: 'crawler', x: 40, y: 15 },
      { t: 'graffiti', lore: 'graf_stop', x: 12, y: 11 },
      { t: 'door', x: 0, y: 13, w: 1, h: 3, to: 'und_wake', spawn: 'fromCorridor' },
      { t: 'door', x: 47, y: 13, w: 1, h: 3, to: 'und_junction', spawn: 'fromCorridor' }
    ]
  });

  /* --- 3. JUNCTION — first contact. Vertical, and the first thing you cannot reach. */
  R.add({
    id: 'und_junction', region: 'undercity', name: 'JUNCTION 4-A',
    map: { x: 2, y: 5 },
    tiles: [
      '########################################',
      '#                                      #',
      '#          BBBB                        #',
      '#          BBBB          ===           #',
      '#                                      #',
      '#                                   ===#',
      '#            ===                       #',
      '#                          ===         #',
      '#     ===                              #',
      '#                    ===               #',
      '#                                 ###  #',
      '#          ===                    ###  #',
      '#                                 ###  #',
      '#   ###                    ===    ###  #',
      '#   ###                           ###  #',
      '     ###        ###               ###   ',
      '     ###        ###               ###   ',
      '     ###        ###^^^^   ^^      ###   ',
      '########################################',
      '########################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromCorridor', x: 2, y: 17 },
      { t: 'spawn', name: 'fromSpur', x: 37, y: 17 },
      { t: 'spawn', name: 'fromShaft', x: 12, y: 4 },
      { t: 'enemy', e: 'eye', x: 20, y: 12 },
      { t: 'enemy', e: 'crawler', x: 28, y: 17 },
      { t: 'trigger', id: 'und_first_contact', x: 16, y: 12, w: 6, h: 6,
        script: 'first_contact', flag: 'met_atlas', alarm: 1 },
      { t: 'terminal', lore: 'atlas_incident', x: 32, y: 17 },
      /* The B-wall at the top left is visible from the floor and stays shut for hours. */
      { t: 'door', x: 0, y: 15, w: 1, h: 3, to: 'und_corridor', spawn: 'fromJunction' },
      { t: 'door', x: 39, y: 15, w: 1, h: 3, to: 'und_spur', spawn: 'fromJunction' },
      /* Deliberately sealed behind the B-wall: a shortcut that opens once you have
         Seismic Slam. The long way round is via und_dock. */
      { t: 'door', x: 11, y: 0, w: 4, h: 1, to: 'und_shaft', spawn: 'fromJunction',
        expectGated: true }
    ]
  });

  /* --- 4. SPUR — the dash. The gap that teaches it is unmissable. --------- */
  R.add({
    id: 'und_spur', region: 'undercity', name: 'DISUSED SPUR',
    map: { x: 3, y: 6 },
    tiles: [
      '########################################################',
      '#                                                      #',
      '#                    ***                               #',
      '#                                                      #',
      '#          ====                          =====         #',
      '#                                                      #',
      '#                        ====                          #',
      '#   ---                                        ---     #',
      '#   ---                                        ---     #',
      '#                                                      #',
      '#                                                      #',
      '########             ####                    ##########',
      '########             ####                    ##########',
      '     ###             ####                    ####       ',
      '     ###~~~~~~~~~~~~~####~~~~~~~~~~~~~~~~~~~~####       ',
      '     ###~~~~~~~~~~~~~####~~~~~~~~~~~~~~~~~~~~####       ',
      '########################################################',
      '########################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromJunction', x: 2, y: 10 },
      { t: 'spawn', name: 'fromDock', x: 53, y: 10 },
      { t: 'enemy', e: 'sweeper', x: 50, y: 10 },
      { t: 'enemy', e: 'crawler', x: 23, y: 10 },
      { t: 'enemy', e: 'crawler', x: 4, y: 10 },
      { t: 'enemy', e: 'eye', x: 30, y: 3 },
      /* Sits above the entry pillar, grabbed with a plain jump — it has to be
         reachable *without* dash, and the pit right after it is what dash is for. */
      { t: 'pickup', kind: 'module', mod: 'dash', id: 'mod_dash', x: 5, y: 7 },
      { t: 'door', x: 0, y: 8, w: 1, h: 3, to: 'und_junction', spawn: 'fromSpur' },
      { t: 'door', x: 55, y: 8, w: 1, h: 3, to: 'und_dock', spawn: 'fromSpur' }
    ]
  });

  /* --- 5. DOCK — first save point. Also the route down to the optional depths. */
  R.add({
    id: 'und_dock', region: 'undercity', name: 'SERVICE BAY 4',
    map: { x: 5, y: 6 },
    tiles: [
      '################################',
      '#                              #',
      '#        --------              #',
      '#        --------              #',
      '#                     *        #',
      '#                              #',
      '#            ====              #',
      '#                              #',
      '#                        ===   #',
      '#                              #',
      '#                               ',
      '#   ####                        ',
      '#   ####                    ####',
      '    ####                    ####',
      '    ####          ####      ####',
      '    ####          ####      ####',
      '#########    #############   ###',
      '#########    #############   ###'
    ],
    objects: [
      { t: 'spawn', name: 'fromSpur', x: 2, y: 10 },
      { t: 'spawn', name: 'fromDeep', x: 10, y: 14 },
      { t: 'spawn', name: 'fromShaft', x: 29, y: 11 },
      { t: 'dock', id: 'dock_und', x: 8, y: 14 },
      { t: 'pickup', kind: 'shard', id: 'shard_und_1', x: 25, y: 7 },
      { t: 'enemy', e: 'crawler', x: 24, y: 15 },
      { t: 'door', x: 0, y: 8, w: 1, h: 3, to: 'und_spur', spawn: 'fromDock' },
      /* The gap in the floor at x9-12 drops into the flooded sublevel. */
      { t: 'door', x: 9, y: 15, w: 4, h: 2, to: 'und_deep', spawn: 'fromDock' },
      { t: 'door', x: 31, y: 9, w: 1, h: 3, to: 'und_shaft', spawn: 'fromDock' }
    ]
  });

  /* --- 6. DEEP — optional. Dash-gated, and a B-wall you will remember. ---- */
  R.add({
    id: 'und_deep', region: 'undercity', name: 'FLOODED SUBLEVEL',
    map: { x: 5, y: 7 },
    tiles: [
      '##############    ##############################',
      '#                                              #',
      '#                                              #',
      '#                                              #',
      '#                             ====             #',
      '#     ====                                     #',
      '#                                        BBBB  #',
      '#                  ====                  BBBB  #',
      '#                                        BBBB  #',
      '#   ##                                   BBBB  #',
      '#   ##        ###                        BBBB  #',
      '#   ##        ###        ##              BBBB  #',
      '#~~~##~~~~~~~~###~~~~~~~~##~~~~~~~~~~~~~~BBBB~~#',
      '#~~~##~~~~~~~~###~~~~~~~~##~~~~~~~~~~~~~~####~~#',
      '################################################',
      '################################################',
      '################################################',
      '################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromDock', x: 16, y: 2 },
      { t: 'enemy', e: 'crawler', x: 20, y: 11 },
      { t: 'enemy', e: 'eye', x: 34, y: 8 },
      { t: 'enemy', e: 'sweeper', x: 30, y: 11 },
      { t: 'enemy', e: 'crawler', x: 15, y: 9 },
      { t: 'pickup', kind: 'shard', id: 'shard_und_2', x: 7, y: 8 },
      { t: 'pickup', kind: 'augment', aug: 'ghost', id: 'aug_ghost', x: 34, y: 11 },
      { t: 'door', x: 14, y: 0, w: 4, h: 2, to: 'und_dock', spawn: 'fromDeep' }
    ]
  });

  /* --- 7. SHAFT — the climb to the House, and on to the surface ----------- */
  R.add({
    id: 'und_shaft', region: 'undercity', name: 'RISER 4',
    map: { x: 4, y: 3 },
    tiles: [
      '####################',
      '#                  #',
      '#     ====         #',
      '#              ====#',
      '#                  #',
      '#  ====            #',
      '#             ==== #',
      '#                  #',
      '#      ====        #',
      '#                  #',
      '#            ====  #',
      '#                  #',
      '#   ====           #',
      '#                  #',
      '#          ====    #',
      '#                  #',
      '#  G               #',
      '#                  #',
      '#       ====       #',
      '#                  #',
      '#                  #',
      '#                   ',
      '#                   ',
      '#  ###       #######',
      '   ###       #######',
      '   ###^^^^   #######',
      '####################',
      '####################'
    ],
    objects: [
      { t: 'spawn', name: 'fromJunction', x: 1, y: 24 },
      { t: 'spawn', name: 'fromDock', x: 16, y: 21 },
      { t: 'spawn', name: 'fromHouse', x: 9, y: 3 },
      { t: 'enemy', e: 'eye', x: 15, y: 14 },
      { t: 'enemy', e: 'crawler', x: 8, y: 17 },
      { t: 'enemy', e: 'eye', x: 4, y: 8 },
      { t: 'pickup', kind: 'capacitor', id: 'cap_und', x: 2, y: 15 },
      { t: 'door', x: 1, y: 24, w: 2, h: 2, to: 'und_junction', spawn: 'fromShaft' },
      { t: 'door', x: 19, y: 20, w: 1, h: 2, to: 'und_dock', spawn: 'fromShaft' },
      { t: 'door', x: 7, y: 0, w: 5, h: 1, to: 'house_stair', spawn: 'fromShaft' }
    ]
  });

})(window.CV = window.CV || {});
