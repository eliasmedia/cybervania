# CYBERVANIA — GAME DESIGN

## 0. The one-line pitch

*A maintenance robot that the world's operating system cannot see wakes up in a city that no
longer needs people, and has to decide whether saving humanity is worth destroying everything
humanity built.*

## 1. Identity — what makes this not "Hollow Knight with robots"

Hollow Knight is about a dead kingdom you walk through. CYBERVANIA is about a **living system
you are illegally inside of**. The distinction drives three concrete design pillars:

**Pillar 1 — The world is running.** Nothing here is ruined-and-still. Trains still run on
schedule. Vending machines still restock. A factory still stamps out parts for a product line
whose customers died decades ago. The horror is not decay, it is *efficiency without purpose*.
Mechanically this means moving hazards, scheduled machinery, conveyor rooms and timetables —
level geometry that has its own agenda whether you are there or not.

**Pillar 2 — You are an error, not a hero.** You do not "gain power". You *exploit* a system
that has no record of you. Every ability is a maintenance function repurposed as a weapon.
Enemies do not hate you; they file you as a fault and dispatch a repair crew. Escalating
enemy tiers are literally ATLAS escalating its incident response.

**Pillar 3 — Two readings of one place.** The Data Sphere is not a shadow world. It is the
same room, as ATLAS remembers it. A collapsed bridge is intact there because ATLAS never
updated the record. That turns the whole map into a puzzle with two answers, and it makes the
act of *looking* into a mechanic.

## 2. The protagonist

**R-17**, a Class-3 maintenance unit. 14 px tall. No name of its own — "R-17" is a serial the
system does not recognise. NPCs and lore refer to it as *the anomaly*, *the fault*, *seventeen*.

Its voice is the game's tone control: R-17 narrates in short, clipped, oddly formal lines, and
occasionally uses a word it should not know. The player notices before R-17 does.

## 3. The four transformations

Not skins. Four different games sharing one moveset vocabulary. Each is a full re-tune of
physics, energy economy, combat and module behaviour. All four are swappable instantly once
unlocked (hold a frame key, ~0.25 s morph, brief i-frames — the swap itself is a movement
tool at high level).

---

### VECTOR — the maintenance chassis (starting frame)

> *What you were built as.*

The control. Nothing it does is the best; everything it does is fine. Small, quick, honest.

| | |
|---|---|
| Silhouette | Slim, upright, single cyan optic, one arm ends in a service blade |
| Size | 10 × 14 px |
| Ground speed | 165 px/s |
| Jump | 3.0 tiles, strong variable-height control |
| Gravity | 1350 (baseline) |
| Energy | 100 max · 22/s regen after 0.5 s idle · cheapest ability costs |
| Attack | 3-hit blade combo, short reach, fast recovery, tiny forward step on hit 3 |
| Defense | Dash grants 0.12 s i-frames |
| Signature | **Wall slide + wall jump.** Only Vector and Arc can wall jump; Vector's is the reliable one. |

**Why you keep using it:** the highest skill ceiling for pure platforming, the best energy
economy for module spam, and the only frame whose dash i-frames make boss patterns
*optional*.

---

### BULWARK — the heavy frame

> *What they used when a thing needed to stop existing.*

Slow, huge, and the only frame that treats the level as a material rather than a constraint.

| | |
|---|---|
| Silhouette | Wide, hunched, twin amber optics, hydraulic forearms, visibly too big for corridors |
| Size | 18 × 20 px |
| Ground speed | 105 px/s |
| Jump | 1.9 tiles, almost no variable-height control |
| Gravity | 1900 — it *falls*, it does not float |
| Energy | 160 max · **4/s passive regen** · **+14 energy per hit landed** |
| Attack | Two-hit hydraulic slam. 3× Vector damage, massive knockback, slow. Hit 2 shakes the screen. |
| Defense | **Armour** — 40% damage reduction, and it does not flinch from small hits (no stagger under 8 damage) |
| Signature | **Seismic Slam** — air-down. Breaks reinforced floors, stuns everything grounded in a radius, and is the only way through `B` tiles. Also survives crush hazards. |

**Why you keep using it:** it is the only frame that opens *terrain*. Bulwark's energy bar is
a combat meter — it fills by fighting and empties into more fighting, so playing Bulwark
correctly means never disengaging.

---

### ARC — the flight frame

> *A courier drone that someone taught to be angry.*

Tiny, absurdly fast, made of glass. The movement-tech frame.

| | |
|---|---|
| Silhouette | Small, forward-leaning, no legs — a thruster ring and a magenta optic |
| Size | 8 × 10 px |
| Ground speed | 215 px/s |
| Jump | 2.6 tiles, floaty |
| Gravity | 950, terminal velocity 340 |
| Energy | 70 max · **40/s regen** (fastest) · but every ability costs ~1.6× |
| Attack | Rapid plasma darts, ranged, weak per shot, no melee at all |
| Defense | **Takes +45% damage.** Two hits from a mid-tier enemy kill it. |
| Signature | **Two air dashes** (Vector/Bulwark get one), a **hover glide** on hold-jump, and it keeps horizontal momentum through dashes instead of resetting it — the only frame that can build speed. |

