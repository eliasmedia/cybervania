# CYBERVANIA — REDESIGN PLAN (v2)

Written after playtest feedback on v1. This supersedes the rendering and world-structure
sections of `TECHNICAL_DESIGN.md`; the story and world *fiction* carry over unchanged.

## 1. What the playtest found

| Feedback | Assessment |
|---|---|
| "Feels like Super Meat Boy, not Hollow Knight" | **Correct.** v1 leans on spike fields, precision gaps and 1-tile ledges. Hollow Knight's rooms are large, open and forgiving; the tension is in exploration and encounter, not in pixel-perfect jumps. |
| "Game design is super simplistic" | **Correct.** 16×16 flat-shaded tiles with a 1px highlight. There is no depth, no real light, no material. |
| "Every screen feels like a new stage with warps" | **Correct, and structural.** v1 is a room graph with a wipe transition on every door. That is a fundamentally different feeling from one continuous world. |
| "Unplayable" | Accepted. The automated suite verified traversability and crash-freedom, which is orthogonal to whether the thing is good. |

**Root cause:** v1 optimised for the *technical* constraints in the brief (runs from
`file://`, no dependencies, no assets) and let those constraints dictate the art
direction. That was the wrong trade. The constraints are satisfiable without a flat
tile renderer.

## 2. The rendering answer — validated, not theorised

`prototype-3d.html` is a working proof. Open it and press **P** to toggle the treatment.

**The technique:** build the world as real 3D geometry, light it properly, render it to a
small offscreen buffer (480×270), then snap the result to a fixed palette with ordered
dithering and upscale it with nearest-neighbour. This is what Dead Cells, Eastward and the
HD-2D games do — the difference between them is only whether the 3D→2D step happens
offline or per frame. Doing it per frame means the lighting is live: a neon sign actually
illuminates the wet street, and the shadow it casts moves.

**Measured in the prototype, in this browser:**

| Scene | Frame cost | Draws | Triangles |
|---|---|---|---|
| Street, 480×270, full pixel treatment | **0.84 ms** | 178 | 4,062 |
| Street, 854×480, raw 3D | 0.77 ms | 178 | 4,062 |
| Factory interior, 480×270 | 3.37 ms | 146 | 2,006 |

Budget is 16.7 ms. There is roughly 5–20× headroom, and the palette search is free
precisely *because* we render small.

**Constraints that survive:** three.js r128 is vendored locally as a UMD build
(`vendor/three.min.js`, 589 KB), so it loads as a classic `<script>` and the page still
opens from `file://` with no server and no build step.

**The one honest limitation:** I cannot model in Blender from here. So geometry and
textures are generated procedurally in code (`proto/kit.js`, `proto/textures.js`) —
modular panels, pipes, girders, catwalks, fans, cables, signs, and Canvas2D-generated
surface maps with panel lines, bolts, grime, rust streaks and stencilled markings. For a
kitbashed industrial city this is a genuinely good fit; it is roughly how such an
environment gets assembled anyway. If you *do* want authored models later, the path is
open: drop `.glb` files next to the page and load them — but that reintroduces the
`file://` restriction, so it should be a deliberate choice.

## 3. The world answer — one continuous space

The prototype replaces the room graph entirely.

- The world is a **grid of 24×24-unit chunks** in one shared coordinate space.
- A **macro-map** (`proto/world.js`, one character per chunk) authors the whole world at
  a glance — the equivalent of a Hollow Knight world map before any detail exists.
- Chunks within a radius of the player are **built on demand and disposed behind them**.
  Only ~15 chunks are resident at any moment.
- Neighbouring chunks share a floor-height convention at the seam, so **there is no
  boundary to see**. No doors, no wipes, no loading screens. You walk.

Verified in the prototype: walking continuously across chunk borders streams geometry in
and out with no hitch and no transition.

## 4. What changes, what survives

**Survives unchanged:** the entire fiction — ATLAS, R-17, Dr Halder, the Data Sphere
premise, the three endings, all 24 lore entries, the four transformations and twelve
modules as *design*. `STORY.md`, `GAME_DESIGN.md` §3–5 and `WORLD_DESIGN.md` §2 stay.

**Survives with re-tuning:** the character controller. The maths is sound (coyote time,
buffering, variable jump, corner correction); the *values* move toward weight and float.
The prototype already runs the retuned numbers: slower top speed (9.5 u/s), longer coyote
(0.13 s), apex float, forgiving step-up over lips.

**Replaced:**
- Canvas2D tile renderer → three.js + pixel post chain
- Room graph + door transitions → chunk-streamed continuous world
- ASCII tilemaps → macro-map + procedural chunk builders + hand-placed set pieces
- Spike-field level design → large open spaces, hazards as rare punctuation

