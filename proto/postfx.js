/* CYBERVANIA 3D PROTOTYPE — proto/postfx.js
   The bit that turns a 3D render into pixel art.

   Chain:
     scene ──► low-res render target (e.g. 480x270, NEAREST)
            ──► bright-pass ──► separable blur x2 ──► bloom buffer (quarter res)
            ──► composite shader: bloom add, Bayer dither, palette snap,
                scanlines, vignette, chromatic edge
            ──► fullscreen quad, nearest-upscaled to the canvas

   Rendering at 480x270 means the expensive fragment work happens on 130k pixels
   instead of 2M, so the palette search below is essentially free. */
(function (P) {
  'use strict';

  var FX = P.PostFX = {};

  var renderer, lowRT, brightRT, blurRT, quadScene, quadCam, quadMesh;
  var brightMat, blurMat, compMat;
  var W = 480, H = 270;

  /* A deliberately small palette. Everything on screen snaps to one of these, which
     is what makes 3D lighting read as hand-authored pixel art instead of "3D but
     blurry". Cyan/magenta neon, sodium amber, cold steel, near-black. */
  var PALETTE = [
    0x05060a, 0x0a0d16, 0x111726, 0x1a2333, 0x25303f, 0x33445c, 0x4d6484,
    0x7d94ad, 0xb6c8d8, 0xeef6ff,
    0x0d3244, 0x1d6f8c, 0x4de3ff, 0xa8f4ff,
    0x3d1030, 0x8c1c53, 0xff3d9e, 0xffa8d4,
    0x4a2a10, 0x8c5c14, 0xffb23d, 0xffe0a0,
    0x2a1018, 0x8c1f2c, 0xff4459,
    0x123322, 0x1c6b3f, 0x5cff9d,
    0x2a1a3a, 0x8b5cf6
  ];

  function paletteUniform() {
    var arr = [];
    for (var i = 0; i < PALETTE.length; i++) {
      var c = PALETTE[i];
      arr.push(new THREE.Vector3(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255));
    }
    return arr;
  }

  var VERT = [
    'varying vec2 vUv;',
    'void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
  ].join('\n');

  /* --- bright pass ---------------------------------------------------------- */
  var BRIGHT = [
    'uniform sampler2D tDiffuse; uniform float threshold; varying vec2 vUv;',
    'void main(){',
    '  vec3 c = texture2D(tDiffuse, vUv).rgb;',
    '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
    '  float k = max(0.0, l - threshold) / max(0.0001, 1.0 - threshold);',
    '  gl_FragColor = vec4(c * k * 1.6, 1.0);',
    '}'
  ].join('\n');

  /* --- separable gaussian --------------------------------------------------- */
  var BLUR = [
    'uniform sampler2D tDiffuse; uniform vec2 dir; uniform vec2 texel; varying vec2 vUv;',
    'void main(){',
    '  vec3 s = texture2D(tDiffuse, vUv).rgb * 0.227;',
    '  s += texture2D(tDiffuse, vUv + dir*texel*1.3846).rgb * 0.316;',
    '  s += texture2D(tDiffuse, vUv - dir*texel*1.3846).rgb * 0.316;',
    '  s += texture2D(tDiffuse, vUv + dir*texel*3.2308).rgb * 0.070;',
    '  s += texture2D(tDiffuse, vUv - dir*texel*3.2308).rgb * 0.070;',
    '  gl_FragColor = vec4(s, 1.0);',
    '}'
  ].join('\n');

  /* --- composite ------------------------------------------------------------- */
  var COMP = [
    '#define PAL_N ' + PALETTE.length,
    'uniform sampler2D tDiffuse;',
    'uniform sampler2D tBloom;',
    'uniform sampler2D tHUD;',
    'uniform float uHUD;',
    'uniform vec3  palette[PAL_N];',
    'uniform float uTime;',
    'uniform float uPixelate;   // 0 = raw 3D, 1 = full pixel treatment',
    'uniform float uPalette;    // palette snap strength',
    'uniform float uBloom;',
    'uniform float uScan;',
    'uniform vec2  uRes;',
    'varying vec2 vUv;',

    /* Ordered 4x4 Bayer matrix. Dithering *before* the palette snap is what stops
       smooth 3D gradients from turning into hard bands. */
    'float bayer(vec2 p){',
    '  int x = int(mod(p.x, 4.0)); int y = int(mod(p.y, 4.0));',
    '  int i = x + y * 4;',
    '  float m[16];',
    '  m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;',
    '  m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;',
    '  m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;',
    '  m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;',
    '  float v = 0.0;',
    '  for (int k = 0; k < 16; k++) { if (k == i) v = m[k]; }',
    '  return v / 16.0 - 0.5;',
    '}',

    'vec3 snap(vec3 c){',
    '  float bd = 1e9; vec3 best = c;',
    '  for (int i = 0; i < PAL_N; i++){',
    '    vec3 p = palette[i];',
    '    vec3 d = c - p;',
    /*   weight green higher — matches human luminance perception, so the snap
         picks a perceptually closer colour rather than a numerically closer one */
    '    float dist = d.r*d.r*0.30 + d.g*d.g*0.59 + d.b*d.b*0.11;',
    '    if (dist < bd) { bd = dist; best = p; }',
    '  }',
    '  return best;',
    '}',

    'void main(){',
    '  vec2 uv = vUv;',
    '  vec3 c = texture2D(tDiffuse, uv).rgb;',
    '  vec3 b = texture2D(tBloom, uv).rgb;',
    '  c += b * uBloom;',

    /* subtle chromatic separation toward the edges — CRT convergence error */
    '  float edge = length(uv - 0.5);',
    '  float ca = 0.0016 * edge * uPixelate;',
    '  c.r = texture2D(tDiffuse, uv + vec2(ca, 0.0)).r + b.r * uBloom;',
    '  c.b = texture2D(tDiffuse, uv - vec2(ca, 0.0)).b + b.b * uBloom;',

    '  c = pow(c, vec3(0.9));',                 // gentle lift so shadows keep detail
    '  c = clamp(c, 0.0, 1.0);',

    '  vec2 px = uv * uRes;',
    '  vec3 dithered = clamp(c + bayer(px) * 0.055 * uPixelate, 0.0, 1.0);',
    '  vec3 snapped = snap(dithered);',
    '  c = mix(c, snapped, uPalette * uPixelate);',

    /* scanlines + aperture grille, scaled so they land on the low-res grid */
    '  float sl = 1.0 - uScan * 0.16 * step(1.0, mod(px.y, 2.0));',
    '  float ap = 1.0 - uScan * 0.05 * step(2.0, mod(px.x, 3.0));',
    '  c *= sl * ap;',

    '  float vig = smoothstep(0.95, 0.35, edge);',
    '  c *= mix(1.0, vig, 0.55);',

    /* HUD is composited last and deliberately AFTER the palette snap and scanlines:
       readability of health and dialogue must never be degraded by the CRT treatment. */
    /* No manual Y flip: three.js already uploads the canvas with flipY, and the
       fullscreen quad's uv origin matches the render target's. Flipping here too
       put the dialogue box on the ceiling. */
    '  vec4 hud = texture2D(tHUD, uv);',
    '  c = mix(c, hud.rgb, hud.a * uHUD);',

    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  FX.init = function (rend, width, height) {
    renderer = rend;
    W = width; H = height;

    var optsNearest = {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
      depthBuffer: true, stencilBuffer: false
    };
    lowRT = new THREE.WebGLRenderTarget(W, H, optsNearest);

    var optsLinear = {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false
    };
    brightRT = new THREE.WebGLRenderTarget(W >> 1, H >> 1, optsLinear);
    blurRT = new THREE.WebGLRenderTarget(W >> 1, H >> 1, optsLinear);

    quadScene = new THREE.Scene();
    quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    quadMesh.frustumCulled = false;
    quadScene.add(quadMesh);

    brightMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: BRIGHT,
      uniforms: { tDiffuse: { value: null }, threshold: { value: 0.62 } }
    });
    blurMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: BLUR,
      uniforms: {
        tDiffuse: { value: null },
        dir: { value: new THREE.Vector2(1, 0) },
        texel: { value: new THREE.Vector2(1 / (W >> 1), 1 / (H >> 1)) }
      }
    });
    compMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: COMP,
      uniforms: {
        tDiffuse: { value: null }, tBloom: { value: null },
        tHUD: { value: null }, uHUD: { value: 1 },
        palette: { value: paletteUniform() },
        uTime: { value: 0 },
        uPixelate: { value: 1 },
        uPalette: { value: 0.85 },
        uBloom: { value: 1.0 },
        uScan: { value: 1.0 },
        uRes: { value: new THREE.Vector2(W, H) }
      }
    });

    FX.target = lowRT;
    FX.uniforms = compMat.uniforms;
    FX.setHUD = function (tex) { compMat.uniforms.tHUD.value = tex; };
  };

  FX.resize = function (width, height) {
    W = width; H = height;
    lowRT.setSize(W, H);
    brightRT.setSize(W >> 1, H >> 1);
    blurRT.setSize(W >> 1, H >> 1);
    blurMat.uniforms.texel.value.set(1 / (W >> 1), 1 / (H >> 1));
    compMat.uniforms.uRes.value.set(W, H);
  };

  function blit(mat, target) {
    quadMesh.material = mat;
    renderer.setRenderTarget(target || null);
    renderer.render(quadScene, quadCam);
  }

  /* Render the scene through the whole chain. */
  FX.render = function (scene, camera, time) {
    compMat.uniforms.uTime.value = time;

    renderer.setRenderTarget(lowRT);
    renderer.clear();
    renderer.info.reset();
    renderer.render(scene, camera);
    /* Capture stats for the scene pass only — the post passes that follow would
       otherwise overwrite them with "1 draw, 2 triangles". */
    FX.sceneDraws = renderer.info.render.calls;
    FX.sceneTris = renderer.info.render.triangles;

    if (compMat.uniforms.uBloom.value > 0.01) {
      brightMat.uniforms.tDiffuse.value = lowRT.texture;
      blit(brightMat, brightRT);

      blurMat.uniforms.tDiffuse.value = brightRT.texture;
      blurMat.uniforms.dir.value.set(1, 0);
      blit(blurMat, blurRT);

      blurMat.uniforms.tDiffuse.value = blurRT.texture;
      blurMat.uniforms.dir.value.set(0, 1);
      blit(blurMat, brightRT);
    }

    compMat.uniforms.tDiffuse.value = lowRT.texture;
    compMat.uniforms.tBloom.value = brightRT.texture;
    blit(compMat, null);
  };

})(window.PROTO = window.PROTO || {});
