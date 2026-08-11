# cybervania/assets/ — intentionally empty

**CYBERVANIA ships no image files.** Every sprite, tile, prop, particle, UI element and
parallax layer is generated procedurally into an offscreen canvas at boot by
`../src/render/sprites.js`, `../src/render/tiles.js` and `../src/render/parallax.js`.

## Why

1. **`file://` compatibility.** `cybervania.html` must run when double-clicked. Loading
   images that way works, but any `getImageData` on them taints the canvas, and a
   two-hundred-file asset folder is a distribution problem. See `TECHNICAL_DESIGN.md §1`.
2. **Style coherence by construction.** Every robot is assembled from the same seven
   primitives (`plate`, `strut`, `optic`, `thruster`, `joint`, `panelLine`, `glow`) and
   the same 24-colour palette in `../src/render/palette.js`. It is not *possible* for one
   enemy to be drawn in a different art style than another, because they come out of the
   same drawing code.
3. **Free animation.** Parts are offset by phase-driven functions, so a 14 px robot gets a
   real walk cycle, recoil and squash/stretch without a single animation frame being
   authored.

Boot cost: roughly 60 ms of canvas work. Download cost: zero.

## If you want to add real art

The renderer takes canvases, not files, so you can drop in a spritesheet without changing
anything downstream:

1. Add an `<img>` preload step to the boot harness in `cybervania.html`.
2. Replace the body of the relevant `CV.Sprites.*` function with a `drawImage` call.
3. Keep the **contract**: origin at the sprite's feet, `-y` is up, and the caller has
   already applied facing/scale/flash.

## Naming system

Used for every generated atlas key and every data id (`GAME_DESIGN.md §8`):

```
<category>_<subject>_<variant>_<state>

  ent_player_vector_run          prop_terminal_lore_idle
  ent_enemy_crawler_attack       tile_undercity_solid_a
  fx_impact_heavy_03             ui_panel_terminal_frame
  bg_neoncity_structures_02      data_wall_lattice_idle
```

Categories: `ent_`, `tile_`, `prop_`, `fx_`, `ui_`, `bg_`, `data_`.

## Readability rules (these override style)

- Anything that can hurt you is **red or amber and moves**.
- Anything you can stand on has a hard 1 px top highlight.
- Anything interactive **pulses** at 0.5 Hz.
- Data Sphere geometry is cyan wireframe; physical geometry is solid.
- The player is the only cyan-white object in the physical world.
