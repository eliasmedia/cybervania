/* CYBERVANIA — maps/servers.js
   "Where ATLAS keeps the dead."
   The region where the physical and data layers are most nearly aligned, so it is
   built around duality tiles: D (solid until you are CIPHER), d (only exists in the
   data layer), p (exists physically, absent from ATLAS's record). */
(function (CV) {
  'use strict';
  var R = CV.Rooms;

  R.add({
    id: 'srv_entry', region: 'servers', name: 'COLD AISLE — INTAKE',
    map: { x: 16, y: 3 },
    tiles: [
      '########################################################',
      '#                                                      #',
      '#   ####      ####      ####      ####      ####       #',
      '#   ####      ####      ####      ####      ####       #',
      '#   ####      ####      ####      ####      ####       #',
      '#                                                      #',
      '#         dddd              dddd                       #',
      '#                                                      #',
      '#   ======           ======           ======           #',
      '#                                                      #',
      '#                                                      #',
      '#              dddddd                                  #',
      '#                                                      #',
      '#   ####                                     ####      ',
      '    ####          ####         ####          ####      ',
      '    ####~~~~~~~~~~####~~~~~~~~~####~~~~~~~~~~####      ',
      '########################################################',
      '########################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromNeon', x: 2, y: 12 },
      { t: 'spawn', name: 'fromAisle', x: 52, y: 12 },
      { t: 'dock', id: 'dock_srv', x: 8, y: 13 },
      { t: 'divePort', id: 'port_srv', x: 7, y: 12 },
      { t: 'enemy', e: 'turret', x: 34, y: 13 },
      { t: 'enemy', e: 'daemon', x: 40, y: 9, layer: 1 },
      { t: 'enemy', e: 'nullifier', x: 44, y: 12 },
      { t: 'enemy', e: 'daemon', x: 22, y: 8, layer: 1 },
      { t: 'door', x: 0, y: 13, w: 1, h: 3, to: 'neon_under', spawn: 'fromServers' },
      { t: 'door', x: 55, y: 13, w: 1, h: 3, to: 'srv_aisle', spawn: 'fromEntry' }
    ]
  });

  /* Aisle 12. The archive. Half of this room only exists if you are looking at it
     the way ATLAS does. */
  R.add({
    id: 'srv_aisle', region: 'servers', name: 'AISLE 12 — ARCHIVE',
    map: { x: 23, y: 3 },
    tiles: [
      '################################################################',
      '#                                                              #',
      '#  ####   ####   ####   ####   ####   ####   ####   ####       #',
      '#  ####   ####   ####   ####   ####   ####   ####   ####       #',
      '#  ####   ####   ####   ####   ####   ####   ####   ####       #',
      '#                                                              #',
      '#          dddd         DDDD         dddd                      #',
      '#                       DDDD                                   #',
      '#     ppppp             DDDD              ppppp                #',
      '#                       DDDD                                   #',
      '#              dddddddd DDDD  dddddddd                         #',
      '#                       DDDD                                   #',
      '#   ####                DDDD                       ####        ',
      '    ####      ####      DDDD      ####             ####        ',
      '    ####      ####      ####      ####             ####        ',
      '################################################################',
      '################################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromEntry', x: 2, y: 11 },
      { t: 'spawn', name: 'fromCold', x: 60, y: 11 },
      { t: 'terminal', lore: 'atlas_archive', x: 8, y: 11 },
      { t: 'terminal', lore: 'halder_tape2', x: 56, y: 14 },
      { t: 'echo', x: 30, y: 14, layer: 1, walk: 1 },
      { t: 'echo', x: 44, y: 14, layer: 1 },
      { t: 'pickup', kind: 'fragment', lore: 'frag_kitchen', id: 'frag_srv_1',
        x: 18, y: 9, layer: 1 },
      { t: 'enemy', e: 'nullifier', x: 38, y: 14 },
      { t: 'enemy', e: 'daemon', x: 16, y: 9, layer: 1 },
      { t: 'enemy', e: 'turret', x: 48, y: 11 },
      { t: 'enemy', e: 'glitch', x: 28, y: 9, layer: 1 },
      { t: 'enemy', e: 'turret', x: 12, y: 11 },
      { t: 'door', x: 0, y: 12, w: 1, h: 3, to: 'srv_entry', spawn: 'fromAisle' },
      { t: 'door', x: 63, y: 12, w: 1, h: 3, to: 'srv_cold', spawn: 'fromAisle' }
    ]
  });

  R.add({
    id: 'srv_cold', region: 'servers', name: 'COOLANT GALLERY',
    map: { x: 31, y: 2 },
    tiles: [
      '################################################',
      '#                                              #',
      '#                                              #',
      '#     EEEE                        EEEE         #',
      '#     EEEE                        EEEE         #',
      '#                                              #',
      '#            ======        ======              #',
      '#                                              #',
      '#   ======                          ======     #',
      '#                                              #',
      '#                 dddddd                       #',
      '#                                              #',
      '#   ####                                ####   #',
      '    ####      ####        ####          ####   #',
      '    ####~~~~~~####~~~~~~~~####~~~~~~~~~~####   #',
      '################################################',
      '################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromAisle', x: 2, y: 11 },
      { t: 'spawn', name: 'fromArena', x: 44, y: 11 },
      { t: 'pickup', kind: 'module', mod: 'emp', id: 'mod_emp', x: 21, y: 9 },
      { t: 'pickup', kind: 'module', mod: 'wallcling', id: 'mod_wallcling', x: 6, y: 7 },
      { t: 'pickup', kind: 'shard', id: 'shard_srv_1', x: 41, y: 7 },
      { t: 'enemy', e: 'turret', x: 30, y: 12 },
      { t: 'enemy', e: 'nullifier', x: 18, y: 12 },
      { t: 'enemy', e: 'turret', x: 36, y: 12 },
      { t: 'enemy', e: 'daemon', x: 26, y: 8, layer: 1 },
      { t: 'door', x: 0, y: 12, w: 1, h: 3, to: 'srv_aisle', spawn: 'fromCold' },
      { t: 'door', x: 47, y: 12, w: 1, h: 3, to: 'srv_arena', spawn: 'fromCold' }
    ]
  });

  /* THE ARCHIVIST — fights across both layers at once. */
  R.add({
    id: 'srv_arena', region: 'servers', name: 'THE INDEX', music: 'boss',
    onEnter: 'archivist_pre', map: { x: 38, y: 2 },
    tiles: [
      '############################################',
      '#                                          #',
      '#                                          #',
      '#      dddddd                dddddd        #',
      '#                                          #',
      '#                                          #',
      '#   ======                        ======   #',
      '#                                          #',
      '#              dddddddddddd                #',
      '#                                          #',
      '#                                          #',
      '#       ======              ======         #',
      '#                                          #',
      '#                                          #',
      '#                                          #',
      '############################################',
      '############################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromCold', x: 3, y: 14 },
      { t: 'spawn', name: 'fromIndex', x: 39, y: 14 },
      { t: 'boss', boss: 'archivist', x: 22, y: 10 },
      { t: 'pickup', kind: 'frame', frame: 'cipher', id: 'frame_cipher', x: 22, y: 13,
        gate: 'boss:archivist' },
      { t: 'door', x: 0, y: 12, w: 1, h: 3, to: 'srv_cold', spawn: 'fromArena' },
      { t: 'door', x: 43, y: 12, w: 1, h: 3, to: 'srv_index', spawn: 'fromArena' }
    ]
  });

  /* THE INDEX — a room that is almost entirely data-layer geometry. Optional,
     and holds two of the Halder fragments. */
  R.add({
    id: 'srv_index', region: 'servers', name: 'THE INDEX — DEEP',
    map: { x: 45, y: 2 },
    tiles: [
      '################################################',
      '#                                              #',
      '#          dddd              dddd              #',
      '#                                              #',
      '#   dddd            dddd            dddd       #',
      '#                                              #',
      '#             dddddddd                         #',
      '#                                              #',
      '#   DDDD                              DDDD     #',
      '#   DDDD          dddddddddd          DDDD     #',
      '#   DDDD                              DDDD     #',
      '#                                              #',
      '#          dddd              dddd              #',
      '                                                ',
      '#####^^^^   ^^^^   ^^^^   ^^^^   ^^^^   ^^######',
      '################################################',
      '################################################'
    ],
    objects: [
      { t: 'spawn', name: 'fromArena', x: 2, y: 12 },
      { t: 'pickup', kind: 'fragment', lore: 'frag_student', id: 'frag_srv_2', x: 23, y: 10 },
      { t: 'pickup', kind: 'augment', aug: 'resonance', id: 'aug_resonance', x: 43, y: 9 },
      { t: 'echo', x: 12, y: 13, layer: 1 },
      { t: 'echo', x: 34, y: 13, layer: 1, walk: 1 },
      { t: 'enemy', e: 'glitch', x: 20, y: 8, layer: 1 },
      { t: 'enemy', e: 'daemon', x: 30, y: 6, layer: 1 },
      { t: 'enemy', e: 'glitch', x: 40, y: 11, layer: 1 },
      { t: 'door', x: 0, y: 11, w: 1, h: 3, to: 'srv_arena', spawn: 'fromIndex' }
    ]
  });

})(window.CV = window.CV || {});