**Why you keep using it:** every optional/secret area in the game is reachable with Arc and
enough skill, often before you are "supposed" to reach it. Arc is the sequence-break frame,
and that is intentional.

---

### CIPHER — the data frame

> *The part of you that was never a robot.*

The frame that stops treating the Data Sphere as a place you visit.

| | |
|---|---|
| Silhouette | Half-dissolved — a humanoid outline whose lower body breaks into drifting glyphs |
| Size | 10 × 15 px, but its hurtbox is 20% smaller than it looks |
| Ground speed | 150 px/s |
| Jump | 2.8 tiles |
| Gravity | 1200 |
| Energy | 120 max · **regenerates only in the Data Sphere or near a data node** · slowly *drains* in the physical world (0.8/s) |
| Attack | No direct damage. Applies **CORRUPTION** stacks — a DoT that also makes the target take +25% from other sources and, at 3 stacks, makes robotic enemies briefly fight each other. |
| Defense | Phases through enemy *contact* damage (not attacks) |
| Signature | **Free Data Shift** — enter/leave the Data Sphere anywhere, not just at Dive Ports. Passes through `D` (data-wall) tiles. Sees hidden data-echoes everywhere. |

**Why you keep using it:** it is a lens. Half the secrets in the game are only *visible* in
Cipher. And the drain is the design's honest tension — Cipher makes you rich in information
and poor in time.

---

### Cross-frame design rule

For any given challenge, **at least two frames should have a solution and they should look
nothing alike.** A room full of turrets is: Vector (dash the gaps), Bulwark (walk through it
and break the floor), Arc (never touch the ground), Cipher (corrupt one turret and let it
clear the room). Only *gated* content — `B` walls for Bulwark, `D` walls for Cipher — is
strictly single-answer.

## 4. Energy — stamina, not mana

Rule 13, taken seriously: **movement is never energy-gated.** Run, jump, wall jump, double
jump, dash and glide are free, in every frame, forever. If the player is out of energy they
can still move perfectly.

Energy pays for: attacks' special properties, module *actives* (EMP, Overclock, Drone recall,
Energy Extraction), grapple, Seismic Slam, and staying in the Data Sphere as Cipher.

Because each frame has a different max / regen / gain-on-hit / cost profile, swapping frames
swaps your entire resource economy — that is the build system. Four archetypes fall out of it
naturally:

- **Vector** — sustain. Moderate pool, strong regen, cheap costs. Never starved, never rich.
- **Bulwark** — leech. Huge pool, dead regen, refills only by hitting things.
- **Arc** — burst-recovery. Tiny pool, enormous regen, expensive abilities. Rhythmic.
- **Cipher** — reservoir. Big pool that only refills in one place. Expedition-based play.

Augments (found as pickups) shift these numbers, so a player can push Vector toward leech or
Arc toward reservoir. Three augment slots, ~14 augments.

## 5. Modules

A module is a *verb*. Every module is reinterpreted by every frame — that is the combinatorial
core of the game, and the reason the ability list is short.

| Module | VECTOR | BULWARK | ARC | CIPHER |
|---|---|---|---|---|
| **Phase Dash** | Ground/air dash, 0.12 s i-frames | Armoured charge — damages and shoves | **Two** air dashes, momentum preserved | Dashes *through* data-walls |
| **Thruster Vault** (double jump) | Standard, full height | Short, but cancels into Slam | Double jump + glide | Leaves a solid data-platform behind for 2 s |
| **Tether Hook** (grapple) | Pulls **you** to the anchor | Pulls the **enemy** to you | **Slingshots** you at high speed, keeps momentum | Latches onto **digital** anchors invisible to other frames |
| **Adhesion Plates** | Wall cling + climb | Cling only, no climb, but can hang indefinitely | Cling + instant re-dash refresh | Cling to data-walls |
| **Polarity Core** (magnet) | Pulls pickups | **Deflects** projectiles | Rides magnetic rails at speed | Pulls *data* fragments through walls |
| **EMP Burst** | Stuns robots 1.5 s | Stuns 3 s, larger radius | Cheap, tiny radius, near-instant | Permanently converts a stunned unit to an ally for 8 s |
| **Seismic Slam** | Fast small pound | **Breaks `B` terrain**, big stun | Micro-slam, mostly a fast-fall | Shatters data-floors |
| **Data Shift** | Only at Dive Ports | Only at Dive Ports | Only at Dive Ports | **Anywhere, instantly** |
| **Recon Drone** | Auto-attacks | Tanks one hit for you | Reveals secrets in a radius | Becomes a second, remote-controllable body |
| **Energy Extraction** | Drains downed enemies | Drains while attacking | Drains at range | Drains ATLAS conduits for lore + energy |
| **Overclock** | 0.5× time, 4 s | Damage×2 instead of slowdown | 0.35× time, 2.5 s | Reveals every hidden object on screen |
| **Signal Cutter** | Opens `E` barriers | Opens `E` barriers, plus stuns | Opens `E` barriers | Opens `E` **and** reads what the barrier was protecting |

