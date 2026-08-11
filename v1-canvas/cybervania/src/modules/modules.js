/* CYBERVANIA — modules/modules.js
   Twelve modules, each reinterpreted by all four frames (GAME_DESIGN §5). The
   per-frame table below is the game's combinatorial core: 12 verbs x 4 frames = 48
   behaviours from a list the player can memorise. */
(function (CV) {
  'use strict';

  var M = CV.Modules = {};
  var C = CV.Palette.c;

  M.defs = {
    dash: {
      id: 'dash', name: 'PHASE DASH', order: 0, cost: 0, icon: 'dash',
      blurb: 'A BURST OF DIRECTED THRUST. FREE — MOVEMENT IS NEVER RATIONED.',
      per: {
        vector:  'GROUND AND AIR DASH. BRIEF INVULNERABILITY.',
        bulwark: 'ARMOURED CHARGE. DAMAGES AND SHOVES WHAT IT HITS.',
        arc:     'TWO AIR DASHES. HORIZONTAL MOMENTUM IS KEPT.',
        cipher:  'PASSES THROUGH DATA-WALLS.'
      }
    },
    doublejump: {
      id: 'doublejump', name: 'THRUSTER VAULT', order: 1, cost: 0, icon: 'doublejump',
      blurb: 'A SECOND IGNITION MID-FALL.',
      per: {
        vector:  'FULL-HEIGHT SECOND JUMP.',
        bulwark: 'SHORT HOP. CANCELS DIRECTLY INTO SEISMIC SLAM.',
        arc:     'SECOND JUMP, THEN HOLD TO GLIDE.',
        cipher:  'LEAVES A SOLID DATA-PLATFORM BEHIND FOR TWO SECONDS.'
      }
    },
    grapple: {
      id: 'grapple', name: 'TETHER HOOK', order: 2, cost: 8, icon: 'grapple',
      blurb: 'MAGNETIC TETHER. LOCKS TO ANCHOR POINTS.',
      per: {
        vector:  'PULLS YOU TO THE ANCHOR.',
        bulwark: 'PULLS THE TARGET TO YOU.',
        arc:     'SLINGSHOT. HIGH SPEED, MOMENTUM PRESERVED.',
        cipher:  'LATCHES ONTO DIGITAL ANCHORS OTHER FRAMES CANNOT SEE.'
      }
    },
    wallcling: {
      id: 'wallcling', name: 'ADHESION PLATES', order: 3, cost: 0, icon: 'wallcling',
      blurb: 'ELECTROSTATIC PADS. HOLD TOWARD A WALL TO STICK.',
      per: {
        vector:  'CLING AND CLIMB.',
        bulwark: 'CLING ONLY — BUT HANGS INDEFINITELY.',
        arc:     'CLING, AND THE AIR DASH REFRESHES INSTANTLY.',
        cipher:  'CLINGS TO DATA-WALLS.'
      }
    },
    slam: {
      id: 'slam', name: 'SEISMIC SLAM', order: 4, cost: 10, icon: 'slam',
      blurb: 'DOWNWARD IMPACT. THE ONLY THING THAT OPENS REINFORCED PLATING.',
      per: {
        vector:  'FAST, SMALL POUND.',
        bulwark: 'BREAKS REINFORCED TERRAIN. LARGE STUN RADIUS.',
        arc:     'MICRO-SLAM. MOSTLY A FAST-FALL.',
        cipher:  'SHATTERS DATA-FLOORS.'
      }
    },
    emp: {
      id: 'emp', name: 'EMP BURST', order: 5, cost: 22, icon: 'emp',
      blurb: 'DISCHARGE. STUNS MACHINES AND COLLAPSES ENERGY BARRIERS.',
      per: {
        vector:  'STUNS FOR 1.5 SECONDS.',
        bulwark: 'STUNS FOR 3 SECONDS. LARGER RADIUS.',
        arc:     'CHEAP, SMALL, ALMOST INSTANT.',
        cipher:  'CONVERTS A STUNNED UNIT TO AN ALLY FOR 8 SECONDS.'
      }
    },
    datashift: {
      id: 'datashift', name: 'DATA SHIFT', order: 6, cost: 0, icon: 'datashift',
      blurb: 'CROSSES BETWEEN THE PHYSICAL WORLD AND THE DATA SPHERE.',
      per: {
        vector:  'ONLY AT DIVE PORTS.',
        bulwark: 'ONLY AT DIVE PORTS.',
        arc:     'ONLY AT DIVE PORTS.',
        cipher:  'ANYWHERE. INSTANTLY.'
      }
    },
    magnet: {
      id: 'magnet', name: 'POLARITY CORE', order: 7, cost: 6, icon: 'magnet',
      blurb: 'FIELD REVERSAL. INTERACTS WITH ANYTHING FERROUS OR CHARGED.',
      per: {
        vector:  'DRAWS LOOSE ITEMS AND ENERGY TOWARD YOU.',
        bulwark: 'DEFLECTS INCOMING PROJECTILES.',
        arc:     'RIDES MAGNETIC RAILS AT SPEED.',
        cipher:  'PULLS DATA FRAGMENTS THROUGH WALLS.'
      }
    },
    drone: {
      id: 'drone', name: 'RECON DRONE', order: 8, cost: 14, icon: 'drone',
      blurb: 'A DETACHED SUB-UNIT. IT IS NOT IN THE REGISTRY EITHER.',
      per: {
        vector:  'AUTO-ATTACKS NEARBY TARGETS.',
        bulwark: 'INTERCEPTS ONE INCOMING HIT.',
        arc:     'REVEALS CONCEALED OBJECTS IN A RADIUS.',
        cipher:  'BECOMES A SECOND, REMOTE BODY.'
      }
    },
    extract: {
      id: 'extract', name: 'ENERGY EXTRACTION', order: 9, cost: 0, icon: 'extract',
      blurb: 'SIPHONS CHARGE FROM DOWNED UNITS AND OPEN CONDUITS.',
      per: {
        vector:  'DRAINS DOWNED ENEMIES.',
        bulwark: 'DRAINS CONTINUOUSLY WHILE ATTACKING.',
        arc:     'DRAINS AT RANGE.',
        cipher:  'DRAINS ATLAS CONDUITS — AND READS THEM.'
      }
    },
    overclock: {
      id: 'overclock', name: 'OVERCLOCK', order: 10, cost: 30, icon: 'overclock',
      blurb: 'RUNS THE CORE PAST ITS RATED CEILING.',
      per: {
        vector:  'TIME AT HALF SPEED FOR FOUR SECONDS.',
        bulwark: 'DOUBLE DAMAGE INSTEAD OF SLOWDOWN.',
        arc:     'TIME AT 0.35x FOR 2.5 SECONDS.',
        cipher:  'REVEALS EVERY CONCEALED OBJECT ON SCREEN.'
      }
    },
    cutter: {
      id: 'cutter', name: 'SIGNAL CUTTER', order: 11, cost: 18, icon: 'cutter',
      blurb: 'SEVERS THE CONTROL SIGNAL HOLDING A BARRIER OPEN.',
      per: {
        vector:  'OPENS ENERGY BARRIERS.',
        bulwark: 'OPENS BARRIERS AND STUNS EVERYTHING NEARBY.',
        arc:     'OPENS BARRIERS FROM RANGE.',
        cipher:  'OPENS BARRIERS AND READS WHAT THEY WERE PROTECTING.'
      }
    }
  };

  M.order = ['dash', 'doublejump', 'wallcling', 'grapple', 'slam', 'emp',
             'magnet', 'datashift', 'drone', 'extract', 'overclock', 'cutter'];

  M.get = function (id) { return M.defs[id]; };

  /* Effective energy cost for the current frame. */
  M.cost = function (id, frameDef) {
    var d = M.defs[id];
    if (!d) return 0;
    var mul = frameDef ? frameDef.costMul : 1;
    if (id === 'emp' && frameDef && frameDef.id === 'arc') mul *= 0.55;
    return Math.round(d.cost * mul);
  };

  /* Small procedural icons for the HUD and the MODULES menu tab. Drawn rather than
     spritesheeted so they inherit whatever colour the UI wants. */
  M.drawIcon = function (ctx, id, x, y, color, dim) {
    ctx.save();
    ctx.translate(x + 5, y + 5);
    ctx.fillStyle = dim ? CV.Palette.alpha(color, .25) : color;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1;
    switch (id) {
      case 'dash':
        ctx.fillRect(-5, -1, 7, 2);
        ctx.fillRect(2, -3, 2, 6);
        ctx.fillRect(-5, -4, 2, 1); ctx.fillRect(-5, 3, 2, 1);
        break;
      case 'doublejump':
        ctx.fillRect(-1, -5, 2, 4); ctx.fillRect(-3, -3, 6, 1);
        ctx.fillRect(-1, 1, 2, 4);  ctx.fillRect(-3, 3, 6, 1);
        break;
      case 'grapple':
        ctx.fillRect(-5, 3, 2, 2);
        for (var i = 0; i < 4; i++) ctx.fillRect(-4 + i * 2, 2 - i * 2, 1, 1);
        ctx.fillRect(2, -5, 4, 4);
        break;
      case 'wallcling':
        ctx.fillRect(-5, -5, 2, 10);
        ctx.fillRect(-2, -2, 4, 5);
        break;
      case 'slam':
        ctx.fillRect(-1, -5, 2, 5);
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(0, 4);
        ctx.closePath(); ctx.fill();
        break;
      case 'emp':
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, 6.283); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 6.283); ctx.stroke();
        ctx.fillRect(-1, -1, 2, 2);
        break;
      case 'datashift':
        ctx.strokeRect(-5.5, -4.5, 6, 6);
        ctx.fillRect(-1, -1, 6, 6);
        break;
      case 'magnet':
        ctx.fillRect(-5, -4, 3, 6); ctx.fillRect(2, -4, 3, 6);
        ctx.fillRect(-5, -5, 10, 2);
        break;
      case 'drone':
        ctx.fillRect(-2, -1, 4, 3);
        ctx.fillRect(-6, -3, 4, 1); ctx.fillRect(2, -3, 4, 1);
        break;
      case 'extract':
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5);
        ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill();
        break;
      case 'overclock':
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, 6.283); ctx.stroke();
        ctx.fillRect(-1, -4, 2, 5); ctx.fillRect(0, -1, 4, 2);
        break;
      case 'cutter':
        ctx.fillRect(-5, -5, 2, 6); ctx.fillRect(3, -5, 2, 6);
        ctx.fillRect(-3, 1, 6, 1);
        ctx.fillRect(-1, 2, 2, 3);
        break;
    }
    ctx.restore();
  };

  M.iconFor = function (id) { return (M.defs[id] || {}).icon || id; };

})(window.CV = window.CV || {});
