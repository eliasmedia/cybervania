# CYBERVANIA

A 2.5D cyberpunk metroidvania in the browser. No build step, no runtime dependencies,
no server.

> *A maintenance robot that the world's operating system cannot see wakes up in a city
> that no longer needs people, and has to decide whether saving humanity is worth
> destroying everything humanity built.*

## Current state

The 3D/pixel build is now the game. The original Canvas2D build is archived — playtest
feedback was that it read as a twitch platformer with disconnected screens rather than a
continuous, atmospheric world. See `REDESIGN.md` for the assessment and the plan.

| | What it is | Run it |
|---|---|---|
| **`cybervania.html`** | **The game.** Real 3D geometry rendered to a low-res buffer and snapped to a fixed palette. One continuous chunk-streamed world, no rooms and no transitions. | double-click it |
| `v1-canvas/` | Archived tile build. Complete and playable — 38 rooms, 6 bosses, full story — but superseded. Several systems port forward. | `v1-canvas/cybervania.html` |

## Playing

**Controls:** `A`/`D` or arrows to move · `Space` jump (hold for height, twice to double
jump) · `Shift` dash.

`J`/`Z` attack (three-hit combo) · `E` advances dialogue. Jump and attack are never
stolen by a conversation.

**Toggles:** `P` pixelation · `O` palette snap · `B` bloom · `L` scanlines · `R` internal
resolution. Press `P` to see the raw 3D underneath the treatment.

**Checks:** add `?validate` to the URL to run the authored-geometry checks at boot, and
`?dev` to bypass the browser cache while editing. Three checks run: headroom/pocket
detection, encounter-bypass detection (can a room be crossed without entering an enemy's
reach?), and reachability from the spawn. `REDESIGN.md §5b–5c` has the measured jump
envelope they are built on.

### How the look works

```
3D scene ─► 480x270 render target ─► bright pass ─► 2x separable blur
         └─────────────────────────► composite: bloom, Bayer dither,
                                      30-colour palette snap, scanlines,
                                      vignette, chromatic edge
                                   └─► nearest-upscaled to the canvas
```

Rendering small is what makes the palette search free — it runs on 130k pixels, not 2M.
Because the lighting is live rather than baked, a neon sign genuinely illuminates the wet
street and the shadow it throws moves with it.

### How the world works

One shared coordinate space, divided into 24×24-unit chunks. A macro-map in
`proto/world.js` authors the whole world at one character per chunk. Chunks near the
player are built on demand and disposed behind them — roughly 35 resident at a time.
Neighbouring chunks share a floor-height convention at the seam, so there is no boundary
to see.

### Performance

Measured rAF-paced over 700 frames of continuous walking across 10 chunk boundaries:
**median 0.9 ms, p95 1.6 ms, p99 7.4 ms** against a 16.7 ms budget. 570 meshes, 34 shadow
casters. CPU-side work (streaming, chunk building, physics) is 0.0 ms median. Live
frame-time figures and a hitch counter are in the on-screen HUD.

`REDESIGN.md §7` documents the five separate causes of the original streaming hitch and
what each fix bought.

### Assets

There are none. Geometry is kitbashed from primitives in `proto/kit.js`; surface textures
are generated with Canvas2D in `proto/textures.js` (panel lines, bolts, grime, rust
streaks, stencils, window grids). three.js r128 is vendored locally as a UMD build so the
page still opens from `file://`.

## Layout

```
cybervania.html        entry point
proto/
  textures.js          procedural Canvas2D surface textures
  lights.js            fixed-size light pool (see REDESIGN.md section 9)
  fx.js                pooled impact sparks
  authored.js          hand-authored chunk builder
  regions/undercity.js the opening, hand-built
  enemies.js           Crawler and Sentinel Eye
  game.js              health, triggers, dialogue, HUD
  validate.js          authored-geometry checks
  kit.js               modular geometry kit + per-chunk resource tracking
  world.js             macro-map, chunk builders, streaming
  player.js            character controller + R-17 geometry
  postfx.js            low-res target, bloom, dither, palette snap
  main.js              renderer, camera, atmosphere, loop, HUD
vendor/three.min.js    three.js r128 (UMD)
v1-canvas/             archived Canvas2D build
```

## Design documentation

| File | Contents |
|---|---|
| `REDESIGN.md` | **Start here.** Playtest assessment, the 3D decision, streaming architecture, performance work, open questions |
| `STORY.md` | Cast, timeline, act structure, the three endings — carries over unchanged |
| `GAME_DESIGN.md` | Identity, the four chassis, twelve modules, energy economy, combat feel |
| `WORLD_DESIGN.md` | All fourteen designed regions, connectivity, bosses, enemy roster |
| `PROGRESSION.md` | Gating vocabulary, critical path, collectibles, difficulty, accessibility |
| `TECHNICAL_DESIGN.md` | Architecture of the v1 build (superseded on rendering and world structure) |

## Requirements

A browser with WebGL. The game opens from `file://`; if your browser blocks local
scripts, serve the folder instead:

```bash
python3 -m http.server 8000
```
