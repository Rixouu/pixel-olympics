# Art assets guide

How to add **PNG character sprites** and **scene pack background art**. For scenes and power-ups in code, see [extending.md](./extending.md).

Run **`pnpm dev`** while testing assets locally. Files under **`public/`** are copied to **`dist/`** on build and served from the site root.

---

## Character sprites (PNG) — implemented

The game loads horizontal **sprite sheets** from `public/sprites/`. Procedural code-drawn racers have been removed.

### Folder layout

```txt
public/sprites/
├── fighter/run.png
├── samurai/run.png
├── shinobi/run.png
├── ninja/run.png
└── <your-key>/run.png
```

URL in code: **`/sprites/<key>/run.png`** (leading slash, lowercase paths recommended — Linux/Vercel are case-sensitive).

### Asset requirements

| Requirement | Detail |
|-------------|--------|
| **Format** | PNG with **transparent** background (not solid black) |
| **Layout** | Single **horizontal row** of frames |
| **Direction** | Character **faces right** (race scrolls left → right) |
| **Frame size** | Every frame same width × height |
| **Animation** | Run cycle only is required for racing |

### Measuring frame size

Open the PNG and read pixel dimensions:

```txt
frames = imageWidth ÷ frameWidth
```

Example: **1024 × 128** with 128px-wide frames → **8 frames**.

Current bundled sheets use **128 × 128** per frame, **8 frames** (1024px total width).

### Register in code

Add one entry to **`CHARACTERS`** in **`src/game/characters.js`**:

```javascript
const SHEET_RUN = { frameW: 128, frameH: 128, frames: 8 };

{
  key: 'ninja',
  name: 'Ninja',
  kind: 'hero', // or 'critter'
  sheet: { src: '/sprites/ninja/run.png', ...SHEET_RUN },
},
```

Custom frame size (example — 6 frames at 96×96):

```javascript
{
  key: 'wizard',
  name: 'Wizard',
  kind: 'hero',
  sheet: {
    src: '/sprites/wizard/run.png',
    frameW: 96,
    frameH: 96,
    frames: 6,
  },
},
```

No engine changes needed — **`src/game/sprite-sheets.js`** loads all `sheet.src` paths on boot; **`engine.js`** slices frames and draws them in-race.

### Player colour

The lobby **colour swatch** identifies each player (HUD dot, name label). **PNG art keeps its own colours** — the swatch does not recolour the sprite.

### Remove old entries

Each character should exist only once in `CHARACTERS` with a `sheet:` entry — no `draw:` blocks.

### Optional sheets (not wired yet)

`Idle.png`, `Walk.png`, etc. from asset packs are **not used** unless you add engine support. Only **`run.png`** is required for the race.

### Character checklist

- [ ] `public/sprites/<key>/run.png` exists
- [ ] Transparent PNG, faces right
- [ ] `frames = width ÷ frameW` matches `sheet.frames`
- [ ] Entry added to `CHARACTERS` in `characters.js`
- [ ] `pnpm dev` — cycle racer in lobby, start a race, check animation on phone + desktop

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Black box around character | Re-export PNG with transparency |
| Sprite doesn’t appear | Check browser console; verify path and filename case |
| Wrong animation / sliding feet | Wrong `frameW` or `frames` count |
| Character faces left | Flip art to face right before importing |

### Third-party art

Keep license files or links (e.g. [Craftpix licenses](https://craftpix.net/file-licenses/)) if you use purchased/free packs commercially.

---

## Background art (PNG) — implemented

Scenes now use a fixed three-file scene pack instead of the older layered parallax background system.

### Folder layout

```txt
public/background/
└── volcanic-racing/
    ├── 01-background.png
    ├── 02-track.png
    └── 03-crowd-front.png
```

URL in code: **`/background/<scene>/<file>.png`**.

### Asset requirements

| Requirement | Detail |
|-------------|--------|
| **Format** | PNG |
| **Layout** | One background, one track, one front crowd file per scene |
| **Background size** | Use [asset-dimensions.md](./asset-dimensions.md) for the current exact spec; the current one-file background target is **3200 × 1100** |
| **Track size** | Recommended **2560 × 960** |
| **Crowd size** | Recommended **2560 × 280** |
| **Transparency** | `03-crowd-front.png` should keep a transparent background |

### Register in code

Add or edit a scene in **`src/game/scenes.js`**:

```javascript
{
  key: 'volcanic-racing',
  name: 'Volcanic Racing',
  backdrop: '/background/volcanic-racing/01-background.png',
  trackTexture: '/background/volcanic-racing/02-track.png',
  overlayFront: '/background/volcanic-racing/03-crowd-front.png',
}
```

**`src/game/backgrounds.js`** loads `scene.backdrop`, `scene.trackTexture`, and `scene.overlayFront` on boot. **`drawScene()`** in **`engine.js`** draws the background above the track, the track texture across the race lanes, and the crowd as the front overlay.

### Background checklist

- [ ] `01-background.png`, `02-track.png`, `03-crowd-front.png` exist under `public/background/<scene>/`
- [ ] Background matches the current size guidance in [asset-dimensions.md](./asset-dimensions.md)
- [ ] Crowd export keeps transparency and minimal empty padding
- [ ] Track art keeps racers readable
- [ ] `pnpm dev` — cycle scenes in lobby, race on mobile + desktop widths

---

## Quick reference

| Asset type | Location | Code touchpoint | Status |
|------------|----------|-----------------|--------|
| Character run sheet | `public/sprites/<key>/run.png` | `characters.js` → `sheet:` | **Live** |
| Scene lane colours | — | `scenes.js` → `track`, `groundDark`, `laneLine` | **Live** |
| Scene pack art | `public/background/<scene>/…` | `scenes.js` → `backdrop`, `trackTexture`, `overlayFront` | **Live** |

---

## Related docs

- [extending.md](./extending.md) — scenes, power-ups
- [asset-dimensions.md](./asset-dimensions.md) — exact scene pack sizes
- [scene-safe-zones.md](./scene-safe-zones.md) — background and crowd placement guide
- [deployment.md](./deployment.md) — build output includes `public/` assets
