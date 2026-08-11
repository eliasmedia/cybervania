# CYBERVANIA — TECHNICAL DESIGN

## 1. Stack decision

### The hard constraints

1. `cybervania.html` must run by **double-clicking it** (`file://`).
2. It must also drop onto **any static webserver** (`https://example.com/games/cybervania/cybervania.html`).
3. No backend, no database, no runtime Node, no build step required by the player.
4. Stable 60 FPS on a normal desktop browser.

Constraint (1) is the one that quietly kills most "obvious" architectures, and it drove
almost every decision below.

### Candidates evaluated

| Option | Verdict |
|---|---|
| **Phaser 3** | Genuinely good at 2D platformers, but it is a ~1.2 MB dependency whose arcade physics we would fight (we want *custom* swept-AABB movement with coyote time, corner correction and per-frame tuning — that is the whole game). Its loader is `fetch`/XHR-based, which fails under `file://`. Rejected. |
| **PixiJS** | Excellent WebGL batcher, but it is a *renderer only* — we would still hand-write physics, camera, tilemaps, collision, audio. We would take on a dependency and still write 90% of the engine. Its asset loader is also `fetch`-based. Rejected. |
| **Three.js** | A 3D engine for a 2D game. "2.5D" here means *parallax layers*, not real 3D. Rejected as unnecessary complexity (rule 24: "Vermeide unnötige technische Komplexität"). |
| **WebGL by hand** | Fastest ceiling, but shader plumbing, batching and text rendering cost weeks and buy us nothing at our sprite counts. Rejected. |
| **Canvas 2D + vanilla ES5-style classic scripts** | **Chosen.** |

### Why Canvas 2D wins here

- **It is the only option that survives `file://` cleanly.** Classic `<script src="...">` tags
  execute from `file://`; ES modules do **not** (they are subject to CORS and fail with
  `Origin 'null' has been blocked`). So the codebase uses classic scripts with an explicit
  load order and a single global namespace `CV`.
- Our render load is *tiny* by GPU standards: an internal framebuffer of **512×288**, roughly
  1,200–2,500 `fillRect`/`drawImage` calls per frame. Canvas 2D is hardware-accelerated in
  every modern browser and handles this with enormous headroom.
- Low internal resolution + `imageSmoothingEnabled = false` + integer upscaling gives us the
  crisp pixel look for free, and makes the CRT/scanline post-pass nearly free as well.
- Zero dependencies means zero version rot. This file will still run in ten years.

### The asset consequence

`fetch()` and `XMLHttpRequest` fail on `file://`. `<img>` and `<audio>` tags *work*, but any
`getImageData` on a `file://` image taints the canvas, and 200 loose PNG files is a
distribution and consistency nightmare.

So **CYBERVANIA generates all of its assets at boot**:

- **Sprites** — every robot, prop and tile is drawn procedurally into an offscreen canvas by
  `src/render/sprites.js` from a shared palette and a shared "chassis grammar" (see
  ASSET_STRATEGY in `GAME_DESIGN.md`). This guarantees stylistic consistency by construction:
  there is literally no way for one enemy to be a different art style than another, because
  they come out of the same drawing primitives and the same 24-colour palette.
- **Audio** — all music and SFX are synthesised at runtime through the **WebAudio API**
  (`src/audio/`). Detuned saw leads, PWM basses, noise-based percussion, FM bells. Every
  region gets its own generative synthwave cue. Nothing is streamed, nothing is downloaded.
- **Level data** — rooms are ASCII tilemaps inside `.js` files (`cybervania/maps/`), loaded as
  classic scripts. No JSON, because JSON would need `fetch`.

Boot time is ~60 ms of asset generation. Total download is the source itself.

## 2. Runtime architecture

```
cybervania.html                  entry point, script manifest, loading gate
└── cybervania/
    ├── src/
    │   ├── core/       math, RNG, input, fixed-timestep loop, event bus, game state
    │   ├── render/     palette, procedural sprite atlas, parallax, particles, CRT post-pass
    │   ├── world/      tiles, room model, room registry, collision, camera, transitions
    │   ├── player/     controller, physics, the four transformation frames
    │   ├── combat/     hitboxes, damage resolution, hitstop, knockback
    │   ├── enemies/    base AI + all enemy archetypes
    │   ├── bosses/     boss state machines
    │   ├── modules/    ability definitions + per-frame reinterpretation table
    │   ├── datasphere/ layer switching, dive points, digital-only geometry
    │   ├── ui/         HUD, terminal menu, map, dialogue, title screen
    │   ├── audio/      synth engine, music director, SFX bank
    │   ├── save/       localStorage slots, migration, autosave
    │   └── debug/      F3 overlay + console commands
    ├── maps/           ASCII room definitions per region
    ├── data/           lore, dialogue, enemy stats, progression tables
    ├── assets/         (generated at runtime — see README there)
    └── audio/          (generated at runtime — see README there)
```

### The loop

Fixed timestep, decoupled rendering:

```
accumulator += min(realDelta, 0.25)      // clamp so alt-tab never spiral-of-deaths
while (accumulator >= 1/120) { update(1/120); accumulator -= 1/120; }
render()
```

We simulate at **120 Hz** and render at display rate. Reason: dash and grapple move the player
up to 8 px per 60 Hz tick, which is half a tile — at 120 Hz the swept collision never has to
resolve a deep overlap, and dash-through-a-1-tile-gap becomes reliable. The cost is negligible
because `update` is cheap relative to `render`.

Determinism: no `Math.random()` in gameplay code — everything routes through a seeded
`CV.RNG` so that debug replays and boss patterns are reproducible.

