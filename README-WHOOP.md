# ZCore WHOOP Integration

This update adds secure WHOOP OAuth through Netlify Functions and imports the latest 45 days of WHOOP workouts, cycles, and recovery data.

## 1. Run the Supabase SQL

Open Supabase > SQL Editor > New query. Copy all of `supabase/whoop-integration.sql`, paste it, and click Run.

## 2. Add two more Netlify environment variables

You already added the three WHOOP variables. Add:

- `SUPABASE_URL` = the same Supabase Project URL used by `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase > Project Settings > API Keys > Secret keys / service_role key

The service-role key is server-only. Never put it in a file beginning with `VITE_`, GitHub, or browser code.

## 3. Deploy

Copy all files in this update over the existing repository, commit, and push. Netlify will build the React site and bundle the functions.

## 4. Test

Sign into https://zcore.health/app, open the WHOOP tab, click Connect WHOOP, approve access, then click Sync WHOOP.

The initial sync imports up to 25 records in each category from the previous 45 days. Pagination and background/webhook syncing can be added after the first connection is confirmed.
