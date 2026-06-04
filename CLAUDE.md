# Main Site (CharlesLogic)

Personal home page and app launcher at `charleslogic.com`.

## Architecture

Static `index.html` + Vercel serverless API functions. No build step.

```
main-site/
├── index.html              — single-page app (auth, app grid, member/admin slots)
├── infer.html              — NAM provider comparator (standalone, no auth)
├── infer.js                — all JS for infer.html (external file — CSP requires script-src 'self')
├── infer-icon.svg          — Infer app icon (dark green, question bar → 3 response panels)
├── marked.umd.js           — self-hosted marked (CDN blocked by CSP)
├── manifest.json           — PWA manifest
├── sw.js                   — service worker (precaches shell + all app SVG icons)
├── cl-icon.svg             — site icon (violet C on black)
├── *-icon.svg              — local copies of each app's SVG icon (served same-origin)
├── api/
│   ├── member-content.js   — GET /api/member-content (requires valid Supabase JWT)
│   ├── admin-content.js    — GET /api/admin-content (requires admin email)
│   ├── infer-keys.js       — GET /api/infer-keys (returns AI provider keys from env vars)
│   └── ebird-proxy.js      — GET /api/ebird-proxy (proxies eBird API, adds key server-side)
└── package.json
```

## Design

Clean modern dark — zinc palette (`#09090b` bg, `#18181b` cards), violet accent (`#7c3aed`).
App cards with SVG `<img>` icons (local copies, not cross-origin), pill tags, violet glow on hover. Light/dark theme toggle persists in `localStorage`. Icon files are copied from each app's repo and committed here so cards load instantly without depending on other deployments.

The previous terminal/hacker aesthetic was replaced — it felt like a costume for a single-page app launcher.

## Auth

Dual Google OAuth + OTP (magic code). Login lives in a dropdown under the user icon in the top nav — no separate auth panel on the page.

- Logged out: `Sign in` label → dropdown shows Google button + OTP flow
- Logged in: username label → dropdown shows email + Sign out button
- `shouldCreateUser: true` — open signup (not approval-gated like TrailView)

See trailview `CLAUDE.md` for the full dual-auth guide, TDZ gotcha, and Supabase setup.

## Member / Admin Content

Injected into `#member-slot` and `#admin-slot` by the API after login. The API verifies the Supabase JWT server-side — content is never in the page source.

`admin-content.js` gates on the admin's immutable Supabase user id via the `ADMIN_USER_ID` env var (same pattern as TrailView's `TV_ADMIN_USER_ID`) — not an email allowlist, which can drift or match an unverified address. Fail-closed: if `ADMIN_USER_ID` is unset, no one is admin.

## Environment Variables

| Variable | Used by | Value |
|----------|---------|-------|
| `SUPABASE_URL` | `index.html` auth | `https://nfvxmkknkxysjksyhbek.supabase.co` |
| `SUPABASE_ANON_KEY` | `index.html` auth | (from Supabase dashboard) |
| `ADMIN_USER_ID` | `admin-content.js` | Supabase UUID of the admin user — gates admin slot |
| `INFER_KEY_OPENROUTER` | `infer-keys.js` | OpenRouter API key |
| `INFER_KEY_GEMINI` | `infer-keys.js` | Google AI Studio API key |
| `INFER_KEY_CEREBRAS` | `infer-keys.js` | Cerebras API key |
| `INFER_KEY_GROQ` | `infer-keys.js` | Groq API key |
| `EBIRD_API_KEY` | `ebird-proxy.js` | eBird API key (same value as in NAM project) |

## Apps Listed

All apps are public (no login required to see the cards):

| App | URL | Icon file |
|-----|-----|-----------|
| NAM! | `nam.charleslogic.com` | `nam-icon.svg` |
| Bike Path | `bike.charleslogic.com` | `bike-icon.svg` |
| TrailView | `tv.charleslogic.com` | `trailview-icon.svg` |
| HabitLog | `habit.charleslogic.com` | `hab-icon.svg` |
| HobbyLog | `hobby.charleslogic.com` | `hobby-icon.svg` |
| TrackLog | `tracks.charleslogic.com` | `tracklog-icon.svg` |
| Worry Meter | `wm.charleslogic.com` | `wm-icon.svg` |
| Infer | `charleslogic.com/infer.html` | `infer-icon.svg` |

**When adding a new app:** copy its SVG icon into this repo, add an `<img class="nav-card-icon">` card in `index.html`, and add the icon path to the `PRECACHE` list in `sw.js`.

## Infer — NAM Provider Comparator

Standalone page at `/infer.html` — no auth, no SW integration. Sends the same prompt to multiple free LLMs side by side (OpenRouter, Gemini direct, Cerebras direct, Groq direct).

**CSP note:** `vercel.json` has `script-src 'self'` which blocks CDN imports and inline scripts. All JS lives in `infer.js` (external file) and `marked.umd.js` is self-hosted. The `connect-src` in `vercel.json` includes all external AI and nature API domains needed by infer.

**Keys:** fetched from `/api/infer-keys` on page load and populated into the password inputs. Keys live in Vercel env vars, never in the HTML source.

**Load nearby birds:** uses iNat and eBird to populate context for birding questions.
- iNat: paginates all pages (up to 10 × 200 = 2000 obs), all individual observations sorted nearest-first, includes `[@observer]`
- eBird: `detail=full` for observer names and `obsDt` for age; notable always unlimited; dedup by `subId+speciesCode` (same checklist entry in both recent and notable counts once; different checklists for same species both appear)
- Config inputs (Max iNat obs / Max eBird) persist to `localStorage`; blank = no limit

## Deploy Workflow

Commit changes → push to GitHub → Vercel auto-deploys via GitHub integration.
Do **not** use `vercel --prod` directly — it bypasses the GitHub integration and leaves git out of sync.
