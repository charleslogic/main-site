# Main Site (CharlesLogic)

Personal home page and app launcher at `charleslogic.com`.

## Architecture

Static `index.html` + two Vercel serverless API functions. No build step.

```
main-site/
├── index.html              — single-page app (auth, app grid, member/admin slots)
├── api/
│   ├── member-content.js   — GET /api/member-content (requires valid Supabase JWT)
│   └── admin-content.js    — GET /api/admin-content (requires admin email)
└── package.json
```

## Design

Clean modern dark — zinc palette (`#09090b` bg, `#18181b` cards), violet accent (`#7c3aed`).
App cards with emoji icons, pill tags, violet glow on hover. Light/dark theme toggle persists in `localStorage`.

The previous terminal/hacker aesthetic was replaced — it felt like a costume for a single-page app launcher.

## Auth

Dual Google OAuth + OTP (magic code). Login lives in a dropdown under the user icon in the top nav — no separate auth panel on the page.

- Logged out: `Sign in` label → dropdown shows Google button + OTP flow
- Logged in: username label → dropdown shows email + Sign out button
- `shouldCreateUser: true` — open signup (not approval-gated like TrailView)

See trailview `CLAUDE.md` for the full dual-auth guide, TDZ gotcha, and Supabase setup.

## Member / Admin Content

Injected into `#member-slot` and `#admin-slot` by the API after login. The API verifies the Supabase JWT server-side — content is never in the page source.

`admin-content.js` uses a hardcoded `ADMIN_EMAILS` array (temporary — replace with a Supabase profiles role check when needed).

## Environment Variables

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://nfvxmkknkxysjksyhbek.supabase.co` |
| `SUPABASE_ANON_KEY` | (from Supabase dashboard) |

## Apps Listed

All four apps are public (no login required to see the cards):

| App | URL | Description |
|-----|-----|-------------|
| NAM! | `nam.charleslogic.com` | Recent sightings from eBird & iNaturalist; Amy's birding life list and needs list |
| Bike Path | `bike.charleslogic.com` | Arcade game — dodge cones, leaderboard |
| TrailView | `tv.charleslogic.com` | GPS activity map from Strava |
| Habit | `habit.charleslogic.com` | Habit tracking and streaks |

## Deploy Workflow

Commit changes → push to GitHub → Vercel auto-deploys via GitHub integration.
Do **not** use `vercel --prod` directly — it bypasses the GitHub integration and leaves git out of sync.
