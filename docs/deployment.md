# Deployment (Vercel)

Derby Royale is a **static site** — no build step, no environment variables, no server functions.

## Vercel project settings

| Setting | Value |
|---------|--------|
| Framework Preset | **Other** |
| Root Directory | `.` (repo root) |
| Build Command | *(leave empty)* |
| Output Directory | *(leave empty)* |
| Install Command | *(leave empty)* |

Connect the GitHub repo [Rixouu/derby-royale](https://github.com/Rixouu/derby-royale) and deploy from `main`.

## What gets deployed

| Path | Purpose |
|------|---------|
| `index.html` | Full game (entry point at `/`) |
| `derby-royale.html` | Legacy redirect → `/` |
| `og-image.png` | Open Graph / social preview image |
| `vercel.json` | Security headers, cache, `/play` rewrite |

## URLs

After the first deploy, production is served at:

**https://derby-royale.vercel.app/**

Optional clean alias (configured in `vercel.json`):

**https://derby-royale.vercel.app/play** → same game as `/`

## Custom domain

1. Vercel dashboard → **Project → Settings → Domains**
2. Add your domain (e.g. `derby.rixouu.com` or a dedicated `.app` name)
3. Update DNS per Vercel’s instructions (usually `CNAME` to `cname.vercel-dns.com`)
4. After the domain is live, set absolute Open Graph URLs if social previews need them (see below)

## Preview vs production

- **Production** — merges to `main` auto-deploy (if enabled)
- **Preview** — every PR gets a unique `*.vercel.app` URL for testing on phone/desktop

No secrets or env vars are required for this project.

## Open Graph / social previews

`index.html` includes absolute `og:*` and `twitter:*` meta tags for production:

- **Site:** `https://derby-royale.vercel.app/`
- **Image:** `https://derby-royale.vercel.app/og-image.png`

If you add a **custom domain**, update these URLs in `index.html` (and the `rel="canonical"` link) to match the new hostname.

## Headers & caching (`vercel.json`)

- Global security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`)
- `og-image.png` — cached 24h with stale-while-revalidate
- HTML/JS/CSS — cached 1h, must revalidate (reasonable for a game you may update)

## Rollback

Vercel dashboard → **Deployments** → select a previous deployment → **Promote to Production**.

## Local parity with production

```bash
# Same as serving static files locally
python3 -m http.server 8080
# open http://localhost:8080
```

Or use the Vercel CLI:

```bash
npx vercel dev
```

## Checklist (first deploy)

- [ ] Repo linked to Vercel
- [ ] Framework = Other, no build command
- [ ] `/` loads the lobby (not a redirect loop)
- [ ] `/derby-royale.html` redirects to `/`
- [ ] `/play` serves the game (rewrite)
- [ ] `/og-image.png` returns 200
- [ ] Test on a phone over preview URL
- [ ] Optional: custom domain + absolute OG URLs

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank page | Check browser console; ensure `index.html` is at repo root |
| Fonts missing offline | Expected — Google Fonts load from CDN when online |
| Audio silent on `file://` | Use a local server or Vercel preview URL |
| Old version after deploy | Hard refresh or wait for CDN cache (HTML revalidates hourly) |

## Related

- [Root README](../README.md) — features and quick start
- [Vercel static deployment docs](https://vercel.com/docs/frameworks/other)
