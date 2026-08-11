/* CYBERVANIA — bosses/bosses.js
   Six bosses, each with its own arena, phases, one new gameplay idea, and a story
   function (WORLD_DESIGN §5). None of them is "a big enemy with more HP": WARDEN-9
   fights in formal rounds, THE COMPILER builds the arena around you, ASSEMBLY PRIME
   is the production line, THE ARCHIVIST forces layer-swapping mid-fight, NULL is you,
   and ATLAS stops fighting in its last phase. */
(function (CV) {
  'use strict';

  var U = CV.Util, C = CV.Palette.c, FX = CV.FX, G = CV.Gfx, S = CV.Sprites, TS = 16;
  var B = CV.Bosses = {};

  B.current = null;
  B.defs = {};
  B.introTimer = 0;
  B.outroTimer = 0;

  function def(o) { B.defs[o.id] = o; return o; }

  /* Arm a boss placed in the room. It stays dormant until the player walks in. */
  B.arm = function (obj) {
    var d = B.defs[obj.def.boss];
    if (!d) return;
    B.current = {
      def: d, id: d.id,
      x: obj.x + obj.w / 2, y: obj.y + obj.h,
      homeX: obj.x + obj.w / 2, homeY: obj.y + obj.h,
      w: d.w, h: d.h,
      vx: 0, vy: 0, facing: -1,
      hp: d.hp, maxHp: d.hp,
      phase: 0, state: 0, timer: 1.2, t: 0,
      flash: 0, invuln: 1.0, active: false, defeated: false,
      parts: [], data: {}, shakeOnHit: 0
    };
    if (d.init) d.init(B.current);
  };

  B.clear = function () { B.current = null; };

  B.update = function (dt, room) {
    var b = B.current;
    if (!b) return;
    b.t += dt;
    b.flash = Math.max(0, b.flash - dt * 6);
    b.invuln = Math.max(0, b.invuln - dt);

    if (!b.active) {
      /* Wake when the player commits to the arena. */
      if (Math.abs(CV.Player.x - b.x) < CV.W * 0.45 && !CV.DialogUI.active) {
        b.active = true;
        B.introTimer = 2.2;
        CV.Audio.setRegion('boss');
        CV.HUD.bossName = b.def.name;
        if (b.def.intro) {
          var sc = CV.Dialogue.get(b.def.intro);
          if (sc) CV.DialogUI.play(sc);
        }
      }
      return;
    }

    if (b.defeated) {
      B.outroTimer -= dt;
      b.y += 20 * dt;
      if (CV.rngFX.chance(dt * 14)) {
        FX.sparks(b.x + CV.rng.range(-b.w / 2, b.w / 2),
                  b.y - CV.rng.range(0, b.h), 6, C.amber, 6.283, 160);
      }
      if (B.outroTimer <= 0) finish(b);
      return;
    }

    if (B.introTimer > 0) { B.introTimer -= dt; return; }
    if (CV.DialogUI.active && !b.def.fightsDuringDialogue) return;

    b.def.ai(b, dt, room);
  };

  function finish(b) {
    CV.State.setFlag('boss:' + b.id, 1);
    CV.State.bosses.push(b.id);
    CV.HUD.bossName = null;
    CV.PostFX.whiteFlash(0.6, C.white);
    CV.Engine.addTrauma(0.8);
    CV.Audio.setRegion(CV.World.room.music || CV.World.regionId);
    B.current = null;
    CV.Save.autosave();
    if (b.def.outro) {
      var sc = CV.Dialogue.get(b.def.outro);
      if (sc) CV.Engine.after(0.8, function () { CV.DialogUI.play(sc); });
    }
    /* Reload the room so gated rewards (the frame pickup in the arena) appear. */
    CV.Engine.after(0.2, function () {
      var r = CV.World.room;
      CV.World.load(r.id, null, { x: CV.Player.x, y: CV.Player.y });
    });
  }

  B.damage = function (b, amount, dir, opts) {
    if (b.invuln > 0 || b.defeated) {
      FX.sparks(b.x + dir * b.w / 2, b.y - b.h / 2, 6, C.chromeLit, 3, 120);
      CV.Audio.sfx('block');
      return false;
    }
    b.hp -= amount;
    b.flash = 1;
    FX.hitBurst(b.x + dir * 6, b.y - b.h / 2, dir, b.def.color);
    CV.Combat.popDamage(b.x, b.y - b.h - 6, amount, amount >= 20);
    if (opts && opts.corrupt && b.def.corruptible !== false) b.data.corrupt = 2;
    if (b.hp <= 0) {
      b.hp = 0;
      b.defeated = true;
      B.outroTimer = 2.4;
      CV.Engine.addHitstop(0.18);
      CV.Engine.addTrauma(1);
      CV.PostFX.pulse(1, 0.8);
      CV.Audio.sfx('bossDown');
      CV.Audio.duck(2.4);
    }
    return true;
  };

  B.hitBox = function (x, y, w, h, dmg, dir, opts) {
    var b = B.current;
    if (!b || !b.active || b.defeated) return false;
    /* Multi-part bosses expose specific weak points. */
    if (b.parts.length) {
      var any = false;
      for (var i = 0; i < b.parts.length; i++) {
        var p = b.parts[i];
        if (p.dead || !p.vulnerable) continue;
        if (U.rectsOverlap(x, y, w, h, b.x + p.ox - p.w / 2, b.y + p.oy - p.h, p.w, p.h)) {
          if (B.damage(b, dmg, dir, opts)) any = true;
        }
      }
      if (any) return true;
    }
    if (U.rectsOverlap(x, y, w, h, b.x - b.w / 2, b.y - b.h, b.w, b.h)) {
      return B.damage(b, dmg, dir, opts);
    }
    return false;
  };

  B.hitRadial = function (cx, cy, r, dmg, opts) {
    var b = B.current;
    if (!b || !b.active || b.defeated) return false;
    if (U.dist2(cx, cy, b.x, b.y - b.h / 2) <= r * r) return B.damage(b, dmg, 1, opts);
    return false;
  };

  /* Shared: contact damage from the boss body. */
  function contact(b, dmg) {
    var p = CV.Player;
    if (p.dead || p.invuln > 0 || p.frame.contactImmune) return;
    if (U.rectsOverlap(p.x, p.y, p.w, p.h, b.x - b.w / 2, b.y - b.h, b.w, b.h)) {
      p.hurt(dmg, U.sign(p.x + p.w / 2 - b.x) || 1);
    }
  }

  function phaseAt(b, fracs) {
    var f = b.hp / b.maxHp;
    for (var i = 0; i < fracs.length; i++) if (f <= fracs[i]) return i + 1;
    return 0;
  }

  /* =========================================================================
     WARDEN-9 — Neon City. Fights in rounds, and formally re-issues its order
     between them. Teaches vertical dodging on a slick floor.
     ========================================================================= */
  def({
    id: 'warden9', name: 'WARDEN-9', color: C.magenta, w: 26, h: 32, hp: 260,
    intro: 'warden_pre', outro: 'warden_post',
    reward: 'THRUSTER VAULT',
    ai: function (b, dt, room) {
      var p = CV.Player, px = p.x + p.w / 2;
      var ph = phaseAt(b, [0.66, 0.33]);
      if (ph !== b.phase) {
        /* Between rounds it stops, becomes invulnerable, and re-issues the order. */
        b.phase = ph;
        b.state = 99; b.timer = 1.6; b.invuln = 1.7; b.vx = 0;
        CV.DialogUI.play(CV.Dialogue.get('warden_phase'));
        CV.PostFX.pulse(1, 0.5);
        FX.ring(b.x, b.y - b.h / 2, C.magenta, 260, 26);
        return;
      }

      b.facing = px < b.x ? -1 : 1;
      b.timer -= dt;

      switch (b.state) {
        case 99:
          if (b.timer <= 0) { b.state = 0; b.timer = 0.8; }
          break;

        case 0:   // reposition
          b.vx = U.approach(b.vx, U.sign(px - b.x) * (50 + b.phase * 18), 300 * dt);
          if (b.timer <= 0) {
            b.state = CV.rng.chance(0.45 + b.phase * 0.1) ? 1 : 2;
            b.timer = b.state === 1 ? 0.55 : 0.7;
            b.data.tele = 1;
          }
          break;

        case 1:   // baton charge — go over it
          b.vx *= 0.85;
          if (b.timer <= 0) {
            b.state = 11; b.timer = 0.9;
            b.vx = b.facing * (300 + b.phase * 60);
            CV.Audio.sfx('charge');
          }
          break;
        case 11:
          contact(b, 2);
          if (CV.rngFX.chance(dt * 20)) FX.trail(b.x, b.y - 6, C.magenta, .3, 2);
          if (b.timer <= 0 || (b.wallHit)) { b.state = 0; b.timer = 0.9; b.vx *= .2; }
          break;

        case 2:   // shield slam — shockwave along the ground, jump it
          b.vx *= 0.8;
          if (b.timer <= 0) {
            b.state = 0; b.timer = 1.1;
            CV.Engine.addTrauma(0.6);
            CV.Audio.sfx('slam');
            FX.dust(b.x, b.y, 16, 0);
            for (var s = -1; s <= 1; s += 2) {
              CV.Combat.fire(b.x + s * 14, b.y - 6, s * 210, 0, 2, true,
                             { color: C.magenta, life: 1.6, kind: 2, r: 3 });
            }
            /* Phase 3 also drops drones: the round gets a second layer. */
            if (b.phase >= 2) {
              for (var d = 0; d < 2; d++) {
                var e = CV.Enemies.spawn('drone', b.x + (d ? 40 : -40), b.y - 60);
                if (e) e.alerted = true;
              }
            }
          }
          break;
      }

      var prevX = b.x;
      b.vy += 1500 * dt;
      var body = { x: b.x - b.w / 2, y: b.y - b.h, w: b.w, h: b.h, vx: b.vx, vy: b.vy,
                   noNudge: true };
      CV.Collision.move(body, room, dt, CV.DataSphere.layer);
      b.x = body.x + b.w / 2; b.y = body.y + b.h; b.vx = body.vx; b.vy = body.vy;
      b.wallHit = body.hitX && Math.abs(b.x - prevX) < 1;
      contact(b, 2);
    },
    draw: function (ctx, b) {
      var w = b.w, h = b.h;
      ctx.scale(b.facing, 1);
      var lean = b.state === 11 ? 0.18 : 0;
      ctx.rotate(lean);
      S.plate(ctx, -8, -10, 6, 10, C.steelDark);
      S.plate(ctx, 2, -10, 6, 10, C.steelDark);
      S.ink(ctx, -w / 2, -h + 4, w, h - 12);
      S.plate(ctx, -w / 2, -h + 4, w, h - 12, C.steel, C.steelLit, C.steelDark);
      ctx.fillStyle = CV.Palette.alpha(C.magenta, .6);
      ctx.fillRect(-w / 2 + 3, -h + 10, w - 6, 2);
      S.ink(ctx, -6, -h - 2, 12, 7);
      S.plate(ctx, -6, -h - 2, 12, 7, C.steelDark);
      S.optic(ctx, -4, -h + 1, 9, 3, b.state === 11 ? C.red : C.magenta);
      // riot shield
      ctx.fillStyle = CV.Palette.alpha(C.magenta, .22);
      ctx.fillRect(w / 2 - 2, -h + 2, 5, h - 4);
      ctx.fillStyle = C.magenta;
      ctx.fillRect(w / 2 + 2, -h + 2, 1, h - 4);
      G.glow(ctx, 0, -h / 2, 40, C.magenta, .35);
    }
  });

  /* =========================================================================
     THE COMPILER — Old Network. Never attacks you. It builds the arena.
     You win by breaking its build order.
     ========================================================================= */
  def({
    id: 'compiler', name: 'THE COMPILER', color: C.green, w: 28, h: 28, hp: 300,
    outro: 'compiler_post', reward: 'BULWARK FRAME',
    init: function (b) { b.data.blocks = []; b.data.exposed = 0; },
    ai: function (b, dt, room) {
      var p = CV.Player;
      b.phase = phaseAt(b, [0.6, 0.3]);
      b.timer -= dt;
      b.invuln = b.data.exposed > 0 ? 0 : 0.05;    // only vulnerable while compiling

      /* Hovers to a lattice position; it is a build head, not a fighter. */
      var tx = b.homeX + Math.sin(b.t * 0.6) * 90;
      var ty = b.homeY - 90 + Math.cos(b.t * 0.9) * 26;
      b.x = U.damp(b.x, tx, 2, dt);
      b.y = U.damp(b.y, ty, 2, dt);

      if (b.data.exposed > 0) {
        b.data.exposed -= dt;
        if (b.data.exposed <= 0) b.timer = 1.0;
        return;
      }

      if (b.timer <= 0) {
        b.timer = Math.max(0.55, 1.6 - b.phase * 0.35);
        var pick = CV.rng.int(0, 2 + (b.phase > 0 ? 1 : 0));
        if (pick === 0) {
          /* Compile a platform under the player and turrets on it. */
          var bx = Math.floor((p.x + p.w / 2) / TS) - 2;
          var by = Math.floor((p.y + p.h) / TS) + 3;
          spawnBlocks(b, room, bx, by, 5, 1, '=');
          CV.Audio.sfx('compile');
        } else if (pick === 1) {
          /* Compile walls either side: it is boxing you in. */
          var wx = Math.floor((p.x + p.w / 2) / TS) + CV.rng.pick([-5, 5]);
          var wy = Math.floor((p.y + p.h) / TS) - 4;
          spawnBlocks(b, room, wx, wy, 1, 5, '#');
          CV.Audio.sfx('compile');
        } else if (pick === 2) {
          /* Falling build blocks, telegraphed by a marker line. */
          for (var i = 0; i < 3 + b.phase; i++) {
            var fx = p.x + p.w / 2 + CV.rng.range(-100, 100);
            CV.Combat.fire(fx, b.y - 40, 0, 200, 2, true,
                           { color: C.green, life: 2.4, r: 3 });
          }
          CV.Audio.sfx('enemyShoot');
        } else {
          /* Compile a turret. The arena grows teeth. */
          var e = CV.Enemies.spawn('turret', p.x + CV.rng.range(-140, 140), p.y + p.h);
          if (e) { e.alerted = true; FX.ring(e.x, e.y - 8, C.green, 150, 14); }
        }
        /* After each build it must flush: a 1.4s window where it is vulnerable. */
        b.data.exposed = 1.4;
        FX.ring(b.x, b.y - b.h / 2, C.green, 200, 20);
        CV.PostFX.pulse(0.5, 0.2);
      }

      /* Decay compiled geometry so the arena does not silt up. */
      for (var k = b.data.blocks.length - 1; k >= 0; k--) {
        var blk = b.data.blocks[k];
        blk.t -= dt;
        if (blk.t <= 0) {
          room.set(blk.x, blk.y, ' ');
          FX.sparks(blk.x * TS + 8, blk.y * TS + 8, 3, C.green, 6.283, 80);
          b.data.blocks.splice(k, 1);
        }
      }
      contact(b, 2);
    },
    onLeave: function (b, room) {
      for (var k = 0; k < b.data.blocks.length; k++) {
        room.set(b.data.blocks[k].x, b.data.blocks[k].y, ' ');
      }
    },
    draw: function (ctx, b) {
      var s = b.w / 2;
      var exposed = b.data.exposed > 0;
      ctx.rotate(Math.sin(b.t * 0.7) * 0.12);
      ctx.strokeStyle = exposed ? C.amber : C.green;
      ctx.lineWidth = 1;
      for (var r = 0; r < 3; r++) {
        var rr = s - r * 4;
        ctx.save(); ctx.rotate(b.t * (r % 2 ? -0.8 : 0.8) + r);
        ctx.strokeRect(-rr, -b.h / 2 - rr / 2, rr * 2, rr * 2);
        ctx.restore();
      }
      ctx.fillStyle = exposed ? C.amber : '#0d2018';
      ctx.fillRect(-6, -b.h / 2 - 6, 12, 12);
      ctx.fillStyle = exposed ? C.white : C.green;
      ctx.fillRect(-2, -b.h / 2 - 2, 4, 4);
      G.glow(ctx, 0, -b.h / 2, 44, exposed ? C.amber : C.green, exposed ? .7 : .35);
    }
  });

  function spawnBlocks(b, room, bx, by, w, h, ch) {
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var tx = bx + x, ty = by + y;
        if (tx < 1 || ty < 1 || tx >= room.w - 1 || ty >= room.h - 1) continue;
        if (room.at(tx, ty) !== ' ') continue;
        room.set(tx, ty, ch);
        b.data.blocks.push({ x: tx, y: ty, t: 6 });
        FX.sparks(tx * TS + 8, ty * TS + 8, 3, C.green, 6.283, 60);
      }
    }
  }

  /* =========================================================================
     ASSEMBLY PRIME — Factory. The production line itself. Four arms on a track;
     you fight it by using its own conveyor and its own presses.
     ========================================================================= */
  def({
    id: 'assembly', name: 'ASSEMBLY PRIME', color: '#ff6a2b', w: 40, h: 26, hp: 340,
    outro: 'assembly_post', reward: 'ARC FRAME',
    init: function (b) {
      b.parts = [
        { ox: -30, oy: -30, w: 10, h: 22, vulnerable: true, dead: false, tool: 0 },
        { ox: -10, oy: -30, w: 10, h: 22, vulnerable: true, dead: false, tool: 1 },
        { ox: 10, oy: -30, w: 10, h: 22, vulnerable: true, dead: false, tool: 2 },
        { ox: 30, oy: -30, w: 10, h: 22, vulnerable: true, dead: false, tool: 3 }
      ];
      b.data.arm = 0;
    },
    ai: function (b, dt, room) {
      var p = CV.Player, px = p.x + p.w / 2;
      b.phase = phaseAt(b, [0.6, 0.3]);
      b.timer -= dt;

      /* The gantry tracks the player along a rail — it is a machine doing its job. */
      b.x = U.damp(b.x, U.clamp(px, b.homeX - 150, b.homeX + 150), 1.6 + b.phase * .5, dt);
      b.y = b.homeY - 96 + Math.sin(b.t * 1.4) * 6;

      if (b.timer <= 0) {
        b.timer = Math.max(0.7, 1.9 - b.phase * 0.4);
        b.data.arm = (b.data.arm + 1 + CV.rng.int(0, 2)) % 4;
        var tool = b.parts[b.data.arm].tool;
        var ax = b.x + b.parts[b.data.arm].ox;

        if (tool === 0) {          // press — a column of instant-death, telegraphed
          b.data.pressX = ax; b.data.pressT = 0.8;
        } else if (tool === 1) {   // welder — a fan of sparks
          for (var i = 0; i < 5; i++) {
            var a = 0.6 + i * 0.45;
            CV.Combat.fire(ax, b.y - 8, Math.cos(a) * 150, Math.sin(a) * 150, 2, true,
                           { color: '#ff6a2b', life: 1.4 });
          }
          CV.Audio.sfx('enemyShoot');
        } else if (tool === 2) {   // magnet — drags you under the press
          b.data.pullT = 1.0;
        } else {                   // dispenser — drops crates you can stand on
          CV.Combat.fire(ax, b.y, 0, 190, 2, true, { color: C.amber, life: 2.2, r: 4 });
        }
        CV.Audio.sfx('machine');
      }

      if (b.data.pressT > 0) {
        b.data.pressT -= dt;
        if (b.data.pressT <= 0) {
          CV.Engine.addTrauma(0.7);
          CV.Audio.sfx('slam');
          FX.dust(b.data.pressX, b.homeY + 8, 20, 0);
          if (Math.abs(px - b.data.pressX) < 20 && !p.dead) {
            /* BULWARK is crush-immune: the frame that ignores this attack outright. */
            if (!p.frame.crushImmune) p.hurt(2, U.sign(px - b.data.pressX) || 1);
          }
        }
      }
      if (b.data.pullT > 0) {
        b.data.pullT -= dt;
        p.vx += U.sign(b.x - px) * 260 * dt;
      }
    },
    draw: function (ctx, b) {
      // gantry rail
      ctx.fillStyle = C.steelDark;
      ctx.fillRect(-260, -b.h - 12, 520, 5);
      S.ink(ctx, -b.w / 2, -b.h, b.w, b.h);
      S.plate(ctx, -b.w / 2, -b.h, b.w, b.h, C.steel, C.steelLit, C.steelDark);
      ctx.fillStyle = CV.Palette.alpha('#ff6a2b', .5);
      ctx.fillRect(-b.w / 2 + 2, -b.h + 3, b.w - 4, 2);
      for (var i = 0; i < b.parts.length; i++) {
        var pt = b.parts[i];
        var lit = (b.data.arm === i);
        S.plate(ctx, pt.ox - 4, pt.oy, 8, 22, lit ? '#5c3320' : C.steelDark);
        ctx.fillStyle = lit ? '#ff8a2b' : C.steel;
        ctx.fillRect(pt.ox - 5, pt.oy + 20, 10, 4);
        S.optic(ctx, pt.ox - 1, pt.oy + 4, 3, 2, lit ? C.red : C.amberDim);
      }
      S.optic(ctx, -5, -b.h + 8, 10, 4, '#ff8a2b');
      G.glow(ctx, 0, -b.h / 2, 52, '#ff6a2b', .35);
      // press telegraph
      if (b.data.pressT > 0) {
        var a = 1 - b.data.pressT / 0.8;
        ctx.fillStyle = CV.Palette.alpha(C.red, 0.15 + a * 0.35);
        ctx.fillRect(b.data.pressX - b.x - 20, -b.h, 40, 400);
      }
    }
  });

  /* =========================================================================
     THE ARCHIVIST — Server Farms. A physical body and a data body. Each is
     invulnerable while the other is intact, so the fight is layer-swapping.
     ========================================================================= */
  def({
    id: 'archivist', name: 'THE ARCHIVIST', color: C.cyan, w: 24, h: 30, hp: 380,
    intro: 'archivist_pre', outro: 'archivist_post', reward: 'CIPHER FRAME',
    init: function (b) { b.data.shellLayer = CV.Tiles.PHYS; b.data.swapT = 6; },
    ai: function (b, dt, room) {
      var p = CV.Player, layer = CV.DataSphere.layer;
      b.phase = phaseAt(b, [0.65, 0.32]);

      /* Its shell sits in one layer at a time; hitting it requires being in the
         same reading of the room that it currently occupies. */
      b.invuln = (layer === b.data.shellLayer) ? 0 : 0.05;

      b.data.swapT -= dt;
      if (b.data.swapT <= 0) {
        b.data.swapT = Math.max(3.2, 6.5 - b.phase * 1.4);
        b.data.shellLayer = b.data.shellLayer === CV.Tiles.PHYS ? CV.Tiles.DATA : CV.Tiles.PHYS;
        FX.ring(b.x, b.y - b.h / 2, C.cyan, 240, 26);
        CV.PostFX.pulse(1, 0.6);
        CV.Audio.sfx('layerSwap');
        CV.HUD.toast(b.data.shellLayer === CV.Tiles.DATA ? 'SHELL — DATA LAYER'
                                                         : 'SHELL — PHYSICAL LAYER');
      }

      b.x = U.damp(b.x, p.x + p.w / 2 + Math.sin(b.t * .8) * 70, 1.1, dt);
      b.y = U.damp(b.y, b.homeY - 70 + Math.sin(b.t * 1.1) * 24, 1.4, dt);
      b.facing = (p.x + p.w / 2) < b.x ? -1 : 1;

      b.timer -= dt;
      if (b.timer <= 0) {
        b.timer = Math.max(0.8, 2.2 - b.phase * 0.45);
        var pick = CV.rng.int(0, 2);
        if (pick === 0) {
          /* Citation barrage: quoted records, fired radially. */
          for (var i = 0; i < 8 + b.phase * 3; i++) {
            var a = i / (8 + b.phase * 3) * 6.283 + b.t;
            CV.Combat.fire(b.x, b.y - b.h / 2, Math.cos(a) * 150, Math.sin(a) * 150,
                           2, true, { color: C.cyan, life: 2.2, homing: 0.4 });
          }
        } else if (pick === 1) {
          for (var d = 0; d < 2; d++) {
            var e = CV.Enemies.spawn('daemon', b.x + (d ? 50 : -50), b.y);
            if (e) { e.alerted = true; e.layer = -1; }
          }
        } else {
          /* Index sweep — a wall of records with one gap. */
          var gap = CV.rng.int(1, 5);
          for (var k = 0; k < 7; k++) {
            if (k === gap) continue;
            CV.Combat.fire(b.x - 130 + k * 44, b.y - 120, 0, 170, 2, true,
                           { color: C.cyanGlow, life: 3, r: 3 });
          }
        }
        CV.Audio.sfx('enemyShoot');
      }
      contact(b, 2);
    },
    draw: function (ctx, b) {
      var inLayer = CV.DataSphere.layer === b.data.shellLayer;
      var col = inLayer ? C.cyan : C.steelDark;
      ctx.globalAlpha = inLayer ? 1 : 0.55;
      /* A filing column: stacked record plates rotating around a spine. */
      for (var i = 0; i < 7; i++) {
        var yy = -i * 4 - 2;
        var wob = Math.sin(b.t * 1.6 + i * 0.7) * 3;
        S.plate(ctx, -b.w / 2 + wob, yy - 4, b.w, 4,
                inLayer ? '#16303c' : '#101820', '#2b5a6b', '#0b1a22');
        ctx.fillStyle = CV.Palette.alpha(col, .5);
        ctx.fillRect(-b.w / 2 + wob + 2, yy - 3, b.w - 4, 1);
      }
      ctx.fillStyle = col;
      ctx.fillRect(-1, -b.h, 2, b.h);
      S.optic(ctx, -4, -b.h - 4, 9, 4, inLayer ? C.cyanGlow : C.steel);
      G.glow(ctx, 0, -b.h / 2, 48, col, inLayer ? .5 : .2);
      ctx.globalAlpha = 1;
      if (!inLayer) {
        G.textCentered(ctx, 'SHIFT', 0, -b.h - 18, C.cyanGlow, 1);
      }
    }
  });

  /* =========================================================================
     NULL — The Fault (secret). The part of the upload that did not make it into
     you. Fights exactly like the player, with the player's own modules.
     ========================================================================= */
  def({
    id: 'nullboss', name: 'NULL', color: C.violet, w: 12, h: 16, hp: 300,
    intro: 'null_pre', outro: 'null_post', reward: 'FRAGMENT',
    ai: function (b, dt, room) {
      var p = CV.Player, px = p.x + p.w / 2;
      b.phase = phaseAt(b, [0.6, 0.3]);
      b.facing = px < b.x ? -1 : 1;
      b.timer -= dt;

      if (b.state === 0) {
        b.vx = U.approach(b.vx, U.sign(px - b.x) * 150, 1200 * dt);
        if (b.timer <= 0) {
          b.state = CV.rng.int(1, 3);
          b.timer = 0.3;
        }
      } else if (b.state === 1) {        // mirror dash
        if (b.timer > 0.2) { b.vx *= .8; }
        else {
          b.vx = b.facing * 520;
          FX.afterimage(b.x, b.y, b.w, b.h, C.violet);
          contact(b, 2);
        }
        if (b.timer <= -0.2) { b.state = 0; b.timer = 0.7; b.vx *= .3; }
      } else if (b.state === 2) {        // mirror ranged volley
        if (b.timer <= 0) {
          for (var i = 0; i < 3; i++) {
            CV.Combat.fire(b.x, b.y - b.h / 2, b.facing * 340, -40 + i * 40, 2, true,
                           { color: C.violet, life: 1.6 });
          }
          CV.Audio.sfx('shoot');
          b.state = 0; b.timer = 0.9;
        }
      } else {                           // mirror slam
        if (b.timer > 0) { b.vy = -300; }
        else {
          b.vy = 800;
          if (b.grounded) {
            CV.Combat.radial(b.x, b.y, 60, 0, { fx: false });
            for (var s = -1; s <= 1; s += 2) {
              CV.Combat.fire(b.x + s * 10, b.y - 6, s * 230, 0, 2, true,
                             { color: C.violet, life: 1.2, kind: 2, r: 3 });
            }
            CV.Engine.addTrauma(0.5); CV.Audio.sfx('slam');
            b.state = 0; b.timer = 0.8;
          }
        }
      }

      b.vy += 1400 * dt;
      var body = { x: b.x - b.w / 2, y: b.y - b.h, w: b.w, h: b.h, vx: b.vx, vy: b.vy,
                   noNudge: true };
      CV.Collision.move(body, room, dt, CV.DataSphere.layer);
      b.x = body.x + b.w / 2; b.y = body.y + b.h;
      b.vx = body.vx; b.vy = body.vy; b.grounded = body.grounded;
      contact(b, 2);
    },
    draw: function (ctx, b) {
      /* Deliberately the player's silhouette, in the wrong colour. */
      ctx.scale(b.facing, 1);
      ctx.globalAlpha = .92;
      S.drawVector(ctx, {
        t: b.t, walk: b.t * 8, air: b.vy, facing: 1, grounded: b.grounded,
        squash: 0, state: 'idle', attackAngle: 0, power: 1, flash: 0,
        energyLow: false, optic: C.violet
      });
      ctx.globalAlpha = 1;
      G.glow(ctx, 0, -8, 26, C.violet, .45);
    }
  });

  /* =========================================================================
     ATLAS — Central System. Phase 1: it fights with the building. Phase 2: it
     uses your own modules. Phase 3: it stops, and the fight becomes surviving
     the argument.
     ========================================================================= */
  def({
    id: 'atlas', name: 'ATLAS', color: C.white, w: 44, h: 44, hp: 620,
    fightsDuringDialogue: true, reward: 'THE END',
    init: function (b) { b.data.said = {}; },
    ai: function (b, dt, room) {
      var p = CV.Player, px = p.x + p.w / 2;
      var ph = phaseAt(b, [0.68, 0.34]);
      if (ph !== b.phase) {
        b.phase = ph;
        b.invuln = 2.0;
        b.timer = 1.4;
        CV.PostFX.pulse(1, 1);
        CV.Engine.addTrauma(0.8);
        var key = ph === 0 ? 'atlas_p1' : ph === 1 ? 'atlas_p2' : 'atlas_p3';
        if (!b.data.said[key]) { b.data.said[key] = 1; CV.DialogUI.play(CV.Dialogue.get(key)); }
      }

      b.x = U.damp(b.x, b.homeX, 1, dt);
      b.y = U.damp(b.y, b.homeY - 90 + Math.sin(b.t * 0.5) * 14, 1, dt);
      b.timer -= dt;

      if (b.phase === 0) {
        /* Infrastructure. It drops the building on you. */
        if (b.timer <= 0) {
          b.timer = 1.5;
          for (var i = 0; i < 4; i++) {
            var fx = px + CV.rng.range(-150, 150);
            CV.Combat.fire(fx, b.y - 90, 0, 260, 2, true,
                           { color: C.white, life: 2.6, r: 3 });
          }
          if (CV.rng.chance(.4)) {
            for (var s = -1; s <= 1; s += 2) {
              CV.Combat.fire(b.x + s * 20, b.y, s * 240, 0, 2, true,
                             { color: C.red, life: 2.4, kind: 2, r: 3 });
            }
          }
          CV.Audio.sfx('machine');
        }
      } else if (b.phase === 1) {
        /* Mimicry. It uses R-17's kit, competently and without comment. */
        if (b.timer <= 0) {
          b.timer = 1.1;
          var mode = CV.rng.int(0, 2);
          if (mode === 0) {
            for (var k = 0; k < 10; k++) {
              var a = k / 10 * 6.283 + b.t;
              CV.Combat.fire(b.x, b.y, Math.cos(a) * 180, Math.sin(a) * 180, 2, true,
                             { color: C.white, life: 2, homing: 0.5 });
            }
          } else if (mode === 1) {
            var e = CV.Enemies.spawn('glitch', px + CV.rng.range(-80, 80), p.y);
            if (e) e.alerted = true;
          } else {
            /* A mirrored dash line straight through where you are standing. */
            var ang = Math.atan2(p.y + p.h / 2 - b.y, px - b.x);
            for (var d = 0; d < 5; d++) {
              CV.Combat.fire(b.x, b.y, Math.cos(ang) * (260 + d * 40),
                             Math.sin(ang) * (260 + d * 40), 2, true,
                             { color: C.cyan, life: 1.6, r: 2 });
            }
          }
          CV.Audio.sfx('enemyShoot');
        }
      } else {
        /* It stops attacking and talks. Surviving means staying alive through
           the argument, and the argument is the boss. */
        if (b.timer <= 0) {
          b.timer = 2.4;
          var gap = CV.rng.int(0, 6);
          for (var w = 0; w < 7; w++) {
            if (w === gap) continue;
            CV.Combat.fire(b.homeX - 140 + w * 46, b.y - 120, 0, 130, 2, true,
                           { color: CV.Palette.alpha(C.white, .9), life: 4, r: 3 });
          }
        }
        if (!b.data.answered && b.hp < b.maxHp * 0.12) {
          b.data.answered = 1;
          CV.DialogUI.play(CV.Dialogue.get('atlas_answer'));
        }
      }
      contact(b, 2);
    },
    draw: function (ctx, b) {
      var r = b.w / 2;
      /* No face, no body: concentric machined rings around an aperture. */
      for (var i = 0; i < 5; i++) {
        var rr = r - i * 3.5;
        ctx.save();
        ctx.translate(0, -b.h / 2);
        ctx.rotate(b.t * (i % 2 ? -0.3 : 0.3) * (1 + b.phase * .5));
        ctx.strokeStyle = CV.Palette.alpha(i === 0 ? C.white : C.chrome, .8 - i * .1);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var k = 0; k <= 8; k++) {
          var a = k / 8 * 6.283;
          k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
            : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = b.phase === 2 ? C.red : C.white;
      ctx.beginPath(); ctx.arc(0, -b.h / 2, 5 + Math.sin(b.t * 2) * 1.2, 0, 6.283); ctx.fill();
      G.glow(ctx, 0, -b.h / 2, 70, b.phase === 2 ? C.red : C.white, .4);
    }
  });

  /* ------------------------------------------------------------------------- */
  B.render = function (ctx, cam) {
    var b = B.current;
    if (!b) return;
    if (!cam.visible(b.x - b.w * 2, b.y - b.h * 3, b.w * 4, b.h * 4, 200)) return;
    ctx.save();
    ctx.translate((b.x - cam.rx()) | 0, (b.y - cam.ry()) | 0);
    if (b.defeated) {
      ctx.globalAlpha = U.clamp(B.outroTimer / 2.4, 0, 1);
      ctx.translate(Math.round(U.noise1(b.t * 30) * 3), 0);
    }
    b.def.draw(ctx, b);
    if (b.flash > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = Math.min(1, b.flash);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-b.w * 2, -b.h * 2, b.w * 4, b.h * 4);
    }
    ctx.restore();
  };

})(window.CV = window.CV || {});
