/* CYBERVANIA — player/player.js
   R-17. Movement first (rule 46): coyote time, jump buffering, variable jump height,
   corner correction, dash buffering, wall mechanics, and a hard rule that movement is
   never energy-gated. Every physical constant is read from the active frame, so a
   transformation swap re-tunes the whole controller in one assignment. */
(function (CV) {
  'use strict';

  var U = CV.Util, C = CV.Palette.c, FX = CV.FX, In = CV.Input, TS = 16;

  var P = CV.Player = {
    x: 0, y: 0, w: 10, h: 14, vx: 0, vy: 0,
    facing: 1, grounded: false, wasGrounded: false, wallDir: 0, ceiling: false,
    conveyor: 0, carryVx: 0,

    frameId: 'vector', frame: null,
    hp: 4, maxHp: 4, energy: 100, energyTimer: 0,

    coyote: 0, jumpsUsed: 0, dashesUsed: 0,
    dashTimer: 0, dashCd: 0, dashDirX: 0, dashDirY: 0,
    invuln: 0, flash: 0, dead: false, deadTimer: 0,
    clinging: false, sliding: false, gliding: false, slamming: false,
    lookUp: false, lookDown: false,

    atkState: 0,          // 0 idle, 1 windup, 2 active, 3 recover
    atkTimer: 0, atkIndex: 0, atkComboTimer: 0, atkHit: false, atkAngle: 0,
    grapple: null,        // {x,y,state,t}
    morph: 0,
    walkPhase: 0, squash: 0, t: 0,
    activeModule: null,
    overclock: 0, droneAngle: 0, droneX: 0, droneY: 0, droneCd: 0,
    corruptAura: 0,
    dataPlatforms: []
  };

  /* ===========================================================================
     SETUP
     =========================================================================== */

  P.init = function () {
    P.setFrame('vector', true);
    P.hp = P.maxHp;
    P.energy = P.maxEnergy();
    P.dead = false;
  };

  P.setFrame = function (id, instant) {
    var def = CV.Frames.get(id);
    if (!def) return;
    if (P.frame && P.frame.id === id) return;
    if (!instant && !CV.State.hasFrame(id)) return;

    /* Grow/shrink around the feet so a swap never clips you into the floor. */
    var footY = P.y + P.h, cx = P.x + P.w / 2;
    var prev = P.frame;
    P.frameId = id;
    P.frame = def;
    P.w = def.w; P.h = def.h;
    P.x = cx - P.w / 2; P.y = footY - P.h;

    /* Energy is carried proportionally: swapping frames should be a tactical
       choice, not a full refill exploit. */
    if (prev && !instant) {
      var frac = P.energy / Math.max(1, maxEnergyFor(prev));
      P.energy = frac * P.maxEnergy();
    } else {
      P.energy = P.maxEnergy();
    }

    if (!instant) {
      P.morph = 0.25;
      P.invuln = Math.max(P.invuln, 0.30);   // the swap itself is a movement tool
      CV.Audio.sfx('morph');
      CV.PostFX.pulse(0.7, 0.35);
      FX.ring(cx, footY - P.h / 2, def.color, 170, 20);
      CV.Engine.addTrauma(0.15);
    }

    if (CV.World.room) CV.Collision.resolveOverlap(P, CV.World.room, CV.DataSphere.layer);
  };

  function maxEnergyFor(def) {
    var m = def.maxEnergy + CV.State.capacitors * 10;
    if (CV.State.hasAugment('reservoir')) m *= 1.5;
    if (CV.State.hasAugment('flywheel')) m *= 0.75;
    return Math.round(m);
  }

  P.maxEnergy = function () { return maxEnergyFor(P.frame); };

  P.regenRate = function () {
    var r = P.frame.regen;
    if (CV.State.hasAugment('flywheel')) r *= 1.6;
    if (CV.State.hasAugment('reservoir')) r *= 0.6;
    if (CV.State.hasAugment('kinetic')) r += Math.abs(P.vx) / 12;
    if (CV.State.hasAugment('deadman') && P.hp <= 1) r *= 1.5;
    return r;
  };

  P.addEnergy = function (n) {
    P.energy = U.clamp(P.energy + n, 0, P.maxEnergy());
  };

  P.spend = function (n) {
    if (CV.Settings.assistEnergy) return true;
    if (P.energy < n) { CV.Audio.sfx('deny'); CV.HUD.flashEnergy(); return false; }
    P.energy -= n;
    P.energyTimer = P.frame.regenDelay;
    return true;
  };

  P.damageMul = function () {
    var m = 1;
    if (CV.State.hasAugment('ledger')) m *= 0.85;
    if (CV.State.hasAugment('deadman') && P.hp <= 1) m *= 2;
    if (CV.State.hasAugment('overflow') && P.energy > P.maxEnergy() * 0.9) m *= 1.25;
    if (P.overclock > 0 && P.frameId === 'bulwark') m *= 2;
    return m;
  };

  /* ===========================================================================
     UPDATE
     =========================================================================== */

  P.update = function (dt, room) {
    P.t += dt;
    var f = P.frame, layer = CV.DataSphere.layer;

    if (P.dead) { updateDead(dt); return; }

    P.flash = Math.max(0, P.flash - dt * 6);
    P.invuln = Math.max(0, P.invuln - dt);
    P.dashCd = Math.max(0, P.dashCd - dt);
    P.morph = Math.max(0, P.morph - dt);
    P.squash = U.approach(P.squash, 0, dt * 6);
    P.atkComboTimer = Math.max(0, P.atkComboTimer - dt);
    if (P.overclock > 0) {
      P.overclock -= dt / Math.max(0.05, CV.Engine.timeScale);
      if (P.overclock <= 0) CV.Engine.timeScale = 1;
    }

    var locked = CV.DialogUI.active || CV.Menu.open_ || CV.Terminal.open_;
    var ix = locked ? 0 : In.axisX();
    P.lookUp = !locked && In.held('up') && P.grounded && Math.abs(P.vx) < 20;
    P.lookDown = !locked && In.held('down') && P.grounded && Math.abs(P.vx) < 20;

    if (!locked) {
      handleFrameSwap();
      handleModuleSelect();
    }

    /* --- horizontal ------------------------------------------------------- */
    if (P.dashTimer <= 0 && !P.grappling()) {
      var target = ix * f.runSpeed;
      var a = P.grounded ? (ix !== 0 ? f.accel : f.friction)
                         : (ix !== 0 ? f.airAccel : f.airFriction);
      /* Attacking on the ground plants your feet — it should cost commitment. */
      if (P.atkState > 0 && P.grounded && !f.attack.ranged) a *= 0.35;
      P.vx = U.approach(P.vx, target, a * dt);
      if (ix !== 0) P.facing = ix;
    }

    /* --- wall interaction --------------------------------------------------- */
    var wallCling = CV.State.hasModule('wallcling');
    P.sliding = false; P.clinging = false;
    if (!P.grounded && P.wallDir !== 0 && P.vy > 0 && P.dashTimer <= 0) {
      var pushing = (ix === P.wallDir);
      if (f.canWallJump || wallCling) {
        if (wallCling && pushing) {
          P.clinging = true;
          P.vy = (f.canClimb && In.held('up')) ? -46 : (In.held('down') ? 90 : 0);
          if (f.id === 'arc') P.dashesUsed = 0;   // Arc refreshes its dash on a wall
        } else if (f.canWallJump) {
          P.sliding = true;
          P.vy = Math.min(P.vy, f.wallSlide);
          if (CV.rngFX.chance(0.25)) {
            FX.emit(P.x + (P.wallDir > 0 ? P.w : 0), P.y + P.h * .6,
                    -P.wallDir * 20, -12, .25, '#8d99aa', 1, { grav: 60 });
          }
        }
      }
    }

    /* --- jump -------------------------------------------------------------- */
    if (P.grounded) { P.coyote = f.coyote; P.jumpsUsed = 0; P.dashesUsed = 0; }
    else P.coyote = Math.max(0, P.coyote - dt);

    if (!locked && In.buffered('jump')) {
      var canGround = P.coyote > 0 && P.jumpsUsed === 0;
      var canWall = (P.sliding || P.clinging) && f.canWallJump;
      var maxJumps = CV.State.hasModule('doublejump') ? 2 : 1;
      var canAir = !P.grounded && P.jumpsUsed < maxJumps && P.coyote <= 0;

      if (canWall) {
        In.consume('jump');
        P.vx = -P.wallDir * f.wallJumpX;
        P.vy = f.wallJumpY;
        P.facing = -P.wallDir;
        P.jumpsUsed = Math.max(0, P.jumpsUsed - 1);
        P.coyote = 0;
        FX.dust(P.x + P.w / 2, P.y + P.h, 6, -P.wallDir);
        CV.Audio.sfx('jump');
      } else if (canGround) {
        In.consume('jump');
        doJump(1);
      } else if (canAir) {
        In.consume('jump');
        doJump(P.jumpsUsed === 0 ? 1 : (f.id === 'bulwark' ? 0.72 : 1));
        FX.ring(P.x + P.w / 2, P.y + P.h, f.color, 90, 10);
        /* CIPHER's second jump leaves a solid data-platform behind. */
        if (f.id === 'cipher' && P.jumpsUsed >= 1) {
          P.dataPlatforms.push({ x: P.x + P.w / 2, y: P.y + P.h + 2, t: 2 });
        }
      }
    }

    /* Variable jump height: releasing early cuts upward velocity. */
    if (!locked && In.released('jump') && P.vy < 0) P.vy *= f.jumpCut;

    /* --- glide (ARC) -------------------------------------------------------- */
    P.gliding = false;
    if (f.glide && !P.grounded && P.vy > 0 && !locked && In.held('jump') && P.dashTimer <= 0) {
      P.gliding = true;
      P.vy = Math.min(P.vy, f.glideFall);
      P.vx = U.approach(P.vx, ix * (f.runSpeed + f.glideDrift), f.airAccel * 1.4 * dt);
      if (CV.rngFX.chance(.4)) FX.trail(P.x + P.w / 2, P.y + P.h, f.color, .2, 1);
    }

    /* --- dash --------------------------------------------------------------- */
    if (P.dashTimer > 0) {
      P.dashTimer -= dt;
      P.vx = P.dashDirX * f.dashSpeed;
      P.vy = P.dashDirY * f.dashSpeed * 0.75;
      if (P.invuln < f.dashIFrames) P.invuln = Math.max(P.invuln, f.dashIFrames * (P.dashTimer / f.dashTime));
      FX.afterimage(P.x + P.w / 2, P.y + P.h, P.w, P.h, f.color);
      if (f.dashDamage) {
        CV.Combat.playerHitbox(P.x - 2, P.y, P.w + 4, P.h, f.dashDamage * P.damageMul(),
                               P.dashDirX || P.facing,
                               { knockback: 220, hitstop: .07, shake: .2, whiff: false });
      }
      if (P.dashTimer <= 0) {
        if (!f.dashKeepsMomentum) { P.vx *= 0.55; P.vy *= 0.3; }
        else P.vx *= 0.92;
      }
    } else if (!locked && In.buffered('dash') && CV.State.hasModule('dash') && P.dashCd <= 0) {
      var maxDash = f.airDashes;
      if (P.grounded || P.dashesUsed < maxDash) {
        In.consume('dash');
        if (!P.grounded) P.dashesUsed++;
        startDash(ix);
      }
    }

    /* --- attack -------------------------------------------------------------- */
    updateAttack(dt, locked);

    /* --- slam ---------------------------------------------------------------- */
    if (P.slamming) {
      P.vy = 760;
      P.vx *= 0.90;
      FX.trail(P.x + P.w / 2, P.y + P.h, f.color, .18, 2);
      if (P.grounded) endSlam(room);
    } else if (!locked && !P.grounded && In.held('down') && In.buffered('attack') &&
               CV.State.hasModule('slam') && P.atkState === 0) {
      In.consume('attack');
      if (P.spend(CV.Modules.cost('slam', f))) {
        P.slamming = true;
        P.vy = 200;
        CV.Audio.sfx('slamStart');
      }
    }

    /* --- grapple ------------------------------------------------------------- */
    updateGrapple(dt, room, layer, locked);

    /* --- active module ------------------------------------------------------- */
    if (!locked && In.buffered('special')) { In.consume('special'); useActiveModule(room); }

    /* --- data shift ---------------------------------------------------------- */
    if (!locked && In.pressed('shift')) CV.DataSphere.tryShift();

    /* --- passive modules ------------------------------------------------------ */
    updatePassives(dt, room);

    /* --- gravity + integration ------------------------------------------------ */
    if (P.dashTimer <= 0 && !P.clinging && !P.grappling()) {
      var g = f.gravity;
      /* Lower gravity near the apex makes floaty control feel deliberate rather
         than sloppy — a standard but essential platformer trick. */
      if (Math.abs(P.vy) < 60 && !P.grounded) g *= 0.78;
      if (P.gliding) g *= 0.2;
      P.vy = Math.min(P.vy + g * dt, P.slamming ? 900 : f.fallMax);
    }

    if (P.conveyor) P.vx += P.conveyor * 90 * dt * (P.grounded ? 1 : 0);

    P.wasGrounded = P.grounded;
    P.dropThrough = !locked && In.held('down') && In.buffered('jump') && P.grounded;
    if (P.dropThrough) In.consume('jump');

    CV.Collision.move(P, room, dt, layer);

    /* Landing feedback — squash, dust and a sound scaled by impact speed. */
    if (P.grounded && !P.wasGrounded) {
      var force = U.clamp(Math.abs(P.vyPrev || 0) / f.fallMax, 0, 1);
      P.squash = 0.35 + force * 0.5;
      FX.land(P.x + P.w / 2, P.y + P.h, force);
      if (force > 0.25) { CV.Audio.sfx('land'); CV.Engine.addTrauma(force * 0.14); }
    }
    P.vyPrev = P.vy;

    /* --- hazards -------------------------------------------------------------- */
    if (CV.Collision.hazardHit(P, room, layer) && P.invuln <= 0) {
      P.hurt(1, -U.sign(P.vx) || 1, true);
    }

    /* --- energy --------------------------------------------------------------- */
    P.energyTimer = Math.max(0, P.energyTimer - dt);
    if (f.id === 'cipher') {
      if (layer === CV.Tiles.DATA) P.addEnergy(f.dataRegen * dt);
      else if (!CV.State.hasAugment('resonance')) {
        P.energy = Math.max(0, P.energy - f.drain * dt);
        /* Running dry as Cipher forces you back to Vector — the frame's honest cost. */
        if (P.energy <= 0 && CV.State.hasFrame('vector')) {
          P.setFrame('vector');
          CV.HUD.toast('CIPHER UNSTABLE — REVERTING');
        }
      }
    } else if (P.energyTimer <= 0) {
      P.addEnergy(P.regenRate() * dt);
    }

    /* --- animation ------------------------------------------------------------ */
    if (P.grounded && Math.abs(P.vx) > 12) P.walkPhase += dt * (6 + Math.abs(P.vx) / 22);
    else P.walkPhase = U.damp(P.walkPhase, Math.round(P.walkPhase / 3.14159) * 3.14159, 8, dt);

    for (var i = P.dataPlatforms.length - 1; i >= 0; i--) {
      P.dataPlatforms[i].t -= dt;
      if (P.dataPlatforms[i].t <= 0) P.dataPlatforms.splice(i, 1);
    }
  };

  function doJump(scale) {
    P.vy = P.frame.jumpVel * -scale;
    P.grounded = false;
    P.coyote = 0;
    P.jumpsUsed++;
    P.squash = -0.3;
    FX.dust(P.x + P.w / 2, P.y + P.h, 5, 0);
    CV.Audio.sfx('jump');
  }

  function startDash(ix) {
    var f = P.frame;
    var dy = In.held('up') ? -1 : (In.held('down') && !P.grounded ? 1 : 0);
    var dx = ix !== 0 ? ix : (dy !== 0 ? 0 : P.facing);
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    P.dashDirX = dx / len; P.dashDirY = dy / len;
    P.dashTimer = f.dashTime;
    P.dashCd = f.dashCooldown;
    P.slamming = false;
    if (dx !== 0) P.facing = U.sign(dx);
    CV.Audio.sfx('dash');
    CV.Engine.addTrauma(0.09);
    FX.ring(P.x + P.w / 2, P.y + P.h / 2, f.color, 110, 10);
    /* Bulwark's Polarity Core turns the charge into a projectile sweeper. */
    if (f.id === 'bulwark' && CV.State.hasModule('magnet')) {
      CV.Combat.reflectNear(P.x + P.w / 2, P.y + P.h / 2, 48);
    }
  }

  function endSlam(room) {
    P.slamming = false;
    var f = P.frame;
    var cx = P.x + P.w / 2, cy = P.y + P.h;
    var radius = f.id === 'bulwark' ? 58 : f.id === 'arc' ? 22 : 38;
    var dmg = (f.id === 'bulwark' ? 26 : 10) * P.damageMul();

    CV.Combat.radial(cx, cy, radius, dmg, {
      knockback: 190, stun: f.id === 'bulwark' ? 1.6 : 0.5,
      hitstop: 0.09, color: f.color, shake: f.id === 'bulwark' ? 0.5 : 0.25
    });
    FX.land(cx, cy, 1);
    FX.dust(cx, cy, 14, 0);
    CV.Audio.sfx('slam');
    P.squash = 0.7;

    /* Only BULWARK opens reinforced plating — the game's biggest retroactive gate. */
    if (f.canSlamBreak) {
      var tx = Math.floor(cx / TS), ty = Math.floor((cy + 4) / TS);
      if (room.breakAt(tx, ty)) {
        CV.Audio.sfx('break');
        CV.Engine.addTrauma(0.6);
        CV.PostFX.pulse(0.8, 0.3);
      }
    }
    if (f.id === 'cipher' && CV.DataSphere.layer === CV.Tiles.DATA) {
      var dx2 = Math.floor(cx / TS), dy2 = Math.floor((cy + 4) / TS);
      if (CV.Tiles.def(room.at(dx2, dy2)).id === 'dataFloor') {
        room.set(dx2, dy2, ' ');
        CV.FX.corrupt(cx, cy);
      }
    }
  }

  /* --- attack state machine ------------------------------------------------- */
  function updateAttack(dt, locked) {
    var f = P.frame, a = f.attack;

    if (P.atkState > 0) {
      P.atkTimer -= dt;
      if (P.atkState === 1 && P.atkTimer <= 0) {
        P.atkState = 2; P.atkTimer = a.active; P.atkHit = false;
        doAttackHit();
      } else if (P.atkState === 2) {
        P.atkAngle = U.lerp(-0.9, 0.9, 1 - P.atkTimer / a.active);
        if (P.atkTimer <= 0) { P.atkState = 3; P.atkTimer = a.recover; }
      } else if (P.atkState === 3 && P.atkTimer <= 0) {
        P.atkState = 0;
        P.atkComboTimer = a.comboWindow;
      }
      return;
    }

    if (locked || P.slamming) return;
    if (!In.buffered('attack')) return;
    if (In.held('down') && !P.grounded && CV.State.hasModule('slam')) return;  // slam owns this
    In.consume('attack');

    P.atkIndex = P.atkComboTimer > 0 ? (P.atkIndex + 1) % a.combo : 0;
    P.atkState = 1;
    P.atkTimer = a.windup;
    P.atkAngle = -0.9;
    CV.Audio.sfx(a.ranged ? 'shoot' : (f.id === 'bulwark' ? 'swingHeavy' : 'swing'));
  }

  function doAttackHit() {
    var f = P.frame, a = f.attack;
    var cx = P.x + P.w / 2, cy = P.y + P.h * 0.5;

    if (a.ranged) {
      var vy0 = In.held('up') ? -a.projSpeed : (In.held('down') && !P.grounded ? a.projSpeed : 0);
      var vx0 = vy0 !== 0 ? 0 : P.facing * a.projSpeed;
      CV.Combat.fire(cx + P.facing * 5, cy, vx0, vy0, a.damage[0] * P.damageMul(), false,
                     { color: f.color, life: a.projLife, r: 2 });
      P.vx -= P.facing * 14;    // tiny recoil: Arc is a thruster with a gun
      return;
    }

    var idx = Math.min(P.atkIndex, a.damage.length - 1);
    var dmg = a.damage[idx] * P.damageMul();
    var up = In.held('up'), down = In.held('down') && !P.grounded;
    var bx, by, bw, bh;
    if (up) { bw = P.w + 10; bh = a.reach; bx = cx - bw / 2; by = P.y - bh; }
    else if (down) { bw = P.w + 10; bh = a.reach; bx = cx - bw / 2; by = P.y + P.h; }
    else {
      bw = a.reach; bh = P.h + 6;
      bx = P.facing > 0 ? P.x + P.w - 2 : P.x - bw + 2;
      by = P.y - 3;
    }

    var hits = CV.Combat.playerHitbox(bx, by, bw, bh, dmg, P.facing, {
      knockback: a.knockback, hitstop: a.hitstop,
      shake: (a.shake && a.shake[idx]) || 0.12,
      heavy: f.id === 'bulwark',
      corrupt: a.corrupt || 0,
      up: up, down: down
    });

    if (hits > 0) {
      P.atkHit = true;
      var step = a.stepOnHit[idx] || 0;
      if (step) P.vx += P.facing * step;
      /* Pogo: a downward hit bounces you. Free vertical movement tech. */
      if (down) { P.vy = -280; P.jumpsUsed = 0; P.dashesUsed = 0; }
      if (f.id === 'bulwark') P.vx -= P.facing * 26;   // recoil doubles as a movement tool
    }
  }

  /* --- grapple --------------------------------------------------------------- */
  P.grappling = function () { return P.grapple && P.grapple.state === 2; };

  function updateGrapple(dt, room, layer, locked) {
    var f = P.frame;
    if (P.grapple) {
      var g = P.grapple;
      g.t += dt;
      if (g.state === 1) {                        // rope extending
        g.rope = Math.min(1, g.rope + dt * 7);
        if (g.rope >= 1) {
          g.state = g.mode === 'pullEnemy' ? 3 : 2;
          if (g.mode === 'pullEnemy' && g.enemy) {
            var ang = Math.atan2(P.y + P.h / 2 - (g.enemy.y - g.enemy.h / 2),
                                 P.x + P.w / 2 - g.enemy.x);
            g.enemy.vx = Math.cos(ang) * 340;
            g.enemy.vy = Math.sin(ang) * 340 - 60;
            g.enemy.stunned = Math.max(g.enemy.stunned, 0.6);
            CV.Audio.sfx('grappleHit');
          }
          if (g.state === 3) g.t = 0.14;
        }
      } else if (g.state === 2) {                 // pulling player
        var dx = g.x - (P.x + P.w / 2), dy = g.y - (P.y + P.h / 2);
        var d = Math.sqrt(dx * dx + dy * dy);
        var speed = f.id === 'arc' ? 640 : 430;
        if (d < 14 || g.t > 1.6 || (!locked && In.pressed('jump'))) {
          /* Release preserves momentum — the whole point of Arc's slingshot. */
          var keep = f.id === 'arc' ? 1.0 : 0.55;
          P.vx = (dx / (d || 1)) * speed * keep;
          P.vy = (dy / (d || 1)) * speed * keep - (f.id === 'arc' ? 60 : 40);
          P.dashesUsed = 0; P.jumpsUsed = f.id === 'arc' ? 0 : P.jumpsUsed;
          P.grapple = null;
          return;
        }
        P.vx = (dx / d) * speed;
        P.vy = (dy / d) * speed;
        FX.trail(P.x + P.w / 2, P.y + P.h / 2, f.color, .18, 1);
      } else if (g.state === 3) {
        g.t -= dt;
        if (g.t <= 0) P.grapple = null;
      }
      return;
    }

    if (locked || !CV.State.hasModule('grapple')) return;
    if (!In.buffered('grapple')) return;
    In.consume('grapple');

    var dirX = In.axisX() || P.facing;
    var dirY = In.axisY();
    if (dirX === 0 && dirY === 0) dirX = P.facing;
    var len = Math.sqrt(dirX * dirX + dirY * dirY);
    dirX /= len; dirY /= len;

    var range = 150;

    /* BULWARK reverses the tether: it pulls the target to you. */
    if (f.id === 'bulwark') {
      var e = CV.Enemies.inCone(P.x + P.w / 2, P.y + P.h / 2, dirX, dirY, range, 0.45);
      if (e) {
        if (!P.spend(CV.Modules.cost('grapple', f))) return;
        P.grapple = { x: e.x, y: e.y - e.h / 2, state: 1, rope: 0, t: 0,
                      mode: 'pullEnemy', enemy: e };
        CV.Audio.sfx('grapple');
        return;
      }
    }

    var anchor = room.findAnchor(P.x + P.w / 2, P.y + P.h / 2, dirX, dirY, range,
                                 f.id === 'cipher');
    if (!anchor) { CV.Audio.sfx('deny'); return; }
    if (!P.spend(CV.Modules.cost('grapple', f))) return;
    P.grapple = { x: anchor.x, y: anchor.y, state: 1, rope: 0, t: 0, mode: 'pull' };
    CV.Audio.sfx('grapple');
  }

  /* --- active + passive modules ---------------------------------------------- */

  /* Number keys select a chassis directly. Swapping is instant and grants brief
     i-frames, which makes the swap itself a movement/defensive tool at high level. */
  function handleFrameSwap() {
    for (var i = 0; i < CV.Frames.order.length; i++) {
      if (!In.pressed('frame' + (i + 1))) continue;
      var id = CV.Frames.order[i];
      if (!CV.State.hasFrame(id)) { CV.Audio.sfx('deny'); return; }
      if (P.frameId === id) return;

      /* Test the new hurtbox — anchored at the feet, as setFrame will place it —
         before committing. BULWARK genuinely does not fit in a service corridor,
         and refusing is better than clipping it through the wall. */
      var d = CV.Frames.get(id);
      var nx = P.x + P.w / 2 - d.w / 2, ny = P.y + P.h - d.h;
      if (CV.World.room &&
          CV.Collision.solidBox(CV.World.room, nx, ny, d.w, d.h, CV.DataSphere.layer)) {
        CV.HUD.toast('NO ROOM TO RECONFIGURE');
        CV.Audio.sfx('deny');
        return;
      }
      P.setFrame(id);
      return;
    }
  }

  function handleModuleSelect() {
    var actives = CV.State.activeModules();
    if (!actives.length) { P.activeModule = null; return; }
    if (!P.activeModule || actives.indexOf(P.activeModule) < 0) P.activeModule = actives[0];
    if (In.pressed('cycleL') || In.pressed('cycleR')) {
      var i = actives.indexOf(P.activeModule);
      i = (i + (In.pressed('cycleR') ? 1 : actives.length - 1)) % actives.length;
      P.activeModule = actives[i];
      CV.HUD.toast(CV.Modules.defs[P.activeModule].name);
      CV.Audio.sfx('ui');
    }
  }

  function useActiveModule(room) {
    var f = P.frame, id = P.activeModule;
    if (!id) return;
    var cost = CV.Modules.cost(id, f);
    if (!P.spend(cost)) return;
    var cx = P.x + P.w / 2, cy = P.y + P.h / 2;

    if (id === 'emp') {
      var radius = f.id === 'bulwark' ? 92 : f.id === 'arc' ? 48 : 68;
      var stun = f.id === 'bulwark' ? 3 : f.id === 'arc' ? 1.1 : 1.5;
      CV.Combat.radial(cx, cy, radius, 4 * P.damageMul(), {
        stun: stun, knockback: 60, color: C.cyanGlow, shake: 0.3,
        convert: f.id === 'cipher' ? 8 : 0
      });
      openBarriers(room, cx, cy, radius);
      CV.PostFX.pulse(0.9, 0.4);
      CV.Audio.sfx('emp');
    } else if (id === 'cutter') {
      openBarriers(room, cx, cy, 110);
      if (f.id === 'bulwark') CV.Combat.radial(cx, cy, 80, 0, { stun: 2, fx: false });
      FX.ring(cx, cy, C.violet, 200, 24);
      CV.Audio.sfx('cutter');
    } else if (id === 'overclock') {
      P.overclock = f.id === 'arc' ? 2.5 : 4;
      if (f.id !== 'bulwark') CV.Engine.timeScale = f.id === 'arc' ? 0.35 : 0.5;
      if (f.id === 'cipher') CV.DataSphere.revealPulse(4);
      CV.PostFX.pulse(1, 0.5);
      CV.Audio.sfx('overclock');
    } else if (id === 'drone') {
      P.droneCd = 8;
      CV.HUD.toast('DRONE DEPLOYED');
      CV.Audio.sfx('ui');
    }
  }

  function openBarriers(room, cx, cy, radius) {
    var t0x = Math.floor((cx - radius) / TS), t1x = Math.floor((cx + radius) / TS);
    var t0y = Math.floor((cy - radius) / TS), t1y = Math.floor((cy + radius) / TS);
    var n = 0;
    for (var ty = t0y; ty <= t1y; ty++) {
      for (var tx = t0x; tx <= t1x; tx++) {
        if (CV.Tiles.def(room.at(tx, ty)).id === 'barrier') {
          room.set(tx, ty, ' ');
          FX.sparks(tx * TS + 8, ty * TS + 8, 6, C.violet, 6.283, 130);
          n++;
        }
      }
    }
    if (n) { CV.Audio.sfx('break'); CV.Engine.addTrauma(0.25); }
    return n;
  }

  function updatePassives(dt, room) {
    var f = P.frame;
    /* POLARITY CORE — Vector/Cipher pull loose motes and pickups toward you. */
    if (CV.State.hasModule('magnet') && (f.id === 'vector' || f.id === 'cipher')) {
      var cx = P.x + P.w / 2, cy = P.y + P.h / 2;
      var items = FX.pool.items;
      for (var i = 0; i < FX.pool.count; i++) {
        var p = items[i];
        if (p.grav !== 120) continue;     // motes only
        var dx = cx - p.x, dy = cy - p.y, d2 = dx * dx + dy * dy;
        if (d2 < 6400) {
          var d = Math.sqrt(d2) || 1;
          p.vx += (dx / d) * 700 * dt;
          p.vy += (dy / d) * 700 * dt;
        }
      }
    }
    /* RECON DRONE — a small companion that behaves per frame. */
    if (CV.State.hasModule('drone')) {
      P.droneAngle += dt * 1.6;
      var tx = P.x + P.w / 2 + Math.cos(P.droneAngle) * 20;
      var ty = P.y - 10 + Math.sin(P.droneAngle * 1.3) * 6;
      P.droneX = U.damp(P.droneX || tx, tx, 6, dt);
      P.droneY = U.damp(P.droneY || ty, ty, 6, dt);
      P.droneCd = Math.max(0, P.droneCd - dt);
      if (P.droneCd <= 0 && (f.id === 'vector')) {
        var e = CV.Enemies.nearest(P.droneX, P.droneY, 90);
        if (e) {
          P.droneCd = 0.8;
          var a = Math.atan2(e.y - e.h / 2 - P.droneY, e.x - P.droneX);
          CV.Combat.fire(P.droneX, P.droneY, Math.cos(a) * 300, Math.sin(a) * 300,
                         4 * P.damageMul(), false, { color: C.cyan, r: 1, life: .8 });
        }
      }
    }
  }

  /* ===========================================================================
     DAMAGE & DEATH
     =========================================================================== */

  P.hurt = function (amount, dir, hazard) {
    if (P.dead || P.invuln > 0) return;
    if (CV.Settings.assistDamage === 0) amount = 0;
    else amount *= CV.Settings.assistDamage;
    amount *= P.frame.damageTaken;
    if (CV.State.hasAugment('dampener')) amount *= 0.8;
    amount = Math.max(amount > 0 ? 1 : 0, Math.round(amount));

    if (amount <= 0) { P.invuln = 0.4; return; }

    P.hp -= amount;
    P.invuln = 0.95;
    P.flash = 1;
    P.slamming = false;
    P.grapple = null;
    P.dashTimer = 0;
    P.vx = -dir * (hazard ? 150 : 190);
    P.vy = -210;

    CV.Engine.addHitstop(0.10);
    CV.Engine.addTrauma(0.55);
    CV.PostFX.pulse(1, 0.5);
    CV.PostFX.desat = 0.7;
    CV.PostFX.whiteFlash(0.18, C.red);
    FX.sparks(P.x + P.w / 2, P.y + P.h / 2, 14, C.red, 6.283, 220);
    CV.Audio.sfx('hurt');
    CV.HUD.damageFlash();

    if (P.hp <= 0) die();
  };

  P.heal = function (n) { P.hp = Math.min(P.maxHp, P.hp + n); };

  function die() {
    P.hp = 0;
    P.dead = true;
    P.deadTimer = 2.0;
    P.vx = 0; P.vy = -160;
    CV.Engine.addTrauma(0.9);
    CV.PostFX.whiteFlash(0.5, C.red);
    CV.PostFX.pulse(1, 1);
    FX.debris(P.x + P.w / 2, P.y + P.h, 18, P.frame.color);
    CV.Audio.sfx('death');
    CV.Audio.duck(2.2);
    CV.State.deaths++;
  }

  function updateDead(dt) {
    P.deadTimer -= dt;
    P.vy += 900 * dt;
    P.y += P.vy * dt;
    if (P.deadTimer <= 0) P.respawn();
  }

  P.respawn = function () {
    P.dead = false;
    P.hp = P.maxHp;
    P.energy = P.maxEnergy();
    P.vx = P.vy = 0;
    P.invuln = 1.2;
    P.slamming = false; P.grapple = null; P.dashTimer = 0;
    CV.Combat.clearProjectiles();
    CV.DataSphere.forceLayer(CV.Tiles.PHYS);

    /* CONTINUITY augment returns you to the room entrance instead of the last dock —
       the game's only "make death cheaper" upgrade, and it is late. */
    var target = CV.State.dockRoom || 'und_wake';
    if (CV.State.hasAugment('continuity') && CV.State.lastRoom) target = CV.State.lastRoom;

    CV.World.load(target, null, CV.State.dockRoom === target && CV.State.dockPos
                  ? { x: CV.State.dockPos.x, y: CV.State.dockPos.y - P.h } : null);
    CV.PostFX.whiteFlash(0.4, C.cyan);
  };

  /* ===========================================================================
     RENDER
     =========================================================================== */

  P.render = function (ctx, cam) {
    if (P.dead && P.deadTimer < 1.6) return;

    /* Data platforms left by CIPHER's second jump. */
    for (var i = 0; i < P.dataPlatforms.length; i++) {
      var dp = P.dataPlatforms[i];
      var a = Math.min(1, dp.t / 0.5);
      ctx.fillStyle = CV.Palette.alpha(C.cyan, 0.5 * a);
      ctx.fillRect((dp.x - 12 - cam.rx()) | 0, (dp.y - cam.ry()) | 0, 24, 3);
    }

    if (P.grapple) renderGrapple(ctx, cam);

    /* i-frame blink: 12Hz, skipped in the first 0.15s so the hit still reads. */
    if (P.invuln > 0 && P.invuln < 0.8 && Math.floor(P.t * 24) % 2 === 0 && !P.dashTimer) return;

    var x = (P.x + P.w / 2 - cam.rx()) | 0;
    var y = (P.y + P.h - cam.ry()) | 0;

    ctx.save();
    ctx.translate(x, y);
    if (P.morph > 0) {
      var m = P.morph / 0.25;
      ctx.scale(1 + m * 0.35, 1 - m * 0.2);
      ctx.globalAlpha = 1 - m * 0.35;
    }
    CV.Sprites.drawPlayerFrame(ctx, P.frameId, {
      t: P.t, walk: P.walkPhase, air: P.vy, facing: P.facing,
      grounded: P.grounded, squash: P.squash,
      state: P.atkState === 2 ? 'attack' : 'idle',
      attackAngle: P.atkAngle, attackPose: 0,
      power: U.clamp(Math.abs(P.vx) / P.frame.runSpeed, 0, 1),
      flash: P.flash, energyLow: P.energy < P.maxEnergy() * 0.2,
      optic: P.frame.optic
    });
    ctx.restore();

    if (CV.State.hasModule('drone')) renderDrone(ctx, cam);
  };

  function renderGrapple(ctx, cam) {
    var g = P.grapple;
    var sx = P.x + P.w / 2 - cam.rx(), sy = P.y + P.h / 2 - cam.ry();
    var ex = g.x - cam.rx(), ey = g.y - cam.ry();
    var t = g.state === 1 ? g.rope : 1;
    var mx = sx + (ex - sx) * t, my = sy + (ey - sy) * t;
    CV.Gfx.dashLine(ctx, sx, sy, mx, my, P.frame.color, 3, CV.Engine.frame);
    CV.Gfx.rect(ctx, mx - 2, my - 2, 4, 4, C.white);
    CV.Gfx.glow(ctx, mx, my, 9, P.frame.color, .6);
  }

  function renderDrone(ctx, cam) {
    var x = (P.droneX - cam.rx()) | 0, y = (P.droneY - cam.ry()) | 0;
    ctx.fillStyle = C.steelDark; ctx.fillRect(x - 3, y - 2, 6, 3);
    ctx.fillStyle = C.chrome; ctx.fillRect(x - 4, y - 3, 8, 1);
    ctx.fillStyle = P.frame.color; ctx.fillRect(x - 1, y - 1, 2, 1);
    CV.Gfx.glow(ctx, x, y, 8, P.frame.color, .35);
  }

  /* ===========================================================================
     AUGMENTS (metadata lives here so the menu and pickups share one source)
     =========================================================================== */
  var AUG = {
    siphon:    ['SIPHON', '+6 ENERGY PER HIT LANDED.'],
    flywheel:  ['FLYWHEEL', '+60% REGENERATION, -25% MAXIMUM.'],
    reservoir: ['RESERVOIR', '+50% MAXIMUM, -40% REGENERATION.'],
    kinetic:   ['KINETIC', 'REGENERATION SCALES WITH SPEED.'],
    scavenger: ['SCAVENGER', 'DOWNED UNITS DROP DOUBLE ENERGY.'],
    dampener:  ['DAMPENER', '-20% DAMAGE TAKEN, -15% SPEED.'],
    ledger:    ['LEDGER', 'MODULE COSTS -25%, ATTACK -15%.'],
    overflow:  ['OVERFLOW', 'ABOVE 90% ENERGY: +25% DAMAGE.'],
    deadman:   ['DEADMAN', 'AT 1 INTEGRITY: +100% DAMAGE, +50% REGEN.'],
    ghost:     ['GHOST', 'DASH INVULNERABILITY EXTENDED.'],
    anchor:    ['ANCHOR', 'TETHER COOLDOWN HALVED.'],
    resonance: ['RESONANCE', 'CIPHER NO LONGER DRAINS OUTSIDE THE SPHERE.'],
    salvage:   ['SALVAGE', 'DOWNED UNITS LEAVE A BRIEF ALLY HUSK.'],
    continuity:['CONTINUITY', 'RESPAWN AT THE ROOM ENTRANCE, NOT THE LAST DOCK.']
  };
  P.augmentName = function (id) { return (AUG[id] || ['?'])[0]; };
  P.augmentBlurb = function (id) { return (AUG[id] || ['', '?'])[1]; };
  P.augments = AUG;

})(window.CV = window.CV || {});
