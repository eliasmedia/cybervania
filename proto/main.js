/* CYBERVANIA 3D PROTOTYPE — proto/main.js
   Bootstrap: renderer, camera, atmosphere, rain, loop, input, debug overlay. */
(function (P) {
  'use strict';

  var renderer, scene, camera, clock;
  var LOW_W = 480, LOW_H = 270;
  var input = { left: 0, right: 0, up: 0, down: 0,
                jumpPressed: 0, jumpReleased: 0, dashPressed: 0, attackPressed: 0 };
  var rain, rainGeo;
  var stats = { fps: 60, acc: 0, frames: 0, worst: 0, hitches: 0, hist: new Float32Array(120), hi: 0 };
  var time = 0;
  var camX = 0, camY = 0, look = 0;

  P.opts = { pixelate: 1, palette: 0.85, bloom: 1.0, scan: 1.0, res: 1, freeCam: 0 };

  P.boot = function (canvas) {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070e);
    /* Exponential fog does the heavy lifting for depth separation — it is what makes
       the background towers sit *behind* the play plane rather than beside it. */
    scene.fog = new THREE.FogExp2(0x0e1526, 0.0075);

    camera = new THREE.PerspectiveCamera(26, LOW_W / LOW_H, 1, 600);
    camera.position.set(0, 0, 48);

    // --- lighting rig -------------------------------------------------------
    var hemi = new THREE.HemisphereLight(0x3d5a80, 0x2a1a10, 1.15);
    scene.add(hemi);

    var key = new THREE.DirectionalLight(0xa8c8ff, 1.05);
    key.position.set(-14, 26, 18);
    key.castShadow = true;
    key.shadow.mapSize.set(768, 768);
    /* Tight frustum: the shadow only has to cover what the camera can see. A loose
       frustum wastes both resolution and fill rate. */
    key.shadow.camera.left = -22; key.shadow.camera.right = 22;
    key.shadow.camera.top = 20; key.shadow.camera.bottom = -20;
    key.shadow.camera.near = 1; key.shadow.camera.far = 70;
    key.shadow.bias = -0.0016;
    scene.add(key);
    scene.add(key.target);
    P.keyLight = key;

    // warm bounce from the city below
    var fill = new THREE.DirectionalLight(0xff9a4a, 0.45);
    fill.position.set(12, -8, 10);
    scene.add(fill);

    P.Tex && P.Kit && P.World.init(scene);
    if (P.Enemies) P.Enemies.init(scene, P.World.mats);
    P.Player.build(scene, P.World.mats);

    var sp = P.World.spawnPoint();
    P.Player.spawn(sp.x, sp.y);
    camX = sp.x; camY = sp.y;
    P.World.stream(sp.x, sp.y);
    P.World.flush();
    /* Authored spawn points only exist once their chunk has been built, so re-place
       the player after the first flush. */
    if (P.Authored && P.Authored.spawns.start) {
      sp = P.Authored.spawns.start;
      P.Player.spawn(sp.x, sp.y);
      camX = sp.x; camY = sp.y;
      P.World.stream(sp.x, sp.y);
      P.World.flush();
    }
    if (P.Game) P.Game.respawn = { x: sp.x, y: sp.y };

    buildRain();

    P.PostFX.init(renderer, LOW_W, LOW_H);
    if (P.Game) { P.Game.initHUD(LOW_W, LOW_H); P.PostFX.setHUD(P.Game.hudTexture); }
    applyOpts();

    camera.position.set(camX, camY, 48);
    camera.lookAt(camX, camY, 0);
    prewarm();

    bindInput(canvas);
    clock = new THREE.Clock();
    resize();
    window.addEventListener('resize', resize);
    P.renderer = renderer;
    P.scene = scene;
    P.camera = camera;
    P.ready = true;
  };

  /* Compile every shader program the world can produce, before play starts.

     `renderer.compile` only covers what is currently in the scene, so warming the spawn
     neighbourhood is not enough: the first time the player walks into a chunk type they
     have not seen, the driver compiles that material and the frame stalls. Here we build
     one chunk of every type, render once so every program is linked, then dispose them.
     Costs a few hundred ms at boot and removes the whole class of first-visit hitch. */
  function prewarm() {
    var W = P.World;
    var seen = {}, temp = [];
    /* Several samples per chunk type, not one. Each chunk seeds its own RNG, so
       different coordinates produce different quantised sizes — and every new size is
       a fresh GPU buffer upload the first time it is drawn. Warming a spread of samples
       fills the geometry cache up front, which is what removes the residual hitch on
       the first few chunk boundaries. */
    var SAMPLES = 12;
    for (var cy = 0; cy < W.rows; cy++) {
      for (var cx = 0; cx < W.cols; cx++) {
        var t = W.typeAt(cx, cy);
        if ((seen[t] || 0) >= SAMPLES) continue;
        seen[t] = (seen[t] || 0) + 1;
        if (!W.chunks[cx + ',' + cy]) { W.buildChunk(cx, cy); temp.push(cx + ',' + cy); }
      }
    }
    renderer.compile(scene, camera);
    /* One real render forces program linking and texture upload for everything. */
    P.PostFX.render(scene, camera, 0);
    for (var i = 0; i < temp.length; i++) W.disposeChunk(temp[i]);
    W.stream(P.Player.x, P.Player.y);
    W.flush();
    P.prewarmed = Object.keys(seen).length;
  }
  P.prewarm = prewarm;

  /* --- rain: one instanced streak field that follows the camera ------------- */
  function buildRain() {
    var N = 1400;
    rainGeo = new THREE.BufferGeometry();
    var pos = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 130;
      pos[i * 3 + 1] = Math.random() * 60;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 46 - 6;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({
      color: 0xbfe4ff, size: 0.16, transparent: true, opacity: 0.75,
      depthWrite: false, sizeAttenuation: true
    });
    rain = new THREE.Points(rainGeo, mat);
    rain.frustumCulled = false;
    scene.add(rain);
  }

  function updateRain(dt) {
    var p = rainGeo.attributes.position.array;
    var topY = camY + 42;
    for (var i = 0; i < p.length; i += 3) {
      p[i + 1] -= (26 + (i % 7) * 3) * dt;
      p[i] += 4 * dt;                                  // wind
      if (p[i + 1] < camY - 32) {
        p[i + 1] = topY;
        p[i] = camX + (Math.random() - 0.5) * 130;
        p[i + 2] = (Math.random() - 0.5) * 46 - 6;
      }
    }
    rainGeo.attributes.position.needsUpdate = true;
  }

  /* --- input ---------------------------------------------------------------- */
  function bindInput(canvas) {
    var down = {};
    window.addEventListener('keydown', function (e) {
      if (down[e.code]) return;
      down[e.code] = 1;
      if (e.code === 'Space' || e.code === 'KeyX' || e.code === 'KeyW' || e.code === 'ArrowUp') input.jumpPressed = 1;
      if (e.code === 'ShiftLeft' || e.code === 'KeyC') input.dashPressed = 1;
      if (e.code === 'KeyJ' || e.code === 'KeyZ') input.attackPressed = 1;
      /* Any confirm key advances dialogue instead of acting on the world. */
      if (P.Game && P.Game.dialogue.active &&
          ['Space','KeyX','KeyJ','KeyZ','KeyE','Enter'].indexOf(e.code) >= 0) {
        P.Game.advance();
        input.jumpPressed = 0; input.attackPressed = 0;
      }
      // toggles
      if (e.code === 'KeyP') { P.opts.pixelate = P.opts.pixelate ? 0 : 1; applyOpts(); }
      if (e.code === 'KeyO') { P.opts.palette = P.opts.palette > 0 ? 0 : 0.85; applyOpts(); }
      if (e.code === 'KeyB') { P.opts.bloom = P.opts.bloom > 0 ? 0 : 1.0; applyOpts(); }
      if (e.code === 'KeyL') { P.opts.scan = P.opts.scan > 0 ? 0 : 1.0; applyOpts(); }
      if (e.code === 'KeyR') { cycleRes(); }
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
    }, { passive: false });
    window.addEventListener('keyup', function (e) {
      down[e.code] = 0;
      if (e.code === 'Space' || e.code === 'KeyX' || e.code === 'KeyW' || e.code === 'ArrowUp') input.jumpReleased = 1;
    });
    window.addEventListener('blur', function () { down = {}; });
    P.keys = down;
    canvas.addEventListener('mousedown', function () { canvas.focus(); });
  }

  var RESOLUTIONS = [[320, 180], [426, 240], [480, 270], [640, 360], [854, 480]];
  var resIdx = 2;
  function cycleRes() {
    resIdx = (resIdx + 1) % RESOLUTIONS.length;
    LOW_W = RESOLUTIONS[resIdx][0]; LOW_H = RESOLUTIONS[resIdx][1];
    camera.aspect = LOW_W / LOW_H;
    camera.updateProjectionMatrix();
    P.PostFX.resize(LOW_W, LOW_H);
    if (P.Game) P.Game.resizeHUD(LOW_W, LOW_H);
    resize();
  }
  P.cycleRes = cycleRes;

  function applyOpts() {
    var u = P.PostFX.uniforms;
    if (!u) return;
    u.uPixelate.value = P.opts.pixelate;
    u.uPalette.value = P.opts.palette;
    u.uBloom.value = P.opts.bloom;
    u.uScan.value = P.opts.scan;
  }
  P.applyOpts = applyOpts;

  function resize() {
    /* Fit the low-res aspect inside the window and letterbox. Stretching a 16:9
       framebuffer over a portrait window destroys the pixel grid. */
    var w = window.innerWidth, h = window.innerHeight;
    var aspect = LOW_W / LOW_H;
    var dw = w, dh = Math.round(w / aspect);
    if (dh > h) { dh = h; dw = Math.round(h * aspect); }
    renderer.setSize(dw, dh, false);
    var c = renderer.domElement;
    c.style.width = dw + 'px';
    c.style.height = dh + 'px';
    c.style.position = 'absolute';
    c.style.left = Math.round((w - dw) / 2) + 'px';
    c.style.top = Math.round((h - dh) / 2) + 'px';
  }
  P.resize = resize;

  /* --- frame ---------------------------------------------------------------- */
  P.step = function (dt) {
    time += dt;

    var kd = P.keys || {};
    var locked = P.Game && P.Game.locked();
    input.left = (!locked && (kd.ArrowLeft || kd.KeyA)) ? 1 : 0;
    input.right = (!locked && (kd.ArrowRight || kd.KeyD)) ? 1 : 0;
    if (locked) { input.jumpPressed = 0; input.dashPressed = 0; input.attackPressed = 0; }

    P.Player.update(dt, input);
    input.jumpPressed = 0; input.jumpReleased = 0; input.dashPressed = 0;
    input.attackPressed = 0;

    if (P.Enemies) P.Enemies.update(dt);
    if (P.Game) P.Game.update(dt);

    P.World.stream(P.Player.x, P.Player.y);
    /* Amortised chunk building. 3 ms is comfortably inside a 16.7 ms frame and the
       streaming radius keeps a ring of slack ahead of the player, so nothing pops in. */
    P.World.pump(3);
    P.Kit.tick(time, dt);
    updateRain(dt);

    /* Camera: damped follow with velocity look-ahead. Deliberately loose — a tight
       camera makes a world feel like a corridor. */
    look += (P.Player.vx * 0.42 - look) * Math.min(1, dt * 3);
    var tx = P.Player.x + look;
    var ty = P.Player.y + 3.4;
    camX += (tx - camX) * Math.min(1, dt * 4.2);
    camY += (ty - camY) * Math.min(1, dt * 3.2);
    var sh = (P.Game && P.Game.shake) || 0;
    var shx = sh > 0 ? (Math.random() - 0.5) * sh * 1.6 : 0;
    var shy = sh > 0 ? (Math.random() - 0.5) * sh * 1.6 : 0;
    camera.position.set(camX + shx, camY + shy, 48);
    camera.lookAt(camX + shx, camY + shy, 0);

    // keep the shadow frustum on the player
    P.keyLight.position.set(camX - 14, camY + 26, 18);
    P.keyLight.target.position.set(camX, camY, 0);
    P.keyLight.target.updateMatrixWorld();

    rain.position.set(0, 0, 0);
  };

  P.render = function () {
    if (P.Game) P.Game.drawHUD(time);
    P.PostFX.render(scene, camera, time);
  };

  P.loop = function () {
    var t0 = performance.now();
    var dt = Math.min(0.05, clock.getDelta());
    stats.acc += dt; stats.frames++;
    if (stats.acc > 0.5) { stats.fps = stats.frames / stats.acc; stats.acc = 0; stats.frames = 0; }
    P.step(dt);
    P.render();
    var ms = performance.now() - t0;
    stats.hist[stats.hi] = ms; stats.hi = (stats.hi + 1) % stats.hist.length;
    /* Anything over one 60 Hz frame is a hitch the player can feel. Count them so the
       fix is measurable rather than a matter of opinion. */
    if (ms > 16.7) stats.hitches++;
    if (ms > stats.worst) stats.worst = ms;
    P.hud();
    requestAnimationFrame(P.loop);
  };
  P.stats = stats;
  P.resetStats = function () { stats.worst = 0; stats.hitches = 0; };

  P.info = function () {
    var s = P.World.stats || {};
    return {
      fps: stats.fps.toFixed(0),
      res: LOW_W + 'x' + LOW_H,
      chunks: s.live, colliders: s.colliders,
      chunk: s.cx + ',' + s.cy + ' [' + (s.type === ' ' ? 'SKY' : s.type) + ']',
      pos: P.Player.x.toFixed(1) + ', ' + P.Player.y.toFixed(1),
      draws: P.PostFX.sceneDraws || 0,
      tris: P.PostFX.sceneTris || 0,
      worst: stats.worst.toFixed(1),
      hitches: stats.hitches,
      pending: (P.World.stats && P.World.stats.pending) || 0,
      geo: P.Kit.geoCount(),
      anim: P.Kit.animatorCount(),
      tex: P.Tex.textureCount()
    };
  };

  P.hud = function () {
    var el = document.getElementById('hud');
    if (!el) return;
    var i = P.info();
    el.textContent =
      'FPS ' + i.fps + '   ' + i.res + '   draws ' + i.draws + '   tris ' + i.tris + '\n' +
      'worst ' + i.worst + ' ms   hitches ' + i.hitches + '   pending ' + i.pending + '\n' +
      'chunk ' + i.chunk + '   live ' + i.chunks + '   geo ' + i.geo +
        '   tex ' + i.tex + '   anim ' + i.anim + '\n' +
      'pos ' + i.pos + '   hp ' + (P.Game ? P.Game.hp : '-') + '   enemies ' + ((P.World.stats && P.World.stats.enemies) || 0) + '\n' +
      '[P] pixelate ' + (P.opts.pixelate ? 'ON' : 'OFF') +
      '   [O] palette ' + (P.opts.palette ? 'ON' : 'OFF') +
      '   [B] bloom ' + (P.opts.bloom ? 'ON' : 'OFF') +
      '   [L] scanlines ' + (P.opts.scan ? 'ON' : 'OFF') +
      '   [R] resolution';
  };

})(window.PROTO = window.PROTO || {});
