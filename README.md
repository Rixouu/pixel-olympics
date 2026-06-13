# 🏁 Derby Royale

**Derby Royale** is a browser drinking game built around a side-scrolling pixel-art race: pick your racers, cheer them to the finish line, and let the standings decide who sips.

Everything runs in a **single HTML file** — no build step, no backend, no install. Open it on a phone or laptop, add up to eight players, and start the race.

**Play now:** [derby-royale.vercel.app](https://derby-royale.vercel.app/)

The game was built by [Jonathan Rycx](https://github.com/Rixouu), who leads product direction, design, and implementation across the Rixouu party-game repos.

[![HTML5 Canvas](https://img.shields.io/badge/Canvas-2D-ff8a2b?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-ES6+-f7df1e?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?style=flat&logo=vercel)](docs/deployment.md)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## ✨ Key Features

### 🏎️ Pixel-art race

- Side-on race, left → right, with **photo finish** and live standings HUD.
- **Procedural sprites** — all characters, scenes, and effects are drawn on canvas; no image assets to load.
- **10 racer archetypes**: Turtle, Duck, Frog, Penguin, Bunny, Ninja, Speedster, Runner, Knight, Wizard.
- Each player gets a **custom colour** and **character picker** in the lobby.

### 🌍 Scenes & atmosphere

- **5 scenes**: Beach, Meadow, Snow, Desert, Volcano — each with unique sky, track, and pixel props.
- **3 times of day**: Day, Sunset, Night (colour overlays on the scene).
- **3 race lengths**: Sprint (quick), Classic (balanced), Marathon (epic).

### ⚡ Power-ups (optional)

Toggle power-ups on or off before the race.

| Icon | Power-up | Effect |
|------|----------|--------|
| Boost | Yellow | Burst of speed |
| Star | White | Speed + immunity |
| Banana | Gold | Drop a trap behind you |
| Lightning | Blue | Slow racers ahead |
| Bubble | Cyan | Block one hit |

### 🍻 Drinking rules

Built for groups — the results screen calculates sips automatically:

- **Winner** deals sips equal to the number of players.
- Everyone else drinks their **finishing place** (2nd = 2 sips, etc.).
- **Last place** gets one extra sip (chug call-out).
- **Slowpoke clause**: never led the race → +1 sip of shame.

Drink responsibly — water counts too. **18+**

Full rules and house variants: **[docs/game-rules.md](docs/game-rules.md)**

### 🔊 Audio & UX

- Procedural **Web Audio** SFX (boosts, spins, finish fanfare).
- **Mute toggle** in the corner; respects `prefers-reduced-motion` for the countdown.
- Mobile-friendly layout with pixel fonts (**Press Start 2P**, **Jersey 10**).

## 🛠 Tech Stack

- **Single-file app**: `index.html` (HTML + CSS + vanilla JavaScript).
- **Canvas 2D** rendering with a low-res pixel scale (`image-rendering: pixelated`).
- **Web Audio API** for sound — no external libraries.
- **Google Fonts** for pixel typography (loaded from CDN when online).
- **Vercel** static hosting — see **[docs/deployment.md](docs/deployment.md)**.

No bundler, framework, or package manager required.

## 🚀 Quick Start

### Play locally

```bash
# Recommended — local static server
python3 -m http.server 8080
# open http://localhost:8080
```

Or open `index.html` directly (some browsers restrict audio on `file://`).

### Deploy on Vercel

1. Import [github.com/Rixouu/derby-royale](https://github.com/Rixouu/derby-royale) in Vercel.
2. Framework preset: **Other** — leave build/output commands empty.
3. Deploy — the game is live at **[derby-royale.vercel.app](https://derby-royale.vercel.app/)**.

Optional share URL: **`/play`** (rewrite to `/`). Details in **[docs/deployment.md](docs/deployment.md)**.

## 📁 Project Structure

```txt
derby-royale/
├── index.html           # Full game (production entry point)
├── derby-royale.html    # Legacy redirect → /
├── og-image.png         # Social / Open Graph preview
├── vercel.json          # Headers, cache, /play rewrite
├── docs/
│   ├── README.md        # Documentation index
│   ├── deployment.md    # Vercel & domains
│   ├── game-rules.md    # Drinking rules & variants
│   └── extending.md     # Add characters & scenes
├── README.md
└── LICENSE
```

## 🎮 How to Play

1. **Add players** (up to 8) — tap colour to recolour, tap the racer sprite to cycle character.
2. Choose **scene**, **time of day**, and **race length**.
3. Toggle **power-ups** if you want chaos (or turn off for a pure sprint).
4. Tap **START THE RACE** — countdown, then watch the HUD.
5. **Results** show placement, sip counts, and optional party prompts — race again or edit settings.

Expand **How to play & power-ups** in the lobby for the in-game rule card.

## 🌟 Implementation Notes

- **Extending characters / scenes**: see **[docs/extending.md](docs/extending.md)**.
- **Sprite cache**: characters are pre-rendered to offscreen canvases per colour/frame.
- **Lane model**: each player gets a dedicated lane; the camera tracks the race leader.

## 🔐 Privacy & Security

- **No accounts**, analytics, or network calls during gameplay (except optional Google Fonts CDN).
- **No data persistence** — refresh the page to reset the lobby.
- Security headers configured in `vercel.json`.

## 🤝 Contributing

Contributions are welcome.

1. Keep the game in **`index.html`** unless there is a strong reason to split assets.
2. Preserve the pixel-art aesthetic and mobile-first layout.
3. Test on both desktop and a phone-sized viewport before opening a PR.
4. Update **docs** when you change rules or extension APIs.

## 📄 License

[MIT License](LICENSE) — Copyright (c) 2026 Rixouu

## 👥 Team

- **Jonathan** — Lead Developer — [Rixouu](https://github.com/Rixouu)

## 🙏 Acknowledgments

- **Press Start 2P** & **Jersey 10** via Google Fonts
- Classic party-game energy from the Rixouu drinking-game collection ([split-the-g](https://github.com/Rixouu/split-the-g), [split-the-g-mobile](https://github.com/Rixouu/split-the-g-mobile), and friends)

---

**Built with ❤️ for friendly races and responsible sips.**
