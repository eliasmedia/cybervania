/* CYBERVANIA — save/save.js
   Progression state, settings, and localStorage persistence with a migration chain.
   Degrades to an in-memory store if storage is unavailable (some file:// configs),
   warning the player rather than throwing. */
(function (CV) {
  'use strict';

  var VERSION = 1;
  var KEY = 'cybervania.save.v1.slot';
  var SET_KEY = 'cybervania.settings.v1';

  /* --- storage shim -------------------------------------------------------- */
  var store, storageOk = true;
  try {
    window.localStorage.setItem('cybervania.probe', '1');
    window.localStorage.removeItem('cybervania.probe');
    store = window.localStorage;
  } catch (e) {
    storageOk = false;
    var mem = {};
    store = {
      getItem: function (k) { return mem[k] === undefined ? null : mem[k]; },
      setItem: function (k, v) { mem[k] = String(v); },
      removeItem: function (k) { delete mem[k]; }
    };
  }

  /* =========================================================================
     SETTINGS
     ========================================================================= */
  var DEFAULT_SETTINGS = {
    masterVolume: 0.75, musicVolume: 0.5, sfxVolume: 0.8,
    scanlines: true, vignette: true, chromatic: true, glitch: true, noise: true,
    shake: 1.0, damageNumbers: true, textSpeed: 1.0,
    assistDamage: 1.0, assistEnergy: false,
    scale: 0, bindings: null
  };

  var S = CV.Settings = {};
  for (var k in DEFAULT_SETTINGS) S[k] = DEFAULT_SETTINGS[k];

  S.load = function () {
    try {
      var raw = store.getItem(SET_KEY);
      if (!raw) return;
      var o = JSON.parse(raw);
      for (var k2 in DEFAULT_SETTINGS) if (o[k2] !== undefined) S[k2] = o[k2];
      if (o.bindings) CV.Input.applyBindings(o.bindings);
    } catch (e) { /* corrupt settings are not worth crashing over */ }
  };

  S.save = function () {
    try {
      var o = {};
      for (var k3 in DEFAULT_SETTINGS) o[k3] = S[k3];
      o.bindings = CV.Input.bindings;
      store.setItem(SET_KEY, JSON.stringify(o));
    } catch (e) {}
  };

  S.reset = function () {
    for (var k4 in DEFAULT_SETTINGS) S[k4] = DEFAULT_SETTINGS[k4];
    CV.Input.resetBindings();
    S.save();
  };

  /* =========================================================================
     PROGRESSION STATE
     ========================================================================= */
  var State = CV.State = {};

  State.reset = function () {
    State.modules = {};
    State.frames = { vector: 1 };
    State.augments = {};
    State.equipped = [];
    State.flags = {};
    State.lore = {};
    State.pickups = {};
    State.trams = {};
    State.discovered = {};
    State.fragments = [];
    State.bosses = [];
    State.shards = 0;
    State.capacitors = 0;
    State.dockRoom = null;
    State.dockPos = null;
    State.lastRoom = null;
    State.playtime = 0;
    State.deaths = 0;
    State.kills = 0;
    State.suppress = 0;
    State.slot = 1;
  };
  State.reset();

  State.hasModule = function (id) {
    if (State.suppress > 0 && id !== 'dash' && id !== 'doublejump') return false;
    return !!State.modules[id];
  };
  State.rawModule = function (id) { return !!State.modules[id]; };
  State.giveModule = function (id) {
    State.modules[id] = 1;
    CV.emit('module:given', id);
  };

  State.hasFrame = function (id) { return !!State.frames[id]; };
  State.giveFrame = function (id) { State.frames[id] = 1; CV.emit('frame:given', id); };
  State.frameCount = function () { return Object.keys(State.frames).length; };

  State.hasAugment = function (id) { return State.equipped.indexOf(id) >= 0; };
  State.ownsAugment = function (id) { return !!State.augments[id]; };
  State.augmentSlots = function () {
    /* Slots open with progression: 0 -> 2 -> 3 across the game. */
    var n = 1;
    if (State.bosses.length >= 2) n = 2;
    if (State.bosses.length >= 4) n = 3;
    return n;
  };
  State.giveAugment = function (id) {
    State.augments[id] = 1;
    if (State.equipped.length < State.augmentSlots()) State.equipped.push(id);
  };
  State.toggleAugment = function (id) {
    var i = State.equipped.indexOf(id);
    if (i >= 0) { State.equipped.splice(i, 1); return false; }
    if (State.equipped.length >= State.augmentSlots()) return false;
    State.equipped.push(id);
    return true;
  };

  State.flag = function (name) { return !!State.flags[name]; };
  State.setFlag = function (name, v) { State.flags[name] = v ? 1 : 0; };

  State.hasLore = function (id) { return !!State.lore[id]; };
  State.readLore = function (id) {
    if (!id || State.lore[id]) return;
    State.lore[id] = 1;
    CV.emit('lore:read', id);
  };
  State.loreCount = function () { return Object.keys(State.lore).length; };

  State.hasPickup = function (id) { return !!State.pickups[id]; };
  State.takePickup = function (id) { State.pickups[id] = 1; };

  State.addShard = function () { State.shards++; };
  State.addFragment = function (id) {
    if (id && State.fragments.indexOf(id) < 0) State.fragments.push(id);
  };

  State.discoverRoom = function (id) {
    State.discovered[id] = 1;
    State.lastRoom = id;
  };
  State.isDiscovered = function (id) { return !!State.discovered[id]; };

  State.setDock = function (roomId, x, y) {
    State.dockRoom = roomId;
    State.dockPos = { x: x, y: y };
  };

  State.unlockTram = function (id, roomId, name) {
    State.trams[id] = { room: roomId, name: name };
  };
  State.hasTram = function (id) { return !!State.trams[id]; };

  /* Modules the SPECIAL key can fire. Passives are excluded. */
  var ACTIVE = ['emp', 'cutter', 'overclock', 'drone'];
  State.activeModules = function () {
    var out = [];
    for (var i = 0; i < ACTIVE.length; i++) {
      if (State.rawModule(ACTIVE[i])) out.push(ACTIVE[i]);
    }
    return out;
  };

  State.completion = function () {
    var total = 0, got = 0;
    var mods = CV.Modules.order.length; total += mods;
    for (var i = 0; i < CV.Modules.order.length; i++) if (State.modules[CV.Modules.order[i]]) got++;
    total += 4; got += State.frameCount();
    total += 18; got += Math.min(18, State.shards);
    total += 6;  got += Math.min(6, State.capacitors);
    total += 14; got += Object.keys(State.augments).length;
    total += 24; got += State.fragments.length;
    total += CV.Lore.order.length; got += State.loreCount();
    total += 6;  got += State.bosses.length;
    return Math.round(got / total * 100);
  };

  /* =========================================================================
     SERIALISATION
     ========================================================================= */
  var Save = CV.Save = {};

  Save.storageAvailable = function () { return storageOk; };

  function serialise() {
    return {
      v: VERSION,
      t: State.playtime,
      room: CV.World.room ? CV.World.room.id : 'und_wake',
      dockRoom: State.dockRoom, dockPos: State.dockPos,
      modules: State.modules, frames: State.frames,
      augments: State.augments, equipped: State.equipped,
      flags: State.flags, lore: State.lore, pickups: State.pickups,
      trams: State.trams, discovered: State.discovered,
      fragments: State.fragments, bosses: State.bosses,
      shards: State.shards, capacitors: State.capacitors,
      hp: CV.Player.hp, maxHp: CV.Player.maxHp, frame: CV.Player.frameId,
      deaths: State.deaths, kills: State.kills,
      completion: State.completion()
    };
  }

  /* Migration chain — old saves survive updates rather than being discarded. */
  function migrate(d) {
    if (!d.v || d.v < 1) d.v = 1;
    return d;
  }

  Save.write = function (slot) {
    try {
      store.setItem(KEY + slot, JSON.stringify(serialise()));
      return true;
    } catch (e) { return false; }
  };

  Save.read = function (slot) {
    try {
      var raw = store.getItem(KEY + slot);
      if (!raw) return null;
      return migrate(JSON.parse(raw));
    } catch (e) { return null; }   // corrupt slot reads as EMPTY, never throws
  };

  Save.exists = function (slot) { return !!Save.read(slot); };

  Save.erase = function (slot) {
    try { store.removeItem(KEY + slot); } catch (e) {}
  };

  Save.autosave = function () {
    Save.write(State.slot);
    CV.HUD.toast('SAVED — SLOT ' + State.slot);
  };

  Save.apply = function (d) {
    State.reset();
    State.slot = State.slot || 1;
    State.playtime = d.t || 0;
    State.dockRoom = d.dockRoom || null;
    State.dockPos = d.dockPos || null;
    State.modules = d.modules || {};
    State.frames = d.frames || { vector: 1 };
    State.augments = d.augments || {};
    State.equipped = d.equipped || [];
    State.flags = d.flags || {};
    State.lore = d.lore || {};
    State.pickups = d.pickups || {};
    State.trams = d.trams || {};
    State.discovered = d.discovered || {};
    State.fragments = d.fragments || [];
    State.bosses = d.bosses || [];
    State.shards = d.shards || 0;
    State.capacitors = d.capacitors || 0;
    State.deaths = d.deaths || 0;
    State.kills = d.kills || 0;

    CV.Player.maxHp = d.maxHp || 4;
    CV.Player.hp = d.hp || CV.Player.maxHp;
    CV.Player.setFrame(d.frame || 'vector', true);
    CV.Player.energy = CV.Player.maxEnergy();
    return d.room || 'und_wake';
  };

  Save.load = function (slot) {
    var d = Save.read(slot);
    if (!d) return false;
    State.slot = slot;
    var room = Save.apply(d);
    CV.Rooms.reset();
    CV.DataSphere.forceLayer(0);
    /* Prefer the dock so a load never drops you mid-hazard. */
    var target = State.dockRoom || room;
    CV.World.load(target, null, (State.dockRoom && State.dockPos)
      ? { x: State.dockPos.x, y: State.dockPos.y - CV.Player.h } : null);
    return true;
  };

  Save.newGame = function (slot) {
    State.reset();
    State.slot = slot;
    CV.Rooms.reset();
    CV.Player.maxHp = 4;
    CV.Player.init();
    CV.DataSphere.forceLayer(0);
    CV.World.load('und_wake', 'start');
    Save.write(slot);
  };

  /* Slot summary for the title screen and the SYSTEM tab. */
  Save.summary = function (slot) {
    var d = Save.read(slot);
    if (!d) return null;
    var room = CV.Rooms.get(d.room);
    var region = room ? CV.Regions.get(room.region) : null;
    return {
      slot: slot,
      time: CV.Util.timeString(d.t || 0),
      area: region ? region.name : 'UNKNOWN',
      completion: d.completion || 0,
      frames: Object.keys(d.frames || {}).length,
      modules: Object.keys(d.modules || {}).length
    };
  };

})(window.CV = window.CV || {});
