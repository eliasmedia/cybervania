/* CYBERVANIA — data/regions.js
   Region metadata: identity, ambience, music cue and map colour. Adding a region is
   an entry here plus a maps/*.js file (WORLD_DESIGN §2). */
(function (CV) {
  'use strict';

  var C = CV.Palette.c;

  CV.Regions = {
    undercity: {
      id: 'undercity', name: 'UNDERCITY', short: 'UNDR', order: 0,
      subtitle: 'NOTHING DOWN HERE WAS EVER FINISHED',
      music: 'undercity', mapColor: C.amber,
      rain: 0, motes: 26, moteColor: '#8c6a3a', ambient: 'drip'
    },
    house: {
      id: 'house', name: 'RESIDENTIAL BLOCK 7', short: 'BLK7', order: 1,
      subtitle: 'OCCUPANCY: 0',
      music: 'house', mapColor: C.green,
      rain: 0, motes: 14, moteColor: '#6a8c7a', ambient: 'hum'
    },
    neoncity: {
      id: 'neoncity', name: 'NEON CITY', short: 'NEON', order: 2,
      subtitle: 'THE SIGNS ARE STILL PAID FOR',
      music: 'neoncity', mapColor: C.magenta,
      rain: 1, motes: 0, moteColor: '#7aa0c8', ambient: 'rain'
    },
    oldnetwork: {
      id: 'oldnetwork', name: 'OLD NETWORK', short: 'OLDN', order: 3,
      subtitle: 'THE FIRST CITY\'S NERVOUS SYSTEM',
      music: 'oldnetwork', mapColor: C.green,
      rain: 0, motes: 30, moteColor: '#4a7a5a', ambient: 'relay'
    },
    factory: {
      id: 'factory', name: 'FACTORY SECTOR', short: 'FACT', order: 4,
      subtitle: 'ORDER FULFILMENT: NOMINAL',
      music: 'factory', mapColor: '#ff6a2b',
      rain: 0, motes: 34, moteColor: '#c8843a', ambient: 'machinery'
    },
    servers: {
      id: 'servers', name: 'SERVER FARMS', short: 'SRVR', order: 5,
      subtitle: 'WHERE ATLAS KEEPS THE DEAD',
      music: 'servers', mapColor: C.cyan,
      rain: 0, motes: 12, moteColor: '#5a9ac8', ambient: 'fans'
    },
    reactor: {
      id: 'reactor', name: 'REACTOR CORE', short: 'RCTR', order: 6,
      subtitle: 'THE ONLY THING HERE THAT IS ALIVE',
      music: 'reactor', mapColor: '#ff8a2b',
      rain: 0, motes: 44, moteColor: '#ff9a4a', ambient: 'reactor'
    },
    central: {
      id: 'central', name: 'CENTRAL SYSTEM', short: 'CNTR', order: 7,
      subtitle: 'NOTHING HERE WAS BUILT FOR A BODY',
      music: 'central', mapColor: C.white,
      rain: 0, motes: 8, moteColor: '#8a8aa0', ambient: 'void'
    }
  };

  CV.Regions.order = ['undercity', 'house', 'neoncity', 'oldnetwork',
                      'factory', 'servers', 'reactor', 'central'];

  CV.Regions.get = function (id) { return CV.Regions[id] || CV.Regions.undercity; };

})(window.CV = window.CV || {});
