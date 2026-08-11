/* CYBERVANIA — core/engine.js
   Fixed-timestep loop with decoupled rendering, plus global time controls
   (hitstop, slow-motion, screen shake trauma) that every other system feeds into. */
(function (CV) {
  'use strict';

  var E = CV.Engine = {};

  var acc = 0, last = 0, running = false, raf = 0;

  E.time = 0;            // gameplay seconds (does not advance during hitstop/pause)
  E.realTime = 0;        // wall clock seconds since boot
  E.frame = 0;
  E.fps = 60;
  E.frameMs = 0;
  /* Freezes world simulation only — never the loop. Game.update honours it after the
     modal UI layers have had their turn. */
  E.paused = false;
  E.timeScale = 1;       // Overclock, boss cinematics
  E.hitstop = 0;         // freeze frames on impact — the single best-value feel system
  E.trauma = 0;          // 0..1, screen shake energy; shake = trauma^2 (Squirrel Eiserloh)
  E.shakeX = 0; E.shakeY = 0;
  E.update = null;       // set by Game
  E.render = null;

  var fpsAcc = 0, fpsCount = 0;
  E.history = new Float32Array(120);   // frame-time ring buffer for the debug graph
  var histIdx = 0;

  /* Impacts call this. Duration scales with damage; capped so a big hit never
     feels like a stall. Both attacker and victim freeze — that is what sells weight. */
  E.addHitstop = function (sec) {
    E.hitstop = Math.max(E.hitstop, Math.min(sec, 0.18));
  };

  /* Trauma is additive and decays; shake is trauma squared, which keeps small hits
     subtle and big hits violent without a separate magnitude parameter. */
  E.addTrauma = function (amount) {
    E.trauma = Math.min(1, E.trauma + amount * (CV.Settings ? CV.Settings.shake : 1));
  };

  E.start = function () {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };

  E.stop = function () { running = false; cancelAnimationFrame(raf); };

  function tick(now) {
    if (!running) return;
    raf = requestAnimationFrame(tick);

    var real = (now - last) / 1000;
    last = now;
    /* Clamp: after an alt-tab, `real` can be 30 seconds. Without this the accumulator
       loop would try to simulate 3600 steps and lock the tab. */
    if (real > 0.25) real = 0.25;
    E.realTime += real;
    E.frameMs = real * 1000;

    E.history[histIdx] = E.frameMs;
    histIdx = (histIdx + 1) % E.history.length;

    fpsAcc += real; fpsCount++;
    if (fpsAcc >= 0.25) { E.fps = fpsCount / fpsAcc; fpsAcc = 0; fpsCount = 0; }

    CV.Input.update(real);

    /* The loop always runs. `E.paused` freezes the *world*, not the update — the
       menu, terminal and dialogue are driven from the same update and would lock
       themselves out if pausing stopped the loop. Game.update decides what to
       simulate; see game.js. */
    if (E.hitstop > 0) {
      /* During hitstop the world is frozen; drain it on the real clock. */
      E.hitstop -= real;
      acc = 0;
      CV.Input.endStep();
    } else {
      acc += real * E.timeScale;
      var steps = 0;
      while (acc >= CV.STEP && steps < 8) {   // 8-step ceiling: never death-spiral
        E.time += CV.STEP;
        if (E.update) E.update(CV.STEP);
        CV.Input.endStep();                   // one physical press = one action
        acc -= CV.STEP;
        steps++;
      }
      if (steps >= 8) acc = 0;
    }

    /* Shake decays on the real clock so a paused/hitstopped frame still settles. */
    if (E.trauma > 0) {
      E.trauma = Math.max(0, E.trauma - real * 1.6);
      var s = E.trauma * E.trauma * 9;
      var t = E.realTime * 47;
      E.shakeX = CV.Util.noise1(t) * s;
      E.shakeY = CV.Util.noise1(t + 91.3) * s;
    } else { E.shakeX = 0; E.shakeY = 0; }

    E.frame++;
    if (E.render) E.render(real);
  }

  /* Convenience: run `fn` after `sec` of gameplay time. Used for boss telegraphs,
     door transitions and dialogue pacing. Cleared on room change. */
  var timers = [];
  E.after = function (sec, fn) { timers.push({ t: sec, fn: fn }); };
  E.clearTimers = function () { timers.length = 0; };
  E.tickTimers = function (dt) {
    for (var i = timers.length - 1; i >= 0; i--) {
      timers[i].t -= dt;
      if (timers[i].t <= 0) { var f = timers[i].fn; timers.splice(i, 1); f(); }
    }
  };

})(window.CV = window.CV || {});
