# Pixel Olympics Asset Dimensions

This file is the art handoff for the current scene-pack system.

The previous background recommendations of `2560 x 1440` and later `3200 x 1600` were wrong for the current one-file background workflow. The corrected background size for the current renderer is `3200 x 1100`.

## Scene pack structure

Each scene currently uses one background file:

```txt
public/background/<scene-key>/
├── 01-background.png
└── 02-track.png
```

## Recommended dimensions

### 01-background.png

- Purpose: skyline, stadium, mountains, city, distant audience, clouds, scoreboards behind the track
- Recommended size: `3200 x 1100`
- Aspect ratio: about `2.91:1`
- Good higher-res option: `3840 x 1280`
- Absolute minimum: `2560 x 880`
- Best practice: compose this as a wide scene banner for the current desktop-first layout
- Do not use `2560 x 1440`
- Do not use `3200 x 1600`

### 02-track.png

- Purpose: lane surface and lower apron directly behind the racers
- Recommended size: `2560 x 960`
- Aspect ratio: `8:3`
- Minimum size: `1920 x 720`
- Notes:
  - Top `70%` to `75%` should contain the visible lane surface
  - Bottom `25%` to `30%` should contain the lower apron / curb / near-track detail
  - Keep the art fully opaque

## Safe composition rules

These matter more than raw pixel size.

### Background safe area

- Keep the main skyline / stadium / mountain shapes in the top `18%` to `72%` of the image
- Keep important focal elements inside the center `60%` of the width
- Leave the outer left and right `20%` expendable
- Keep the bottom `12%` free of tiny critical details
- Do not rely on thin signage text near the far edges

### Track safe area

- Keep lane markings, run direction, and race-surface texture clear and readable
- Avoid decorative elements that cross horizontally into racer silhouettes
- If using perspective details, keep them subtle so lane motion does not look warped

## Current scene workflow

Use this set for the current renderer:

- `01-background.png`: `3200 x 1100`
- `02-track.png`: `2560 x 960`

If separate desktop/mobile backgrounds are added later, document that when the renderer actually supports them as a standard scene format. They are not the current default.

## Character sprite sheets

### `run.png`

- Purpose: racer run cycle
- Recommended frame size: `128 x 128`
- Recommended frame count: `8`
- Recommended sheet size: `1024 x 128`
- Format: transparent PNG
- Direction: character faces right

Custom sprite sheets are supported, but this is the current baseline that matches bundled racers.

## Shared power-up asset

### `power-up.png`

- Purpose: shared question-box style pickup art
- Recommended size: `256 x 256`
- Minimum size: `128 x 128`
- Format: transparent PNG
- Shape: square

## UI / Store / Social Images

These are not part of a scene pack, but useful as a reference.

### Favicons

- `favicon-16x16.png`: `16 x 16`
- `favicon-32x32.png`: `32 x 32`
- `apple-touch-icon.png`: `180 x 180`

### Open graph image

- `og-image.png`: `1200 x 630`

## Export rules

- Use PNG for all scene assets
- Keep filenames lowercase and exact
- Do not bake the track into the background
- Keep transparency only where it is needed, mainly on sprite sheets
- Avoid heavy blur because the game art reads best with crisp shapes

## Quick handoff

If you want one exact spec to give an artist, use this:

```txt
01-background.png   3200 x 1100 PNG
02-track.png        2560 x 960  PNG
run.png             1024 x 128  PNG with transparency, 8 frames of 128 x 128
power-up.png        256 x 256   PNG with transparency
```

## Current file location

This spec is saved at:

`docs/asset-dimensions.md`