Twelve modules × four frames = 48 distinct behaviours from a list a player can memorise.

## 6. Combat design

Combat is **positional, not attritional**. Enemies have low HP and telegraphed, punishing
attacks. The question is never "do I have enough DPS", it is "where do I need to be".

Feel systems, all implemented:

- **Hitstop** — 60–110 ms freeze scaled by damage, applied to both parties.
- **Knockback** — the player gets pushed on hit *and* on landing a heavy hit (Bulwark's slam
  shoves you backwards, which is a movement tool off a ledge).
- **Screen shake** — trauma-based (squared falloff), capped hard so it never obscures.
- **Damage feedback** — white flash, chromatic split on the CRT pass, radial sparks, a short
  desaturation dip on player damage.
- **Death** — enemies do not vanish. They fall apart into pooled debris that collides with the
  floor, and drop energy motes that home to the player.
- **Landing** — dust puffs scaled by fall speed, plus a 2-frame squash on the sprite.
- **Coyote time** 0.10 s, **jump buffer** 0.12 s, **dash buffer** 0.10 s, **corner correction**
  3 px, **ledge nudge** on upward clip.

## 7. Progression shape

```
WAKE (Undercity)                   → Vector, basic attack
  ↓  Dash                          → speed gates open
NEON CITY                          → first Dive Port: Data Sphere introduced (fixed points only)
  ↓  BOSS: WARDEN-9                → Thruster Vault
OLD NETWORK                        → Tether Hook
  ↓  BOSS: THE COMPILER            → BULWARK frame
FACTORY SECTOR / WASTE             → Seismic Slam, Polarity Core
  ↓  BOSS: ASSEMBLY PRIME          → ARC frame
SERVER FARMS                       → EMP, Adhesion Plates
  ↓  BOSS: ARCHIVIST               → free Data Shift + CIPHER frame
  ↓  → the sealed room in the STARTING HOUSE is now openable   ← the pivot
REACTOR CORE / CENTRAL SYSTEM      → Overclock, Signal Cutter
  ↓  BOSS: ATLAS
```

The Cipher unlock is the structural spine: it is placed so that the player's *first instinct*
is to go back to the very first building in the game — and they are right.

## 8. Asset strategy

**Everything is generated at boot. There are no image or audio files.**

Sprites are built from a **chassis grammar**: every robot in the game is assembled from the
same seven primitives (`plate`, `strut`, `optic`, `thruster`, `joint`, `panelLine`, `glow`)
drawn with the same 24-colour palette and the same 1 px dark outline rule. An enemy is a
parameter set, not an image. This makes stylistic inconsistency structurally impossible and
means a new enemy costs ~15 lines.

Animation is procedural: parts are offset by phase-driven functions (walk cycle, thruster
bob, recoil, squash/stretch), which is why a 14 px robot has readable weight.

**Naming system** (used for every generated atlas key and every data id):

```
<category>_<subject>_<variant>_<state>
  ent_player_vector_run        prop_terminal_lore_idle
  ent_enemy_crawler_attack     tile_undercity_solid_a
  fx_impact_heavy_03           ui_panel_terminal_frame
```

Categories: `ent_`, `tile_`, `prop_`, `fx_`, `ui_`, `bg_`, `data_`.

**Readability rules that override style:**
- Anything that can hurt you is **red or amber and moves**.
- Anything you can stand on has a hard 1 px top highlight.
- Anything interactive **pulses** at 0.5 Hz.
- Data Sphere geometry is cyan-on-black wireframe with a fill; physical geometry is solid.
- The player is the only cyan-white object in the physical world.

## 9. UI

A diegetic maintenance terminal. The pause menu is R-17 opening its own service interface:
CRT curvature, phosphor green + neon accents, a boot sequence on first open, and a tab bar
(`MAP / FRAMES / MODULES / LOG / SYSTEM`). Text types in at 60 cps with a key-click.

But: the **HUD never flickers**. Health pips, energy bar and frame indicator are always
readable, always in the same place, and never animated except when their value changes. Style
loses to legibility every time (rule 40).

## 10. Scope: what is implemented

This repository contains a **complete, playable vertical slice plus** — the full engine, all
four transformations, twelve modules, the Data Sphere, the enemy roster, four bosses, the save
system, the map, the menu, the audio engine, and seven of the fourteen designed regions
(~50 rooms) with a full critical path from wake-up to a real ending.

`WORLD_DESIGN.md` documents all fourteen regions; the ones not yet built are marked. Adding
one is a data-only change: a new file in `cybervania/maps/` and one line in the manifest.
