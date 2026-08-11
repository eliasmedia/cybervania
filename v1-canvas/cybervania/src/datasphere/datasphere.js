/* CYBERVANIA — datasphere/datasphere.js
   The Data Sphere is not a separate world and not a colour filter: it is the same
   room as ATLAS remembers it. Solidity is a function of (tile, layer), so a collapsed
   bridge is intact there and a coolant flood does not exist there (GAME_DESIGN §1).

   Access is deliberately staged. Early on R-17 has no uplink and can only dive where
   ATLAS's own hardware provides an anchor (Dive Ports). CIPHER removes that limit. */
(function (CV) {
  'use strict';

  var T = CV.Tiles, U = CV.Util, C = CV.Palette.c, FX = CV.FX, G = CV.Gfx;
  var DS = CV.DataSphere = {};

  DS.layer = T.PHYS;
  DS.transition = 0;      // 0..1 visual crossfade
  DS.reveal = 0;          // Overclock/Cipher "show me everything" pulse
  DS.portLock = null;     // when diving from a port, the port we must return to
  DS.time = 0;

  DS.isData = function () { return DS.layer === T.DATA; };

  DS.canShift = function () {
    if (!CV.State.hasModule('datashift')) return false;
    if (CV.State.suppress > 0) return false;               // Nullifier field
    return CV.Player.frame.freeDataShift === true;
  };

  /* Free shift (CIPHER only). Refuses if the destination geometry would trap you. */
  DS.tryShift = function () {
    if (DS.transition > 0) return;

    if (!CV.State.hasModule('datashift')) { CV.Audio.sfx('deny'); return; }

    if (!DS.canShift()) {
      /* Non-Cipher frames must use a Dive Port. Say so once, clearly. */
      CV.HUD.toast(CV.State.suppress > 0 ? 'SIGNAL SUPPRESSED'
                                         : 'NO UPLINK — USE A DIVE PORT');
      CV.Audio.sfx('deny');
      return;
    }

    var target = DS.layer === T.PHYS ? T.DATA : T.PHYS;
    if (!DS.roomFor(target)) {
      CV.HUD.toast('GEOMETRY OCCUPIED');
      CV.Audio.sfx('deny');
      return;
    }
    DS.setLayer(target);
  };

  /* Dive Ports: fixed-point access for every frame. The port ejects you when you
     leave its range, which is why early Data Sphere content is local puzzles. */
  DS.diveAtPort = function (port) {
    if (DS.layer === T.DATA) { DS.setLayer(T.PHYS); DS.portLock = null; return; }
    if (!DS.roomFor(T.DATA)) { CV.HUD.toast('GEOMETRY OCCUPIED'); CV.Audio.sfx('deny'); return; }
    DS.portLock = CV.Player.frame.freeDataShift ? null : port;
    DS.setLayer(T.DATA);
    if (!CV.State.flag('first_dive_done')) {
      CV.State.setFlag('first_dive_done', 1);
      CV.Engine.after(1.0, function () {
        CV.DialogUI.play(CV.Dialogue.get('dive_inside'));
      });
    }
  };

  DS.roomFor = function (layer) {
    var p = CV.Player, room = CV.World.room;
    if (!room) return false;
    if (!CV.Collision.solidBox(room, p.x, p.y, p.w, p.h, layer)) return true;
    /* Allow a small nudge — otherwise standing one pixel inside a data-wall blocks
       a shift the player has every right to make. */
    var saveX = p.x, saveY = p.y;
    if (CV.Collision.resolveOverlap(p, room, layer)) {
      if (U.dist(saveX, saveY, p.x, p.y) < 20) return true;
    }
    p.x = saveX; p.y = saveY;
    return false;
  };

  DS.setLayer = function (layer) {
    if (DS.layer === layer) return;
    DS.layer = layer;
    DS.transition = 1;
    var p = CV.Player;
    CV.Collision.resolveOverlap(p, CV.World.room, layer);
    CV.PostFX.pulse(1, 0.85);
    CV.PostFX.whiteFlash(0.35, C.cyan);
    CV.Engine.addTrauma(0.3);
    CV.Audio.sfx('layerSwap');
    CV.Audio.setLayer(layer);
    FX.ring(p.x + p.w / 2, p.y + p.h / 2, C.cyan, 220, 26);
    for (var i = 0; i < 26; i++) {
      FX.glyph(p.x + CV.rng.range(-40, 40), p.y - CV.rng.range(0, 60), C.cyan);
    }
    CV.HUD.toast(layer === T.DATA ? 'DATA SPHERE' : 'PHYSICAL LAYER');
    CV.emit('layer:changed', layer);
  };

  DS.forceLayer = function (layer) {
    DS.layer = layer;
    DS.transition = 0;
    DS.portLock = null;
    CV.Audio.setLayer(layer);
  };

  DS.revealPulse = function (sec) { DS.reveal = sec; };

  DS.update = function (dt) {
    DS.time += dt;
    DS.transition = Math.max(0, DS.transition - dt * 2.4);
    DS.reveal = Math.max(0, DS.reveal - dt);

    /* Ambient glyph rain while in the sphere — the layer's visual signature. */
    if (DS.layer === T.DATA && CV.rngFX.chance(dt * 26)) {
      var cam = CV.Game.camera;
      FX.glyph(cam.x + CV.rng.range(0, CV.W), cam.y - 8, C.cyan);
    }

    /* Port tether: leaving the anchor's range ejects you. Stated once, in dialogue. */
    if (DS.portLock && DS.layer === T.DATA) {
      var p = CV.Player;
      var d = U.dist(p.x + p.w / 2, p.y + p.h / 2,
                     DS.portLock.x + DS.portLock.w / 2, DS.portLock.y + DS.portLock.h / 2);
      if (d > 210) {
        DS.setLayer(T.PHYS);
        DS.portLock = null;
        CV.HUD.toast('ANCHOR LOST — EJECTED');
      }
    }
  };

  /* --------------------------------------------------------------------------
     Rendering hooks. The layer crossfade draws the *other* layer's terrain
     underneath at falling opacity, so a shift reads as one place being re-read
     rather than two places being swapped.
     -------------------------------------------------------------------------- */
  DS.renderTerrain = function (ctx, cam, room) {
    if (DS.transition > 0.01) {
      var other = DS.layer === T.PHYS ? T.DATA : T.PHYS;
      ctx.globalAlpha = DS.transition * 0.8;
      ctx.drawImage(room.bake(other), -cam.rx() | 0, -cam.ry() | 0);
      ctx.globalAlpha = 1;
    }
    room.render(ctx, cam, DS.layer);
  };

  /* Overlay drawn above the gameplay layer while in the Data Sphere. */
  DS.renderOverlay = function (ctx, cam, room) {
    if (DS.layer !== T.DATA && DS.reveal <= 0) return;

    var alpha = DS.layer === T.DATA ? 1 : U.clamp(DS.reveal, 0, 1) * 0.7;

    /* Grid: the room's coordinate system made visible. */
    if (DS.layer === T.DATA) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = C.cyan;
      ctx.lineWidth = 1;
      var ox = -(cam.rx() % 32), oy = -(cam.ry() % 32);
      ctx.beginPath();
      for (var x = ox; x < CV.W; x += 32) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, CV.H); }
      for (var y = oy; y < CV.H; y += 32) { ctx.moveTo(0, y + .5); ctx.lineTo(CV.W, y + .5); }
      ctx.stroke();
      ctx.restore();

      /* A scan bar sweeping the room, like a CRT refresh you can see. */
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = C.cyan;
      var sy = ((DS.time * 70) % (CV.H + 80)) - 40;
      ctx.fillRect(0, sy, CV.W, 14);
      ctx.restore();
    }

    /* Reveal pulse: outline every concealed data-wall and data-floor on screen. */
    if (DS.reveal > 0 || DS.layer === T.DATA) {
      ctx.save();
      ctx.globalAlpha = alpha * (0.35 + Math.sin(DS.time * 5) * 0.12);
      ctx.strokeStyle = C.cyanGlow;
      ctx.lineWidth = 1;
      var t0x = Math.max(0, Math.floor(cam.x / 16)), t1x = Math.min(room.w - 1, t0x + 33);
      var t0y = Math.max(0, Math.floor(cam.y / 16)), t1y = Math.min(room.h - 1, t0y + 19);
      for (var ty = t0y; ty <= t1y; ty++) {
        for (var tx = t0x; tx <= t1x; tx++) {
          var id = T.def(room.at(tx, ty)).id;
          if (id !== 'dataWall' && id !== 'dataFloor') continue;
          ctx.strokeRect(tx * 16 - cam.rx() + .5, ty * 16 - cam.ry() + .5, 15, 15);
        }
      }
      ctx.restore();
    }
  };

  /* Small persistent HUD cue: which reading of the world you are standing in. */
  DS.renderIndicator = function (ctx) {
    if (DS.layer !== T.DATA) return;
    var w = 76;
    ctx.save();
    ctx.globalAlpha = 0.85;
    G.panel(ctx, CV.W - w - 6, 6, w, 13, C.cyan, .6);
    G.text(ctx, 'DATA SPHERE', CV.W - w - 1, 9, C.cyanGlow, 1);
    ctx.restore();
  };

})(window.CV = window.CV || {});
