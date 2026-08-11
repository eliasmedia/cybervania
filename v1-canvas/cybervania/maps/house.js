/* CYBERVANIA — maps/house.js
   RESIDENTIAL BLOCK 7 — the structural keystone (WORLD_DESIGN §4).
   On the first visit this is a stairwell, two rooms and a save point. It stays that
   for hours. The workshop's back wall is a data-wall; behind it is the whole story.
   Nothing here is signposted, ever. */
(function (CV) {
  'use strict';
  var R = CV.Rooms;

  /* --- STAIRWELL ---------------------------------------------------------- */
  R.add({
    id: 'house_stair', region: 'house', name: 'BLOCK 7 — STAIRWELL',
    onEnter: 'house_first', map: { x: 4, y: 1 },
    tiles: [
      '########################',
      '#                      #',
      '#     ============     #',
      '#                      #',
      '#                      #',
      '#  ==========          #',
      '#                      #',
      '#                      #',
      '#          ==========  #',
      '#                      #',
      '#                      #',
      '#  ==========          #',
      '#                      #',
      '#                      #',
      '#          ==========  #',
      '#                      #',
      '#                      #',
      '#  ==========          #',
      '#                      #',
      '#                      #',
      '#          ==========  #',
      '#                      #',
      '#                      #',
      '#  ==========          #',
      '#                      #',
      '#      ***             #',
      '#                      #',
      '########################'
    ],
    objects: [
      { t: 'spawn', name: 'fromShaft', x: 4, y: 26 },
      { t: 'spawn', name: 'fromApartment', x: 20, y: 20 },
      { t: 'spawn', name: 'fromWorkshop', x: 20, y: 8 },
      { t: 'spawn', name: 'fromRoof', x: 12, y: 3 },
      { t: 'prop', kind: 'plant', x: 6, y: 24 },
      { t: 'prop', kind: 'plant', x: 17, y: 21 },
      { t: 'door', x: 6, y: 27, w: 5, h: 1, to: 'und_shaft', spawn: 'fromHouse' },
      { t: 'door', x: 23, y: 18, w: 1, h: 3, to: 'house_apartment', spawn: 'fromStair' },
      { t: 'door', x: 23, y: 6, w: 1, h: 3, to: 'house_workshop', spawn: 'fromStair' },
      { t: 'door', x: 10, y: 0, w: 5, h: 1, to: 'neon_street', spawn: 'fromHouse' }
    ]
  });

  /* --- APARTMENT — the only room in the game with no ATLAS sensor ---------- */
  R.add({
    id: 'house_apartment', region: 'house', name: 'BLOCK 7 — 3F',
    map: { x: 5, y: 3 },
    tiles: [
      '########################################',
      '#                                      #',
      '#   ------           -------           #',
      '#   ------           -------           #',
      '#                                      #',
      '#                                      #',
      '#            ====                      #',
      '#                                      #',
      '#                          ====        #',
      '#     *                                #',
      '#                                      #',
      '#                                      #',
      '#                                      #',
      '#                                      #',
      '                                       #',
      '                                       #',
      '########################################',
      '########################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromStair', x: 2, y: 15 },
      { t: 'prop', kind: 'chair', x: 9, y: 15 },
      { t: 'prop', kind: 'chair', x: 13, y: 15 },
      { t: 'prop', kind: 'plant', x: 30, y: 15 },
      { t: 'prop', kind: 'vending', x: 34, y: 15 },
      { t: 'terminal', lore: 'civ_apartment', x: 21, y: 15 },
      { t: 'pickup', kind: 'shard', id: 'shard_house_1', x: 32, y: 11 },
      { t: 'door', x: 0, y: 13, w: 1, h: 3, to: 'house_stair', spawn: 'fromApartment' }
    ]
  });

  /* --- WORKSHOP — the wall at the back is 40cm thicker than the floorplan -- */
  R.add({
    id: 'house_workshop', region: 'house', name: 'BLOCK 7 — WORKSHOP',
    map: { x: 5, y: 2 },
    tiles: [
      '########################################',
      '#                          DDDD        #',
      '#   -----                  DDDD        #',
      '#   -----                  DDDD        #',
      '#                          DDDD        #',
      '#              ====        DDDD        #',
      '#                          DDDD        #',
      '#                          DDDD        #',
      '#      *                   DDDD        #',
      '#                          DDDD        #',
      '#                          DDDD        #',
      '#                          DDDD        #',
      '#                          DDDD        #',
      '                           DDDD        #',
      '                           DDDD        #',
      '########################################',
      '########################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromStair', x: 2, y: 14 },
      { t: 'spawn', name: 'fromLab', x: 24, y: 14 },
      { t: 'dock', id: 'dock_house', x: 6, y: 14 },
      { t: 'prop', kind: 'rig', x: 17, y: 14 },
      { t: 'prop', kind: 'crate', x: 21, y: 14 },
      { t: 'terminal', lore: 'halder_grant', x: 12, y: 14 },
      { t: 'door', x: 0, y: 13, w: 1, h: 3, to: 'house_stair', spawn: 'fromWorkshop' },
      /* Only reachable once the D-wall is passable — i.e. once you are CIPHER. */
      { t: 'door', x: 34, y: 13, w: 1, h: 3, to: 'house_lab', spawn: 'fromWorkshop' }
    ]
  });

  /* --- THE LAB ------------------------------------------------------------ */
  R.add({
    id: 'house_lab', region: 'house', name: 'CONTINUITY',
    onEnter: 'lab_enter', map: { x: 7, y: 2 },
    tiles: [
      '####################################',
      '#                                  #',
      '#   ----------------------------   #',
      '#   ----------------------------   #',
      '#                                  #',
      '#                                  #',
      '#                                  #',
      '#                                  #',
      '#                                  #',
      '#                                  #',
      '#                                  #',
      '#                                  #',
      '                                   #',
      '                                   #',
      '####################################',
      '####################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromWorkshop', x: 2, y: 13 },
      /* The chair is dead centre. The player walks into it before they read anything. */
      { t: 'prop', kind: 'body', x: 17, y: 13 },
      { t: 'prop', kind: 'rig', x: 12, y: 13 },
      { t: 'prop', kind: 'rig', x: 22, y: 13 },
      { t: 'trigger', id: 'lab_body_seen', x: 14, y: 8, w: 7, h: 6, script: 'lab_body',
        flag: 'saw_body' },
      { t: 'terminal', lore: 'halder_notes1', x: 5, y: 13 },
      { t: 'terminal', lore: 'halder_notes2', x: 8, y: 13 },
      { t: 'terminal', lore: 'halder_letter', x: 26, y: 13 },
      { t: 'terminal', lore: 'halder_names', x: 29, y: 13 },
      { t: 'terminal', lore: 'halder_last', x: 32, y: 13 },
      { t: 'terminal', lore: 'halder_tape3', x: 20, y: 13 },
      { t: 'pickup', kind: 'augment', aug: 'continuity', id: 'aug_continuity', x: 3, y: 10 },
      { t: 'door', x: 0, y: 12, w: 1, h: 3, to: 'house_workshop', spawn: 'fromLab' }
    ]
  });

})(window.CV = window.CV || {});
