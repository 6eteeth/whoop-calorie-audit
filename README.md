# ZCore

ZCore is a personal metabolic-tracking web app for logging daily weight, macros,
and workouts. It estimates actual TDEE from calorie intake and weight trend and
can compare that estimate with optional WHOOP data.

The production app is available at [zcore.health](https://zcore.health), with the
signed-in application at [zcore.health/app](https://zcore.health/app).

## Stack

- React 18 and Vite
- Supabase Postgres and email authentication
- Netlify hosting and Netlify Functions
- Optional WHOOP OAuth integration

## Local setup

1. Install a current Node.js LTS release and npm.
2. Install dependencies:

   ```sh
   npm install
   ```

3. Copy `.env.example` to `.env.local` and provide the browser-safe credentials
   from **Supabase > Project Settings > API Keys**:

   ```sh
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   ```

4. Start the frontend:

   ```sh
   npm run dev
   ```

`npm run dev` runs only Vite. Use `netlify dev` when working with Netlify
Functions. The WHOOP callback and authentication email redirect currently point
to `https://zcore.health/app`, so those flows are production-oriented unless the
hard-coded URLs are changed for local development.

## Database setup

For a new Supabase project, run `supabase-schema.sql` in the Supabase SQL Editor,
then run these idempotent patch scripts in order:

1. `supabase/whoop-integration.sql`
2. `supabase/zcore-daily-sync-macros.sql`
3. `supabase/zcore-partial-daily-entries.sql`
4. `supabase/zcore-wearable-optional-context.sql`
5. `supabase/zcore-admin-analytics.sql`

The live schema is the combination of the base schema and all patch scripts; no
single file represents the complete current schema. Before running the admin
script for a new project, review its final `admin_users` insert and set the email
to the account that should have admin access. That account must already exist in
Supabase Auth.

The WHOOP token and OAuth-state tables deliberately have row-level security with
no browser policies. Do not add client access to them or expose the Supabase
service-role key.

## Environment variables

Configure these values in **Netlify > Site configuration > Environment
variables**.

### Browser/build variables

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase publishable or legacy anon key

Only variables prefixed with `VITE_` are bundled into browser code. Never use
that prefix for a secret.

### Server-only variables

- `SUPABASE_URL` — the same Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase secret/service-role key
- `WHOOP_CLIENT_ID` — WHOOP OAuth application client ID
- `WHOOP_CLIENT_SECRET` — WHOOP OAuth application client secret
- `WHOOP_REDIRECT_URI` — the callback registered with WHOOP; in production this
  is `https://zcore.health/.netlify/functions/whoop-callback`

Keep all server-only values out of browser code, local files committed to Git,
logs, and pull requests.

## WHOOP setup

1. Create or configure the WHOOP developer application.
2. Register `https://zcore.health/.netlify/functions/whoop-callback` as its
   redirect URI.
3. Add the WHOOP and server-side Supabase variables above to Netlify.
4. Deploy, sign in at `/app`, open Integrations, and connect WHOOP.

WHOOP is optional. Weight, nutrition, steps, and manual workouts work without a
wearable connection.

## Build and deploy

Run the production build before deploying:

```sh
npm run build
```

Netlify reads `netlify.toml`, runs `npm run build`, publishes `dist`, and rewrites
SPA routes to `index.html`. Pushing the production branch triggers the production
deployment once the repository is connected to Netlify.

After deployment, verify sign-in and a daily entry. If WHOOP is configured, also
verify the OAuth connection and a selected-day sync.

The legal and contact pages use `support@zcore.health`. Ensure that mailbox is
monitored, or update `CONTACT_EMAIL` near the top of `src/App.jsx` before
launching the site or submitting the WHOOP application.

## Useful commands

- `npm run dev` — start the Vite development server
- `npm run build` — create the production bundle
- `npm run preview` — preview the production bundle locally
- `npm test` — run the Node test suite

## Public URLs

- Website: `https://zcore.health`
- Application: `https://zcore.health/app`
- About: `https://zcore.health/about`
- Consistency guide: `https://zcore.health/consistency`
- Learning Center: `https://zcore.health/learning`
- Privacy policy: `https://zcore.health/privacy`
- Terms: `https://zcore.health/terms`
- Contact: `https://zcore.health/contact`