**Deleted:** `cybervania/src/render/*`, `cybervania/src/world/room.js`,
`cybervania/maps/*`. Roughly 4,000 lines. The rest of `cybervania/src` (player, combat,
enemies, bosses, modules, datasphere, ui, audio, save, debug) ports across with the
renderer calls swapped.

## 5. Level design principles for v2

The specific correction for "Meat Boy vs Hollow Knight":

1. **Rooms are big.** Minimum interesting space is roughly 2 screens wide and 1.5 tall.
   Corridors exist to connect caverns, not as content in themselves.
2. **Hazards are punctuation, not floor covering.** No spike carpets. A hazard should be
   a single readable object you route around, and contact costs health — not a life.
3. **Verticality over precision.** Height gained by exploring, not by frame-perfect
   jumps. Every gap should be clearable with a margin.
4. **Silence is content.** Long stretches with no enemy and no threat, where the only
   thing happening is the environment. That is where atmosphere lives.
5. **Landmarks.** Every region needs 3–4 things visible from a distance that you navigate
   *by*. In one continuous world this replaces the map as the primary orientation tool.
6. **The camera breathes.** Loose follow, wide framing, and it pulls back in large spaces.

## 6. Proposed order of work

| Phase | Deliverable |
|---|---|
| 1 | Promote the prototype to the main entry point; port the character controller properly (attack, dash, wall mechanics) |
| 2 | Chunk authoring pass: macro-map for the real world, hand-placed set pieces per chunk, landmarks |
| 3 | Port combat, enemies, bosses to 3D actors (same AI, new rendering) |
| 4 | Port Data Sphere as a shader/material state on the same geometry — the same world re-read, which is far stronger in 3D than it was in 2D |
| 5 | Port UI, save, audio, debug |
| 6 | Region art passes: each region gets its own kit pieces, palette and lighting rig |
| 7 | Playtest, tune, repeat |

## 7. Streaming performance — the hitch, diagnosed and fixed

Playtest reported frame drops when new chunks loaded. Profiling found **five** distinct
causes, only one of which was what it looked like.

| Cause | Effect | Fix |
|---|---|---|
| `T.make()` built a **new `CanvasTexture` per call** | a GPU texture upload for every sign in every chunk | cache textures by (canvas, repeat, filter) |
| Geometry dimensions were continuous random floats | every chunk missed the cache and uploaded fresh vertex buffers | **quantise dimensions to 1-unit steps** before cache lookup — a modular kit has a bounded piece set by definition |
| `animators` was a global array, never pruned | grew forever; disposed chunks kept animating; per-frame cost climbed the longer you played | animators recorded per chunk, dropped on dispose |
| `disposeChunk` disposed **nothing** | GPU memory leak | per-chunk resource record (geo/mat/animators) released on dispose |
| **1,047 shadow casters** | the shadow pass culled and re-rendered a thousand objects every frame | only structural geometry casts; greebles, pipes, railings, clutter, cables do not. Shadow map 1024→768, frustum tightened |

Plus: chunk building moved behind a **3 ms/frame budget queue** (nearest-first), and a
**boot pre-warm** builds 12 samples of every chunk type, renders once and disposes them,
so shader compilation and buffer uploads all happen before play rather than at the first
boundary crossing.

**Measured, rAF-paced, 700 frames walking continuously across 10 chunk boundaries:**

| | Before | After |
|---|---|---|
| Median frame | 4.5 ms | **0.9 ms** |
| p95 | 37.2 ms | **1.6 ms** |
| p99 | — | 7.4 ms |
| Scene meshes | 1,794 | **570** |
| Shadow casters | 1,047 | **34** |
| Geometry cache growth while playing | unbounded | +5 (stable) |

CPU-side work — streaming, chunk building, physics, animators — measures **0.0 ms median,
0.8 ms max, zero spikes**. Chunk construction itself costs 0.1–1.0 ms per chunk.

**Remaining, and honestly not fully solved:** about 5 frames in 700 (0.7%) still spike to
25–50 ms. They are inside the GL submit path, not in game logic, and they survive with
shadows disabled. I could not attribute them further in this environment. They are far
below what was there before but they are not zero, and a frame-time graph is now in the
HUD so this is measurable on your machine rather than a matter of impression.

## 8. Open decisions for you

1. **Scope of the world.** One continuous world is a much bigger authoring job per unit of
   content than discrete rooms. I would rather build 4 regions that feel alive than 14
   that feel generated. Which way do you want it?
2. **Keep or bin v1?** I would keep it in the repo as `v1-canvas/` for reference and cut it
   later, rather than deleting work that still has usable systems in it.
3. **Blender pipeline.** If you want authored models, you would need to produce the `.glb`
   files and accept serving over HTTP rather than `file://`. Worth it for hero props
   (bosses, the upload rig, ATLAS) even if the environment stays procedural.
