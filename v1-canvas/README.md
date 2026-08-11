# v1 — Canvas2D build (archived)

The original tile-based build. Superseded by the 3D/pixel prototype after playtest
feedback (see `../REDESIGN.md`), kept because several systems port across unchanged.

Run it: `v1-canvas/cybervania.html`

## Worth salvaging

| Area | Status |
|---|---|
| `src/enemies/`, `src/bosses/` | AI and state machines are renderer-agnostic — port directly |
| `src/combat/` | Hitboxes, hitstop, knockback — port directly |
| `src/modules/`, `src/player/frames.js` | Pure data. The 12x4 reinterpretation table stands. |
| `src/save/`, `src/audio/`, `src/debug/` | No rendering dependency |
| `data/lore.js`, `data/dialogue.js` | All writing carries over verbatim |
| `tools/` | The validators are 2D-tilemap-specific and do not port |

## Not salvageable

`src/render/*` (Canvas2D), `src/world/room.js` (room graph), `maps/*` (ASCII tilemaps).
