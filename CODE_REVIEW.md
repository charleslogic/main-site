# Main Site (CharlesLogic) — Security & Code Review

Reviewed 2026-05-29 (Opus wrote + implemented). Personal home page / app launcher at
`charleslogic.com`. Static `index.html` + two Vercel functions that gate placeholder
member/admin content behind a Supabase JWT. No database queries, so no RLS surface.

Code fixes shipped in commit `<fill>`.

---

## Strong points

- Both API functions **validate the JWT** server-side via `supabase.auth.getUser(token)`
  before returning anything, and **query no tables** — so there is no RLS dependency.
- **Admin gate is sound**: keyed on the admin's immutable Supabase user id (`ADMIN_USER_ID`
  env var) and checked *after* JWT verification; non-admins get a fail-closed 403. See the
  updated note below — this replaced an email allowlist that had drifted.
- APIs return bare status codes (`401`/`403`) — no `error.message` leakage.
- OAuth uses standard `signInWithOAuth` + `redirectTo` — no `state=user-id` antipattern.

---

## Fixes shipped

| # | Finding | Severity | Fix | File |
|---|---------|----------|-----|------|
| 1 | Supabase import **unversioned** (`/+esm`) — auth client auto-tracks latest | Medium | Pinned `@2.106.2` (HTTP 200 verified) | `app.js` |
| 2 | Empty `vercel.json` — no headers | Low–Med | Headers + **full CSP** (see below) | `vercel.json` |
| 3 | Missing `.gitignore` | Low | Created (`node_modules`, `.env*`, `.vercel`) | `.gitignore` |
| 4 | Member content escaped email for `<` only; injected via `innerHTML` | Low | Complete escape (`& < > "`) server-side | `api/member-content.js` |

### Full CSP (this app only)
Unlike hab/nam, this page had **one inline `<script>` and no inline event handlers**, so a
strict `script-src` was cheap: the inline module was extracted to `app.js`, enabling

```
default-src 'self';
script-src 'self' https://cdn.jsdelivr.net;      (app.js + the pinned Supabase module)
connect-src 'self' https://nfvxmkknkxysjksyhbek.supabase.co;  (/api + Supabase auth)
style-src 'self' 'unsafe-inline';                (inline <style> + style= attrs in API HTML)
img-src 'self'; font-src 'self';
frame-ancestors 'none'; base-uri 'self'; object-src 'none'
```

This is real defense-in-depth for the `member-slot`/`admin-slot` `innerHTML` injection: even
if markup were ever injected, `script-src 'self'` blocks inline `<script>` / `onerror=`.

> Runtime caveat (not browser-verified from the dev environment): if Supabase auth ever
> needs `eval`/`wasm`, login would fail with a CSP violation. Watch the console on first
> load. Rollback = remove the `Content-Security-Policy` line from `vercel.json`.

---

## Six known shared-monorepo issues

| # | Issue | Status |
|---|-------|--------|
| 1 | RLS off | ✅ N/A — no DB queries |
| 2 | Unpinned / SRI-less CDN | ❌ → **fixed** (pinned; no other CDN scripts) |
| 3 | Empty `vercel.json` | ❌ → **fixed** |
| 4 | Missing `.gitignore` | ❌ → **fixed** |
| 5 | OAuth `state=user-id` | ✅ N/A — clean |
| 6 | Raw `error.message` to client | ✅ clean |

---

## Notes / not done

- **Admin gate (updated 2026-05-29):** now keyed on the admin's immutable Supabase user id
  via `ADMIN_USER_ID` env var (TrailView `TV_ADMIN_USER_ID` pattern), replacing the email
  allowlist. Email allowlists drift (a stray `…@yahoo.com` entry was matching) and can match
  unverified addresses on the shared project. Fail-closed: unset env var → no admin.
  **Requires `ADMIN_USER_ID` set in Vercel** = the gmail account's Auth UUID.
- `shouldCreateUser: true` (open signup) is intentional; new users only see the placeholder
  "Members" slot, and the admin slot stays email-gated.
