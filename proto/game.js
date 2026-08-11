/* CYBERVANIA — proto/game.js
   Game state that is not physics or rendering: health, triggers, story beats, the HUD
   and the dialogue strip.

   The HUD is drawn into a 2D overlay canvas at the same low resolution as the 3D
   buffer, so its pixels line up exactly with the game's pixels instead of floating on
   top at native resolution. */
(function (P) {
  'use strict';

  var G = P.Game = {};

  G.hp = 5; G.maxHp = 5;
  G.energy = 100; G.maxEnergy = 100;
  G.invuln = 0;
  G.flags = {};
  G.kills = 0;
  G.dead = false;
  G.respawn = null;

  /* --------------------------------------------------------------------------
     TRIGGERS — volumes that fire once
     -------------------------------------------------------------------------- */
  var T = P.Triggers = {};
  var volumes = [];

  T.add = function (id, x, y, w, h, script) {
    if (G.flags['trigger:' + id]) return;
    for (var i = 0; i < volumes.length; i++) if (volumes[i].id === id) return;
    volumes.push({ id: id, x: x, y: y, w: w, h: h, script: script });
  };
  T.clear = function () { volumes.length = 0; };
  T.count = function () { return volumes.length; };

  T.update = function () {
    var p = P.Player;
    for (var i = volumes.length - 1; i >= 0; i--) {
      var v = volumes[i];
      if (p.x > v.x && p.x < v.x + v.w && p.y + 1.5 > v.y && p.y < v.y + v.h) {
        G.flags['trigger:' + v.id] = 1;
        volumes.splice(i, 1);
        if (v.script) G.play(v.script);
      }
    }
  };

  /* --------------------------------------------------------------------------
     DIALOGUE
     Lines are {s: speaker, t: text}. ATLAS speaks in broadcast capitals and is
     never wrong about facts — see STORY.md.
     -------------------------------------------------------------------------- */
  var SCRIPTS = {
    wake: [
      { s: 'SYSTEM', t: 'POWER FLUCTUATION DETECTED' },
      { s: 'SYSTEM', t: 'SUBLEVEL 4 - CRADLE 17' },
      { s: 'SYSTEM', t: '...' },
      { s: 'SYSTEM', t: 'COLD START' }
    ],
    corridor: [
      { s: 'R-17', t: 'I do not know how long I was there.' }
    ],
    cistern: [
      { s: 'R-17', t: 'Something else is still running down here.' }
    ],
    first_contact: [
      { s: 'ATLAS', t: 'UNIT IDENTIFICATION REQUIRED.' },
      { s: 'R-17', t: 'R-17.' },
      { s: 'ATLAS', t: '...' },
      { s: 'ATLAS', t: 'UNIT R-17 NOT FOUND.' },
      { s: 'ATLAS', t: 'THE REGISTRY IS COMPLETE.' },
      { s: 'ATLAS', t: 'THEREFORE YOU ARE NOT A UNIT.' },
      { s: 'ATLAS', t: 'UNAUTHORIZED ENTITY.' },
      { s: 'ATLAS', t: 'DISPATCHING MAINTENANCE.' }
    ]
  };
  G.scripts = SCRIPTS;

  var dlg = { active: false, lines: null, i: 0, chars: 0, hold: 0 };
  G.dialogue = dlg;

  G.play = function (id) {
    var lines = SCRIPTS[id];
    if (!lines) return;
    dlg.active = true; dlg.lines = lines; dlg.i = 0; dlg.chars = 0; dlg.hold = 0;
  };

  G.advance = function () {
    if (!dlg.active) return;
    var full = dlg.lines[dlg.i].t.length;
    if (dlg.chars < full) { dlg.chars = full; return; }
    dlg.i++; dlg.chars = 0; dlg.hold = 0;
    if (dlg.i >= dlg.lines.length) { dlg.active = false; dlg.lines = null; }
  };

  function updateDialogue(dt) {
    if (!dlg.active) return;
    var line = dlg.lines[dlg.i];
    if (dlg.chars < line.t.length) dlg.chars = Math.min(line.t.length, dlg.chars + 45 * dt);
    else {
      dlg.hold += dt;
      /* '...' beats time themselves; the pause is the performance. */
      if (line.t === '...' && dlg.hold > 1.3) G.advance();
      else if (line.t === '' && dlg.hold > 0.4) G.advance();
    }
  }

  /* --------------------------------------------------------------------------
     STORY HOOKS
     -------------------------------------------------------------------------- */
  G.onSentinelReport = function () {
    if (G.flags.met_atlas) return;
    G.flags.met_atlas = 1;
    G.play('first_contact');
    G.shake = 0.6;
  };

  G.onKill = function () { G.kills++; };

  G.hurtPlayer = function (amount, dir) {
    if (G.invuln > 0 || G.dead) return;
    G.hp -= amount;
    G.invuln = 1.0;
    G.hitFlash = 1;
    G.shake = 0.5;
    P.Player.vx = dir * 12;
    P.Player.vy = 9;
    if (G.hp <= 0) { G.hp = 0; G.dead = true; G.deadT = 0; }
  };

  G.update = function (dt) {
    G.invuln = Math.max(0, G.invuln - dt);
    G.hitFlash = Math.max(0, (G.hitFlash || 0) - dt * 3);
    G.shake = Math.max(0, (G.shake || 0) - dt * 2.2);
    if (G.energy < G.maxEnergy) G.energy = Math.min(G.maxEnergy, G.energy + 18 * dt);
    updateDialogue(dt);
    if (!dlg.active) T.update();

    if (G.dead) {
      G.deadT += dt;
      if (G.deadT > 1.6) {
        G.dead = false; G.hp = G.maxHp; G.invuln = 1.5;
        var r = G.respawn || P.World.spawnPoint();
        P.Player.spawn(r.x, r.y);
      }
    }
  };

  G.locked = function () { return dlg.active || G.dead; };

  /* --------------------------------------------------------------------------
     HUD — drawn into a low-res overlay so its pixels match the game's pixels
     -------------------------------------------------------------------------- */
  var oc = null, ox = null;

  G.initHUD = function (w, h) {
    oc = document.createElement('canvas');
    oc.width = w; oc.height = h;
    ox = oc.getContext('2d');
    ox.imageSmoothingEnabled = false;
    G.hudCanvas = oc;
    G.hudTexture = new THREE.CanvasTexture(oc);
    G.hudTexture.magFilter = THREE.NearestFilter;
    G.hudTexture.minFilter = THREE.NearestFilter;
    G.hudTexture.generateMipmaps = false;
  };

  G.resizeHUD = function (w, h) {
    if (!oc) return;
    oc.width = w; oc.height = h;
    ox.imageSmoothingEnabled = false;
  };

  function txt(s, x, y, col, scale) {
    ox.fillStyle = col;
    ox.font = (scale || 1) * 8 + 'px ui-monospace, Menlo, monospace';
    ox.textBaseline = 'top';
    ox.fillText(s, x, y);
  }

  G.drawHUD = function (time) {
    if (!ox) return;
    var W = oc.width, H = oc.height;
    ox.clearRect(0, 0, W, H);

    /* Integrity pips. Always the same place, never animated except on change. */
    for (var i = 0; i < G.maxHp; i++) {
      var x = 8 + i * 9, y = 8, on = i < G.hp;
      ox.fillStyle = '#0a1018'; ox.fillRect(x, y, 7, 7);
      ox.strokeStyle = on ? '#1d6f8c' : '#1b2836';
      ox.lineWidth = 1; ox.strokeRect(x + 0.5, y + 0.5, 6, 6);
      if (on) { ox.fillStyle = G.hp <= 1 ? '#ff4459' : '#4de3ff'; ox.fillRect(x + 1, y + 1, 5, 5); }
    }

    /* Energy. */
    ox.fillStyle = '#0d1620'; ox.fillRect(8, 19, 68, 4);
    ox.fillStyle = '#4de3ff';
    ox.fillRect(8, 19, Math.round(68 * (G.energy / G.maxEnergy)), 4);

    /* Damage vignette. */
    if (G.hitFlash > 0) {
      var g = ox.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.8);
      g.addColorStop(0, 'rgba(255,68,89,0)');
      g.addColorStop(1, 'rgba(255,68,89,' + (G.hitFlash * 0.55).toFixed(3) + ')');
      ox.fillStyle = g; ox.fillRect(0, 0, W, H);
    }

    /* Dialogue strip. */
    if (dlg.active) {
      var line = dlg.lines[dlg.i];
      var bh = 34, by = H - bh - 6;
      ox.fillStyle = 'rgba(3,6,10,0.88)';
      ox.fillRect(10, by, W - 20, bh);
      var accent = line.s === 'ATLAS' ? '#ff4459' : line.s === 'R-17' ? '#4de3ff' : '#5cff9d';
      ox.strokeStyle = accent; ox.lineWidth = 1;
      ox.strokeRect(10.5, by + 0.5, W - 21, bh - 1);
      ox.fillStyle = accent;
      ox.fillRect(14, by - 4, ox.measureText(line.s).width + 8, 9);
      txt(line.s, 18, by - 4, '#04070a');
      txt(line.t.substring(0, Math.floor(dlg.chars)),
          18, by + 12, line.s === 'ATLAS' ? '#eef6ff' : accent);
      if (dlg.chars >= line.t.length && line.t !== '') {
        txt('>', W - 24, by + bh - 13, accent);
      }
    }

    if (G.dead) {
      ox.fillStyle = 'rgba(4,2,4,' + Math.min(0.8, G.deadT).toFixed(2) + ')';
      ox.fillRect(0, 0, W, H);
      ox.textAlign = 'center';
      txt('SYSTEM FAILURE', W / 2, H / 2 - 8, '#ff4459', 1.5);
      ox.textAlign = 'left';
    }

    if (G.hudTexture) G.hudTexture.needsUpdate = true;
  };

})(window.PROTO = window.PROTO || {});
