# CYBERVANIA — PROGRESSION

## 1. Gating vocabulary

Every lock in the game is one of six kinds. Keeping the list this short means the player can
*read* a lock instantly — which is what makes backtracking feel like knowledge rather than
chores.

| Lock | Looks like | Opened by |
|---|---|---|
| **Gap** | A jump you cannot make | Dash / Thruster Vault / Arc |
| **Height** | A ledge above you | Thruster Vault / Grapple / wall climb |
| **`B` wall** | Cracked reinforced plating, amber warning stencil | Seismic Slam (BULWARK only) |
| **`D` wall** | Solid physically, visibly wireframe-flickering | CIPHER (or a Dive Port on the far side) |
| **`E` barrier** | Humming energy field, hexagonal | Signal Cutter / EMP |
| **Layer** | The path only exists in one layer | Data Shift |

Rule: **the player always sees the lock before they have the key.** No lock is introduced in
the same room as its solution.

## 2. Critical path

| # | Beat | Gained | Opens |
|---|---|---|---|
| 1 | Wake, Undercity | *(Vector, attack, jump)* | — |
| 2 | Undercity depths | **PHASE DASH** | Gaps everywhere; Undercity → Neon City |
| 3 | Neon City, first Dive Port | **DATA SHIFT (fixed)** | Layer puzzles at Ports |
| 4 | **BOSS: WARDEN-9** | **THRUSTER VAULT** | Height gates; Old Network entrance |
| 5 | Old Network shafts | **TETHER HOOK** | Long gaps, vertical shafts, Factory entrance |
| 6 | **BOSS: THE COMPILER** | **BULWARK frame** | — |
| 7 | Factory Sector | **SEISMIC SLAM** | All `B` walls, retroactively, in every region |
| 8 | Factory upper | **POLARITY CORE** | Magnetic rails; Reactor approach |
| 9 | **BOSS: ASSEMBLY PRIME** | **ARC frame** | Speed routes, glide gaps, most secrets |
| 10 | Server Farms | **ADHESION PLATES** | Wall climbs |
| 11 | Server Farms cold aisle | **EMP BURST** | `E` barriers, Nullifier counterplay |
| 12 | **BOSS: THE ARCHIVIST** | **CIPHER frame + free DATA SHIFT** | **`D` walls everywhere** |
| 13 | **THE HOUSE — sealed lab** | *story: Acts III* | Reactor Core |
| 14 | Reactor Core | **OVERCLOCK** | Timing gates |
| 15 | Reactor summit | **SIGNAL CUTTER** | Final `E` barriers, Central System |
| 16 | Central System | — | **BOSS: ATLAS** |

Estimated critical path: **4.5–6 hours**. Full completion: **9–11 hours**.

### The two deliberate structural moments

**Step 7 (Seismic Slam)** is the *retroactive* unlock. `B` walls have been visible since the
Undercity. The moment the player gets Slam, roughly nineteen previously-dead-end rooms across
four regions become live simultaneously. The map lights up. This is placed at the midpoint on
purpose — it converts the first half of the game into new content.

**Step 12 → 13** is the *narrative* unlock. Cipher's real reward is not a wall-passing
ability, it is that the player independently realises where to go. The game never places a
marker on the House. Playtesting target: 80%+ of players go there unprompted within four
minutes of gaining Cipher.

## 3. Non-linearity

After **Thruster Vault** (step 4) the world opens into a genuine graph:

```
                    ┌── SERVER FARMS ──┐
   NEON CITY ───────┤                  ├── REACTOR ── SPIRE ── CENTRAL
       │            └── OLD NETWORK ───┘        │
       │                    │                   │
   UNDERCITY ── (THE HOUSE) │              WASTE SECTOR (opt)
       │                    │
   FOUNDATIONS (opt)   FACTORY SECTOR ── BLACK MARKET (opt)
```

- Old Network and Factory Sector are **order-independent** — Grapple and Slam can be acquired
  either way round, and each region has an alternate route designed for the *other* tool.
