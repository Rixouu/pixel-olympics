# Deployment (Vercel)

Pixel Olympics is a **Vite static site** — build output goes to `dist/`. No server functions or environment variables.

## Vercel project settings

| Setting | Value |
|---------|--------|
| Framework Preset | **Vite** (auto-detected from `vite.config.js`) |
| Build Command | `pnpm build` |
| Output Directory | `dist` |
| Install Command | `pnpm install` |
| Node.js | 20+ recommended |

Connect the GitHub repo [Rixouu/pixel-olympics](https://github.com/Rixouu/pixel-olympics) and deploy from `main`.

## What gets deployed

| Path (built) | Purpose |
|--------------|---------|
| `dist/index.html` | App shell |
| `dist/assets/*.js` | Bundled game (engine, characters, scenes chunks) |
| `dist/assets/*.css` | Styles + font `@font-face` rules |
| `dist/fonts/*.woff2` | Self-hosted Press Start 2P & Jersey 10 |
| `dist/favicon.*`, `og-image.png`, etc. | Copied from `public/` |

Redirect helpers: `public/derby-royale.html` and `public/pixel-olympics.html` → `/`

## URLs

**https://pixel-olympics.vercel.app/**

Optional alias: **`/play`** → `/` (rewrite in `vercel.json`)

## Local development

```bash
corepack enable
pnpm install
pnpm dev         # hot reload at http://localhost:5173
pnpm build       # production bundle → dist/
pnpm preview     # serve dist/ at http://localhost:4173
```

## Custom domain

1. Vercel dashboard → **Project → Settings → Domains**
2. Add your domain and update DNS per Vercel
3. Update absolute Open Graph URLs in `index.html` if needed

## Open Graph / social previews

Production meta tags point to:

- **Site:** `https://pixel-olympics.vercel.app/`
- **Image:** `https://pixel-olympics.vercel.app/og-image.png`

## Headers & caching (`vercel.json`)

- Security headers on all routes
- Long cache on `public/` assets (icons, fonts, OG image)
- Immutable cache on hashed `/assets/*` bundles
- HTML/JS/CSS revalidate hourly

## Rollback

Vercel dashboard → **Deployments** → previous deployment → **Promote to Production**.

## Checklist (first deploy)

- [ ] Repo linked to Vercel with Vite preset
- [ ] Build succeeds (`pnpm build` locally first)
- [ ] `/` loads the lobby
- [ ] Fonts render (no Google Fonts network call)
- [ ] `/derby-royale.html` redirects to `/`
- [ ] `/pixel-olympics.html` redirects to `/`
- [ ] `/play` serves the game
- [ ] Test on a phone via preview URL

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on Vercel | Run `pnpm build` locally; check Node 20+ and `pnpm-lock.yaml` is committed |
| Blank page | Browser console; verify `dist/index.html` references `/assets/` |
| Fonts missing | Ensure `public/fonts/*.woff2` exist and built to `dist/fonts/` |
| Stale bundle after deploy | Hard refresh; hashed assets in `/assets/` should bust cache |

## Related

- [Root README](../README.md)
- [Vercel Vite guide](https://vercel.com/docs/frameworks/vite)
