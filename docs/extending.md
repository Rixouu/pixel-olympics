# Extending Pixel Olympics

Source lives under **`src/game/`**. Run **`pnpm dev`** while editing, then **`pnpm build`** before deploy.

Comments in `characters.js` and `scenes.js` mark the main extension points.

## Architecture (quick map)

| Symbol | Role |
|--------|------|
| `CHARACTERS` | Racer sprites — PNG run sheets (`public/sprites/`) |
| `COLORS` | Player colour swatches |
| `SCENES` | Scene registry for background + track art |
| `POWERUP_TYPES` | Pickup behaviour keys |
| `buildRacers()` | Creates sim state from lobby `players` |
| `drawScene()` | Paints background + track |

All racers use **PNG sprite sheets**. See **[assets.md](./assets.md)** for how to add `run.png` files and register them in `CHARACTERS`.

## Adding a character

1. Add **`public/sprites/<key>/run.png`** (see [assets.md](./assets.md)).
2. Add an entry to **`CHARACTERS`** in **`src/game/characters.js`**:

```javascript
{ key: 'wizard', name: 'Wizard', kind: 'hero', sheet: { src: '/sprites/wizard/run.png', ...SHEET_RUN } },
```

3. Refresh — the lobby picker cycles all `CHARACTERS` entries automatically.

### Critter vs hero

`kind` is for grouping/labels only; it does not change gameplay.

## Adding a scene

Scenes use **PNG background + track** art. See **[assets.md](./assets.md)** for asset sizes and folder layout.

1. Add scene art under **`public/background/<key>/`**.
2. Add an entry to **`SCENES`** in **`src/game/scenes.js`**:

```javascript
{
  key: 'city',
  name: 'City',
  folder: 'city',
  sky: ['#4da8ef', '#8bd0ff'],
  ground: '#5d9827',
  groundDark: '#3d6f19',
  track: '#cf523d',
  laneLine: '#fff7ee',
},
```

3. Scene buttons are generated automatically from `SCENES`, so no extra lobby markup is needed.

New scene asset paths load automatically on boot via **`loadBackgroundLayers()`**.

## Power-ups

Types are defined in **`src/game/config.js`**:

```javascript
export const POWERUP_TYPES = ['boost', 'star', 'banana', 'bolt', 'shield'];
```

To add a type:

1. Append a key to `POWERUP_TYPES` in **`config.js`**.
2. Add entries to **`POWERUP_COLOR`** and **`POWERUP_GLYPH`** in the same file.
3. Handle behaviour in **`applyPowerup()`** in **`src/game/engine.js`**.
4. Document in the lobby `.pw-legend` in **`index.html`** and in [game-rules.md](./game-rules.md).

## Colours

Player colours come from **`COLORS`** in **`src/game/config.js`**.

## Audio

SFX uses the **Web Audio API** (`tone()`, `sfxPow()`, etc.). Hook new events there — keep volumes modest for mobile speakers.

## Testing checklist

- [ ] New character renders in picker preview and in-race at multiple `PXS` scales
- [ ] New scene art keeps the start/finish line readable
- [ ] 2-player and 6-player lobbies both work
- [ ] Power-up off/on paths still run
- [ ] Mobile viewport (narrow width, short height)
- [ ] `prefers-reduced-motion` — countdown still readable

## When to split further

The engine is still one file (`engine.js`). If that grows too large, split render/simulation/UI into separate modules — Vite already code-splits **`characters.js`** and **`scenes.js`** into their own chunks.

## Contributing

Open a PR with a screenshot or short screen recording of your character/scene in-race. Match the existing pixel scale and palette vibe (bright arcade, dark purple UI chrome).