**The loop never stops.** `Engine.paused` freezes *world simulation*, not the update
call. This is not a detail: the pause menu, the lore terminal and the dialogue strip are
all driven from the same `update`, so a loop that stopped on pause would lock the player
inside a menu it had frozen. `Game.update` returns early for each modal layer in turn, and
that early return is what "paused" actually means.

### Input edges

Gameplay verbs (jump, dash, attack, grapple) ask `Input.buffered(action)`, which is true
for a tuneable window after the press — that plus coyote time is most of what makes the
controller feel fair.

UI verbs (menu navigation, interact, chassis select) need a true edge, and edges are
subtle here because DOM key events arrive at arbitrary moments *between* frames. Presses
are therefore queued on arrival, promoted to "pressed this step" by `Input.update` at the
top of the frame, and cleared by `Input.endStep` after the first fixed step consumes them.
Two consequences, both deliberate:

- a press that lands in the gap between two frames is never dropped;
- one physical press produces exactly one action even when a frame runs several fixed
  steps, so holding a key cannot fast-scroll a menu at 120 Hz.

### Rendering pipeline

```
[ back buffer 512×288 ]
   1. sky / far background gradient        (parallax 0.05)
   2. far city silhouettes                 (parallax 0.15)
   3. mid structures, pipes, neon signs    (parallax 0.35)
   4. near backdrop tiles                  (parallax 0.70)
   5. GAMEPLAY LAYER — tiles, entities, player, projectiles
   6. foreground silhouettes + rain/fog    (parallax 1.30)
   7. additive light pass (neon bloom, muzzle flashes, player glow)
   8. particles
   9. HUD / UI
  10. CRT post-pass: scanlines, vignette, chromatic offset, glitch bursts
→ [ display canvas, integer-scaled, nearest-neighbour ]
```

The additive light pass (7) is a second small canvas composited with `lighter`. That is what
sells "neon" without any shader work.

### Collision

Tile-based swept AABB, axis-separated (X then Y), with:

- **corner correction** — a jump that clips a corner by ≤3 px is nudged around it instead of
  stopped, which is the single biggest "why does this feel good" trick in platformers;
- **one-way platforms** resolved only when moving down and previously above;
- **layer-aware solidity** — a tile's solidity is a function of `(tileType, currentLayer)`, so
  the same room is genuinely different geometry in the Data Sphere rather than a colour filter.

Rooms are also **normalised at construction**: padded out to at least one screen (rows
appended at the bottom, columns at the right, so no authored coordinate ever shifts), and
every declared door has its tiles carved open, extending one to three tiles toward the room
interior. A door is a statement that a passage exists, so the geometry is made to agree
with it rather than the author having to keep two representations in sync by hand.

## Verification

Two dependency-free Node harnesses live in `cybervania/tools/` and are the reason the map
data can be trusted:

- **`validate-world.js`** parses the map files with a stub `CV` and checks door targets,
  spawn names, tile legality, object placement (nothing embedded in terrain; ground enemies
  have a floor beneath them), pickup-id uniqueness, two-way connectivity, and reachability
  from the start room. It models the pad-and-carve step so it reports only passages the
  engine does *not* open.
- **`smoke-test.js`** boots the real engine behind a Canvas2D stub and simulates ~14,000
  fixed steps across every room, with all four chassis and randomised input, plus modal-UI
  liveness, UI text overflow, spawn safety, every dialogue script, every lore entry and a
  save round-trip.

Both found real bugs that visual inspection missed — roughly thirty objects sunk one tile
into their floors, twenty doors buried inside walls, and a pause menu that froze the loop
that drove it.

### Performance rules enforced in code

- Particles, projectiles, damage numbers and hit sparks are **object-pooled**; no allocation
  in the hot loop.
- Tiles are drawn from a pre-baked per-room offscreen canvas, re-baked only when the layer
  changes or a tile is destroyed. Static geometry costs **one** `drawImage` per frame.
- Entities outside the camera + 64 px margin skip `render` entirely and downgrade `update`.
- Zero DOM manipulation during gameplay. The HUD is drawn into the canvas.
- No per-frame string concatenation or `toFixed` outside the debug overlay.

## 3. Save system

`localStorage`, three slots, key `cybervania.save.v1.slot{n}`, plus
`cybervania.settings.v1`. Each slot stores progression flags, unlocked modules and frames,
defeated bosses, discovered map cells, story flags, playtime and last save point. A `version`
field drives a migration chain so old saves survive updates. Autosave fires on every save
terminal and every boss kill. Corrupt or unparseable slots degrade to "EMPTY" rather than
throwing.

`localStorage` is unavailable in some `file://` configurations (older Safari); the save layer
detects this at boot and falls back to an in-memory store, warning the player in the menu that
progress will not persist.

## 4. Debug

`F3` toggles the overlay (FPS, frame time graph, player state, position, velocity, energy,
frame, room, layer, entity counts, collision boxes). Backtick opens a command console:

```
give <module> | frame <id> | tp <roomId> | energy <n> | hp <n>
god | noclip | killall | flag <name> [0|1] | boss <id> | layer <phys|data>
map reveal | slow <mult> | spawn <enemyId>
```

Debug state is never serialised into a save slot, and the overlay is skipped entirely when
disabled so it costs nothing.

## 5. Deliberate non-goals

- No WebGL fallback path. Two renderers is two bug surfaces.
- No mobile touch controls. This is a precision-movement game; a virtual d-pad would make it
  feel bad, and rule 46 puts Movement above everything.
- No online features of any kind.
- No asset streaming. Everything is resident.
