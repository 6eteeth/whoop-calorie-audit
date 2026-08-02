# ZCore React Migration

ZCore is now a React + Vite app using the same Supabase database and authentication as the original version. Your existing entries remain in Supabase and are not deleted or migrated.

## Replace the current GitHub project

1. Make a backup copy of your current project folder.
2. Copy all files from this ZCore folder into your existing `whoop-calorie-audit` local repository.
3. Delete the old root files `app.js`, `styles.css`, and `config.js` after confirming the new files are present.
4. Commit and push with GitHub Desktop.

## Add Netlify environment variables

In Netlify, open your project and go to **Project configuration → Environment variables**. Add:

- `VITE_SUPABASE_URL` = your existing Supabase Project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` = your existing Supabase publishable key

Do not use a service-role or secret key.

## Netlify build settings

The included `netlify.toml` sets these automatically:

- Build command: `npm run build`
- Publish directory: `dist`

After pushing to GitHub, Netlify should install dependencies and deploy automatically.

## Local testing

Install Node.js first, then run:

```bash
npm install
npm run dev
```

Open the local address shown in the terminal.

## Database

No new SQL is required if the current app already supports three workouts per day. This React app uses the same `daily_entries` table and the same Row Level Security policies.

## Rollback

If the new deployment fails, use Netlify's Deploys page to publish the previous successful deployment, or restore the backup folder and push it to GitHub.