- Server Farms is reachable from Neon City or Old Network.
- The optional regions (Waste, Black Market, Foundations, The Fault) are never required, and
  each contains one augment, one lore fragment and one shortcut.

## 4. Player power curve

| Stat | Start | Mid | End |
|---|---|---|---|
| Health pips | 4 | 7 | 10 |
| Base energy (Vector) | 100 | 130 | 160 |
| Augment slots | 0 | 2 | 3 |
| Frames | 1 | 3 | 4 |
| Modules | 0 | 7 | 12 |
| Movement options | 3 | 9 | 14 |

**Health** comes from **CORE SHARDS** — 18 in the world, 3 per pip. Always in optional
sub-rooms behind a movement challenge, never behind combat.

**Energy** comes from **CAPACITORS** — 6 in the world, +10 base max each, applied to all frames
proportionally.

**Augments** (3 slots, 14 total) reshape the energy economy:

| Augment | Effect |
|---|---|
| SIPHON | +6 energy per hit landed (turns any frame into Bulwark's economy) |
| FLYWHEEL | +60% regen, −25% max |
| RESERVOIR | +50% max, −40% regen |
| KINETIC | Regen scales with horizontal speed |
| SCAVENGER | Enemies drop double motes |
| DAMPENER | −20% damage taken, −15% move speed |
| LEDGER | Module costs −25%, attack damage −15% |
| OVERFLOW | Energy above 90% converts to a damage bonus |
| DEADMAN | At 1 pip: +100% damage, +50% regen |
| GHOST | Dash i-frames +0.06 s |
| ANCHOR | Grapple cooldown −50% |
| RESONANCE | Cipher does not drain in the physical world |
| SALVAGE | *(Scrapheart)* Downed enemies leave a 3 s ally husk |
| CONTINUITY | *(all fragments)* Death returns you to the room entrance, not the last Dock |

Augments are the build system's fine tuning; frames are its coarse tuning.

## 5. Collectibles

| Type | Count | Purpose |
|---|---|---|
| Core Shard | 18 | +1 health per 3 |
| Capacitor | 6 | +10 max energy |
| Augment | 14 | Build customisation |
| Data Fragment | 24 | Halder's consciousness; 24/24 → Continuity ending |
| Tape Log | 11 | Halder's voice |
| Terminal Entry | 40+ | Worldbuilding; all archived in LOG |
| Tram Node | 8 | Fast travel |
| Dock Station | 14 | Save / heal / frame swap |

Completion % is tracked and shown at the ending. It affects nothing except the ending
condition, deliberately — 100% is for the player who wants the *story*, not stats.

## 6. Difficulty curve

The game does not scale enemy HP. It escalates by **composition** and by **spacing between
Docks**.

- **Undercity** — single enemies, generous Docks. Teaching.
- **Neon City** — pairs. Introduces the Sentinel-Eye-calls-reinforcements pressure loop.
- **Old Network / Factory** — three-enemy sentences with a hazard. Docks get sparse.
- **Server Farms** — Nullifier removes your modules; the game checks whether you learned to
  *move*.
- **Reactor** — hazard-dominant. Enemies are almost secondary.
- **Central System** — no Docks at all after the entrance.

Death is cheap: you respawn at the last Dock, keep everything, and enemies in the room you
died in stay dead for 30 s. There is no currency loss mechanic — it would punish exploration,
which is the thing the game most wants to reward.

## 7. Accessibility & assist

Under `SYSTEM` in the menu, no achievements withheld, no shaming:

- **Assist: damage taken** 100% / 50% / 0%
- **Assist: infinite energy**
- **Assist: no fall damage / hazard grace** extends the pre-death grace window
- **Screen shake** 0–100%
- **CRT / scanlines / chromatic aberration** individually toggleable
- **Glitch effects** toggleable (photosensitivity)
- **Hold vs. toggle** for dash, glide, grapple
- **Full key rebinding**
- **Text speed** and **auto-advance off**

Rule 40 applied to accessibility: if a stylistic effect can make the game unplayable for
someone, it gets a switch.
