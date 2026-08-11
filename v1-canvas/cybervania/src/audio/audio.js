/* CYBERVANIA — audio/audio.js
   Everything is synthesised at runtime through WebAudio: no audio files, nothing to
   download, works from file://. The music director runs a step sequencer whose voices
   (PWM bass, detuned saw lead, noise percussion, FM bell) are re-parameterised per
   region, so each area has its own acoustic identity from one engine (rule 29). */
(function (CV) {
  'use strict';

  var A = CV.Audio = {};

  var ctx = null, master = null, musicBus = null, sfxBus = null, comp = null;
  var started = false, enabled = true;
  var lookahead = 0.12, timerId = 0, nextStep = 0, step = 0;
  var current = null, target = null, fade = 1, duckUntil = 0;
  var layerFilter = null;

  /* --- musical material ---------------------------------------------------- */

  var SCALES = {
    minor:      [0, 2, 3, 5, 7, 8, 10],
    phrygian:   [0, 1, 3, 5, 7, 8, 10],
    dorian:     [0, 2, 3, 5, 7, 9, 10],
    wholetone:  [0, 2, 4, 6, 8, 10],
    locrian:    [0, 1, 3, 5, 6, 8, 10]
  };

  /* Each region is a preset, not a track. Tempo, mode, voice mix and progression. */
  var TRACKS = {
    undercity: { bpm: 84, root: 41, scale: 'minor', prog: [0, 0, 5, 3],
                 bass: .55, arp: .18, pad: .40, lead: .16, drums: .30, wave: 'triangle',
                 cutoff: 620, detune: 6 },
    house:     { bpm: 72, root: 45, scale: 'dorian', prog: [0, 3, 5, 3],
                 bass: .32, arp: .10, pad: .52, lead: .22, drums: .06, wave: 'sine',
                 cutoff: 900, detune: 4 },
    neoncity:  { bpm: 104, root: 45, scale: 'minor', prog: [0, 5, 3, 7],
                 bass: .60, arp: .42, pad: .38, lead: .34, drums: .62, wave: 'sawtooth',
                 cutoff: 1500, detune: 12 },
    oldnetwork:{ bpm: 92, root: 38, scale: 'phrygian', prog: [0, 1, 0, 5],
                 bass: .52, arp: .30, pad: .34, lead: .20, drums: .34, wave: 'square',
                 cutoff: 780, detune: 8 },
    factory:   { bpm: 118, root: 36, scale: 'minor', prog: [0, 0, 3, 5],
                 bass: .66, arp: .24, pad: .22, lead: .18, drums: .78, wave: 'square',
                 cutoff: 900, detune: 10 },
    servers:   { bpm: 88, root: 48, scale: 'dorian', prog: [0, 7, 5, 3],
                 bass: .34, arp: .46, pad: .56, lead: .26, drums: .18, wave: 'sine',
                 cutoff: 1800, detune: 5 },
    reactor:   { bpm: 126, root: 34, scale: 'locrian', prog: [0, 1, 3, 1],
                 bass: .72, arp: .30, pad: .28, lead: .30, drums: .70, wave: 'sawtooth',
                 cutoff: 1100, detune: 16 },
    central:   { bpm: 70, root: 50, scale: 'wholetone', prog: [0, 0, 0, 0],
                 bass: .30, arp: .16, pad: .70, lead: .12, drums: .00, wave: 'sine',
                 cutoff: 2400, detune: 3 },
    boss:      { bpm: 138, root: 33, scale: 'phrygian', prog: [0, 0, 1, 0],
                 bass: .78, arp: .52, pad: .26, lead: .44, drums: .88, wave: 'sawtooth',
                 cutoff: 1600, detune: 18 },
    atlas:     { bpm: 96, root: 31, scale: 'locrian', prog: [0, 6, 0, 6],
                 bass: .80, arp: .34, pad: .62, lead: .38, drums: .54, wave: 'sawtooth',
                 cutoff: 1300, detune: 20 },
    data:      { bpm: 96, root: 52, scale: 'wholetone', prog: [0, 4, 2, 6],
                 bass: .28, arp: .62, pad: .48, lead: .30, drums: .12, wave: 'sine',
                 cutoff: 2600, detune: 2 }
  };

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function degree(track, deg, oct) {
    var sc = SCALES[track.scale];
    var i = ((deg % sc.length) + sc.length) % sc.length;
    var o = Math.floor(deg / sc.length) + (oct || 0);
    return track.root + sc[i] + o * 12;
  }

  /* --- engine -------------------------------------------------------------- */

  A.init = function () {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { enabled = false; return; }
    ctx = new AC();

    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 24;
    comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.22;

    master = ctx.createGain();
    master.gain.value = CV.Settings ? CV.Settings.masterVolume : 0.7;

    musicBus = ctx.createGain();
    musicBus.gain.value = CV.Settings ? CV.Settings.musicVolume : 0.55;

    sfxBus = ctx.createGain();
    sfxBus.gain.value = CV.Settings ? CV.Settings.sfxVolume : 0.8;

    /* One shared filter on the music bus: the Data Sphere ducks the top end and
       opens a resonant peak, which is most of the "you are somewhere else" feeling. */
    layerFilter = ctx.createBiquadFilter();
    layerFilter.type = 'lowpass';
    layerFilter.frequency.value = 16000;
    layerFilter.Q.value = 0.7;

    musicBus.connect(layerFilter);
    layerFilter.connect(comp);
    sfxBus.connect(comp);
    comp.connect(master);
    master.connect(ctx.destination);
  };

  /* Browsers require a gesture before audio starts; the title screen provides it. */
  A.unlock = function () {
    A.init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!started) {
      started = true;
      nextStep = ctx.currentTime + 0.1;
      timerId = setInterval(scheduler, 25);
    }
  };

  A.setVolumes = function () {
    if (!ctx) return;
    master.gain.value = CV.Settings.masterVolume;
    musicBus.gain.value = CV.Settings.musicVolume;
    sfxBus.gain.value = CV.Settings.sfxVolume;
  };

  A.setRegion = function (id) {
    var t = TRACKS[id] || TRACKS.undercity;
    if (target === t) return;
    target = t;
    if (!current) { current = t; fade = 1; }
    else fade = 0;
  };

  A.setLayer = function (layer) {
    if (!ctx) return;
    var now = ctx.currentTime;
    layerFilter.frequency.cancelScheduledValues(now);
    layerFilter.frequency.setTargetAtTime(layer === 1 ? 1400 : 16000, now, 0.25);
    layerFilter.Q.setTargetAtTime(layer === 1 ? 5 : 0.7, now, 0.25);
  };

  /* Duck the music under a big moment (death, boss defeat, the lab). */
  A.duck = function (sec) {
    if (!ctx) return;
    duckUntil = ctx.currentTime + sec;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setTargetAtTime(CV.Settings.musicVolume * 0.12, ctx.currentTime, 0.08);
    musicBus.gain.setTargetAtTime(CV.Settings.musicVolume, duckUntil, 0.6);
  };

  A.stop = function () {
    if (timerId) { clearInterval(timerId); timerId = 0; }
    started = false;
  };

  /* --- sequencer ----------------------------------------------------------- */

  function scheduler() {
    if (!ctx || !enabled || CV.Settings.musicVolume <= 0) return;
    var spb = 60 / (current ? current.bpm : 90) / 4;    // 16th notes
    while (nextStep < ctx.currentTime + lookahead) {
      playStep(step, nextStep);
      nextStep += spb;
      step++;
      /* Crossfade to the queued track at the top of a bar. */
      if (step % 16 === 0 && target && target !== current) {
        current = target;
        fade = 1;
      }
    }
  }

  function playStep(s, when) {
    var t = current;
    if (!t) return;
    var bar = Math.floor(s / 16) % t.prog.length;
    var chordRoot = t.prog[bar];
    var i = s % 16;

    // --- bass: root on the beat, octave ghost notes between
    if (t.bass > 0 && (i % 4 === 0 || (i % 8 === 6 && t.bpm > 100))) {
      var bn = degree(t, chordRoot, -1);
      bassVoice(midi(bn), when, i % 4 === 0 ? 0.26 : 0.12, t.bass * (i % 4 === 0 ? 1 : .5), t);
    }

    // --- pad: long chord, retriggered each bar
    if (t.pad > 0 && i === 0) {
      padVoice([midi(degree(t, chordRoot, 0)),
                midi(degree(t, chordRoot + 2, 0)),
                midi(degree(t, chordRoot + 4, 0))], when, (60 / t.bpm) * 4, t.pad * 0.5, t);
    }

    // --- arp: sixteenth ladder through the chord
    if (t.arp > 0 && i % 2 === 0) {
      var pat = [0, 2, 4, 6, 4, 2];
      var an = degree(t, chordRoot + pat[(s / 2) % pat.length], 1);
      arpVoice(midi(an), when, 0.11, t.arp * 0.35, t);
    }

    // --- lead: sparse melodic stabs, phrase-locked so it never sounds random
    if (t.lead > 0 && (i === 4 || i === 11) && (Math.floor(s / 16) % 2 === 1)) {
      var ln = degree(t, chordRoot + (i === 4 ? 4 : 6), 1);
      leadVoice(midi(ln), when, 0.34, t.lead * 0.30, t);
    }

    // --- drums
    if (t.drums > 0) {
      if (i === 0 || i === 8 || (t.drums > .6 && i === 14)) kick(when, t.drums);
      if (i === 4 || i === 12) snare(when, t.drums * .8);
      if (i % 2 === 0 && t.drums > .3) hat(when, t.drums * (i % 4 === 0 ? .30 : .18));
    }
  }

  function env(g, when, a, d, peak) {
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + a);
    g.gain.exponentialRampToValueAtTime(0.0001, when + a + d);
  }

  function bassVoice(f, when, dur, gain, t) {
    var o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = 'square';
    o.frequency.setValueAtTime(f, when);
    fl.type = 'lowpass';
    fl.frequency.setValueAtTime(t.cutoff * 0.55, when);
    fl.frequency.exponentialRampToValueAtTime(160, when + dur);
    fl.Q.value = 6;
    env(g, when, 0.006, dur, gain * 0.5);
    o.connect(fl); fl.connect(g); g.connect(musicBus);
    o.start(when); o.stop(when + dur + 0.05);
  }

  function arpVoice(f, when, dur, gain, t) {
    var o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = t.wave;
    o.frequency.setValueAtTime(f, when);
    fl.type = 'lowpass'; fl.frequency.value = t.cutoff; fl.Q.value = 3;
    env(g, when, 0.004, dur, gain * 0.35);
    o.connect(fl); fl.connect(g); g.connect(musicBus);
    o.start(when); o.stop(when + dur + 0.03);
  }

  function leadVoice(f, when, dur, gain, t) {
    /* Two detuned saws — the synthwave lead in one gesture. */
    var g = ctx.createGain(), fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.setValueAtTime(t.cutoff * 1.4, when);
    fl.frequency.exponentialRampToValueAtTime(t.cutoff * 0.5, when + dur);
    fl.Q.value = 4;
    env(g, when, 0.02, dur, gain * 0.32);
    for (var k = -1; k <= 1; k += 2) {
      var o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = k * t.detune;
      o.connect(fl);
      o.start(when); o.stop(when + dur + 0.05);
    }
    fl.connect(g); g.connect(musicBus);
  }

  function padVoice(freqs, when, dur, gain, t) {
    var g = ctx.createGain(), fl = ctx.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = t.cutoff * 0.8; fl.Q.value = 1;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * 0.16), when + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    for (var i = 0; i < freqs.length; i++) {
      for (var k = -1; k <= 1; k += 2) {
        var o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = freqs[i] * 0.5;
        o.detune.value = k * (t.detune * 0.6);
        o.connect(fl);
        o.start(when); o.stop(when + dur + 0.1);
      }
    }
    fl.connect(g); g.connect(musicBus);
  }

  function noiseBuffer(dur) {
    var n = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = CV.rngArt.next() * 2 - 1;
    return buf;
  }
  var noiseCache = null;
  function noise(when, dur, gain, freq, type, bus) {
    if (!noiseCache) noiseCache = noiseBuffer(1.0);
    var src = ctx.createBufferSource();
    src.buffer = noiseCache;
    src.playbackRate.value = 1 + CV.rngArt.next() * 0.2;
    var fl = ctx.createBiquadFilter();
    fl.type = type || 'highpass';
    fl.frequency.value = freq;
    var g = ctx.createGain();
    env(g, when, 0.002, dur, gain);
    src.connect(fl); fl.connect(g); g.connect(bus || musicBus);
    src.start(when); src.stop(when + dur + 0.02);
  }

  function kick(when, gain) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, when);
    o.frequency.exponentialRampToValueAtTime(38, when + 0.11);
    env(g, when, 0.003, 0.16, gain * 0.55);
    o.connect(g); g.connect(musicBus);
    o.start(when); o.stop(when + 0.2);
    noise(when, 0.03, gain * 0.12, 900);
  }
  function snare(when, gain) { noise(when, 0.13, gain * 0.22, 1400); }
  function hat(when, gain) { noise(when, 0.035, gain * 0.13, 7000); }

  /* --- SFX ----------------------------------------------------------------- */

  function blip(freq, freq2, dur, type, gain, filt) {
    if (!ctx || !enabled) return;
    var when = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, when);
    if (freq2) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), when + dur);
    env(g, when, 0.004, dur, gain === undefined ? 0.16 : gain);
    var last = g;
    if (filt) {
      var fl = ctx.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.value = filt; fl.Q.value = 2;
      g.connect(fl); last = fl;
    }
    o.connect(g); last.connect(sfxBus);
    o.start(when); o.stop(when + dur + 0.03);
  }

  function noiseHit(dur, freq, gain, type) {
    if (!ctx || !enabled) return;
    noise(ctx.currentTime, dur, gain, freq, type || 'highpass', sfxBus);
  }

  var SFX = {
    jump:       function () { blip(340, 700, 0.10, 'square', 0.10, 2400); },
    land:       function () { noiseHit(0.07, 700, 0.10, 'lowpass'); blip(120, 60, .07, 'sine', .12); },
    dash:       function () { noiseHit(0.14, 1800, 0.14); blip(700, 220, 0.12, 'sawtooth', 0.08, 3000); },
    swing:      function () { noiseHit(0.07, 2600, 0.09); },
    swingHeavy: function () { noiseHit(0.13, 900, 0.15, 'bandpass'); blip(90, 50, .12, 'square', .10); },
    whiff:      function () { noiseHit(0.05, 4000, 0.035); },
    hit:        function () { blip(560, 180, 0.09, 'square', 0.15); noiseHit(0.06, 2200, 0.10); },
    hitHeavy:   function () { blip(220, 70, 0.16, 'square', 0.20); noiseHit(0.12, 900, 0.16, 'lowpass'); },
    block:      function () { blip(1100, 900, 0.06, 'square', 0.10); noiseHit(.05, 5000, .07); },
    hurt:       function () { blip(300, 90, 0.24, 'sawtooth', 0.22, 1400); noiseHit(.14, 600, .14, 'lowpass'); },
    death:      function () { blip(420, 40, 0.9, 'sawtooth', 0.24, 900); noiseHit(.6, 400, .16, 'lowpass'); },
    destroy:    function () { noiseHit(0.22, 500, 0.16, 'lowpass'); blip(240, 60, 0.18, 'square', 0.13); },
    pickup:     function () { blip(660, 1320, 0.12, 'triangle', 0.16); blip(990, 1980, 0.16, 'sine', 0.10); },
    save:       function () { blip(520, 780, 0.18, 'sine', 0.16); blip(780, 1170, 0.26, 'sine', 0.12); },
    terminal:   function () { blip(880, 880, 0.05, 'square', 0.07); },
    type:       function () { blip(1500 + CV.rngArt.next() * 400, 0, 0.015, 'square', 0.035); },
    ui:         function () { blip(1200, 1600, 0.04, 'square', 0.07); },
    uiBack:     function () { blip(800, 500, 0.06, 'square', 0.07); },
    deny:       function () { blip(200, 140, 0.14, 'square', 0.12); },
    door:       function () { noiseHit(0.3, 400, 0.10, 'lowpass'); },
    morph:      function () { blip(300, 1200, 0.30, 'sawtooth', 0.14, 3000); noiseHit(.24, 1600, .10); },
    emp:        function () { blip(1800, 120, 0.45, 'sawtooth', 0.20, 4000); noiseHit(.3, 1200, .14); },
    cutter:     function () { blip(2200, 400, 0.28, 'square', 0.14, 5000); },
    overclock:  function () { blip(220, 880, 0.5, 'sawtooth', 0.16, 2600); },
    slamStart:  function () { blip(600, 200, 0.12, 'triangle', 0.10); },
    slam:       function () { blip(140, 40, 0.28, 'square', 0.24); noiseHit(0.24, 400, 0.20, 'lowpass'); },
    break:      function () { noiseHit(0.3, 800, 0.22, 'bandpass'); blip(300, 80, .2, 'square', .16); },
    grapple:    function () { blip(500, 1400, 0.12, 'square', 0.11, 3000); },
    grappleHit: function () { blip(900, 300, 0.14, 'square', 0.13); },
    charge:     function () { blip(180, 520, 0.5, 'sawtooth', 0.11, 1800); },
    alarm:      function () { blip(880, 660, 0.2, 'square', 0.14); blip(660, 880, 0.2, 'square', 0.10); },
    enemyShoot: function () { blip(700, 260, 0.09, 'square', 0.10); },
    enemyLunge: function () { blip(260, 520, 0.12, 'sawtooth', 0.10); },
    turret:     function () { blip(1400, 500, 0.10, 'sawtooth', 0.12, 3000); },
    shoot:      function () { blip(900, 1600, 0.06, 'square', 0.09); },
    blink:      function () { blip(1600, 400, 0.10, 'sine', 0.10); },
    machine:    function () { blip(120, 90, 0.3, 'square', 0.12, 800); },
    compile:    function () { blip(400, 1600, 0.14, 'square', 0.10, 4000); },
    layerSwap:  function () { blip(200, 2000, 0.4, 'sawtooth', 0.18, 6000); noiseHit(.3, 2000, .12); },
    bossDown:   function () { blip(320, 40, 1.2, 'sawtooth', 0.26, 1200); noiseHit(.9, 300, .2, 'lowpass'); },
    heal:       function () { blip(440, 880, 0.3, 'sine', 0.14); }
  };

  A.sfx = function (name) {
    if (!ctx || !enabled || CV.Settings.sfxVolume <= 0) return;
    var f = SFX[name];
    if (f) f();
  };

  A.available = function () { return !!ctx; };

})(window.CV = window.CV || {});
