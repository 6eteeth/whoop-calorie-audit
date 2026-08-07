# AGENTS.md

ZCore ("whoop-calorie-audit") is a personal metabolic-tracking web app deployed
at https://zcore.health. Users log daily weight, macros, and workouts; the app
estimates true TDEE from intake vs. weight trend and compares it against WHOOP's
calorie estimates. Single production deployment on Netlify, data in Supabase.

## Stack

- **Frontend**: React 18 + Vite SPA, plain JavaScript/JSX (no TypeScript). All
  routing is hand-rolled in `src/App.jsx` via `pushState`/`popstate` — there is
  no router library. Charts via `chart.js` / `react-chartjs-2`.
- **Backend**: Netlify Functions in `netlify/functions/*.mjs` (Web
  `Request`/`Response` API, default-exported handlers). Shared helpers live in
  `netlify/functions/_whoop-utils.mjs` (the `_` prefix keeps it from being
  deployed as an endpoint).
- **Database/auth**: Supabase (Postgres + RLS + email auth). The browser talks
  to Supabase directly for `daily_entries`/`user_preferences`; Netlify functions
  use the service-role key for everything WHOOP- and admin-related.

## Commands

- `npm run dev` — Vite dev server (frontend only; functions won't run — use
  `netlify dev` if you need them locally, but see Gotchas about hard-coded URLs).
- `npm run build` — production build. **This is the only validation mechanism in
  the repo** (no tests, no linter, no CI). Always run it before considering a
  change done.

## Environment variables

Client (Vite, set in Netlify build env): `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`.
Server (functions): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_REDIRECT_URI`.

## Database schema and migrations

There is no migration tool. `supabase-schema.sql` is the original base schema;
the files in `supabase/` are idempotent patch scripts that were run manually in
the Supabase SQL editor, roughly in this order: `whoop-integration.sql` →
`zcore-daily-sync-macros.sql` → `zcore-partial-daily-entries.sql` →
`zcore-wearable-optional-context.sql` → `zcore-admin-analytics.sql`. The live
database is the sum of all of them — no single file reflects current state.
To change the schema, add a new idempotent script (guard with
`if not exists` / `drop ... if exists`) rather than editing existing files.

## Security model (do not weaken)

- `whoop_connections` (OAuth tokens) and `whoop_oauth_states` have RLS enabled
  with **no policies on purpose** — they must stay unreadable from the browser.
  Only functions using the service-role key touch them.
- Admin access is gated by membership in the `admin_users` table, checked
  server-side in `admin-overview.mjs`. There is no client-side admin secret.
- Every function must call `authenticatedUser(req)` (validates the Supabase JWT
  from the `Authorization: Bearer` header) before doing anything.
- All user-data tables are per-user via RLS on `auth.uid()`. Client queries
  intentionally omit `user_id` filters and rely on RLS.

## Domain conventions

- Dates are local-calendar-day strings (`YYYY-MM-DD`), never UTC instants.
  The client derives them with `localDateKey()` and passes an explicit
  `timezone_offset` to sync functions. Be very careful with timezone handling —
  several past bugs (see git history) were date-mapping bugs.
- Calories eaten are always **computed from macros** (carbs×4 + protein×4 +
  fat×9), never entered directly. Use `caloriesFromMacros` in
  `src/lib/analytics.js` rather than duplicating the formula.
- WHOOP reports energy in kilojoules; convert with `kJ / 4.184`.
- A WHOOP "cycle" is a physiological day that starts when the user wakes. A
  calendar day maps to the cycle that *started* on that local day
  (`selectCycle` in `whoop-sync-day.mjs`). Preserve this rule.
- TDEE estimate requires 14 logged days (weight + calories) and uses
  3500 kcal/lb; both frontend and admin analytics use `calculateMetrics` in
  `src/lib/analytics.js`.

## Gotchas

- **Two divergent WHOOP sync paths** write to `whoop_daily_metrics`:
  `whoop-sync.mjs` (bulk, 45-day window) sets `metric_date` from the cycle *end*
  date, while `whoop-sync-day.mjs` (selected day) sets it to the requested local
  *start* date. If you touch either, reconcile or at least don't add a third.
- Supabase caps responses at 1000 rows by default; none of the queries paginate
  (`loadEntries`, all the `admin-overview` table scans).
- WHOOP list endpoints are queried with `limit=25` and the `next_token`
  pagination is ignored.
- Production URLs (`https://zcore.health/app`) are hard-coded in
  `whoop-callback.mjs` and in `AuthScreen`'s `emailRedirectTo`, so OAuth and
  email flows only work against production.
- `src/App.jsx` contains the marketing site, legal pages, auth, dashboard,
  entry form, history, and admin portal (~500 dense lines). Prefer extracting
  new UI into `src/components/` rather than growing it further.
- The `README-*.md` files are per-change historical notes, not current docs.
  Don't add new ones; update `README.md` (or this file) instead.

## Style

- Match existing code: functional React components, no classes, minimal
  comments, terse casual commit messages without `feat:`/`fix:` prefixes.
- No test framework exists. For any change beyond trivial, state in your summary
  exactly how you validated it (at minimum `npm run build`).
