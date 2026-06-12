# Main Site (CharlesLogic)

Personal home page and app launcher at `charleslogic.com`.

## Architecture

Static `index.html` + Vercel serverless API functions. No build step.

```
main-site/
├── index.html              — single-page app (auth, app grid, member/admin slots)
├── manifest.json           — PWA manifest
├── sw.js                   — service worker (precaches shell + all app SVG icons)
├── cl-icon.svg             — site icon (violet C on black)
├── *-icon.svg              — local copies of each app's SVG icon (served same-origin)
├── api/
│   ├── member-content.js   — GET /api/member-content (requires valid Supabase JWT)
│   └── admin-content.js    — GET /api/admin-content (requires admin email)
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
| Infer | `infer.charleslogic.com` | `infer-icon.svg` |
| CompAI | `compai.charleslogic.com` | `compai-icon.svg` |
| Annoyed | `annoyed.charleslogic.com` | `annoyed-icon.svg` |
| Ground Truth | `gt.charleslogic.com` | `gt-icon.svg` |
| Debate! | `debate.charleslogic.com` | `debate-icon.svg` |

**When adding a new app:** copy its SVG icon into this repo, add an `<img class="nav-card-icon">` card in `index.html`, and add the icon path to the `PRECACHE` list in `sw.js`.

## Deploy Workflow

Commit changes → push to GitHub → Vercel auto-deploys via GitHub integration.
Do **not** use `vercel --prod` directly — it bypasses the GitHub integration and leaves git out of sync.
