# WHOOP Calorie Audit — Version 1

A private, mobile-friendly web app for tracking daily weight, calorie intake, WHOOP expenditure, protein, steps and workouts. It estimates personal TDEE and WHOOP's average error from weight change over a rolling 28-day window.

## Included

- Email/password account
- Cloud synchronization through Supabase
- Add or replace one entry per date
- Edit entries by tapping a history row
- Delete entries
- 7-day weight trend
- Intake vs. WHOOP chart
- WHOOP correction-factor estimate
- Phone, tablet and desktop layout

## Step 1: Create a Supabase project

1. Create a free project at Supabase.
2. Open **SQL Editor**.
3. Paste and run `supabase-schema.sql`.
4. Open **Authentication > Providers** and leave Email enabled.
5. Email confirmation can remain enabled. After registering, confirm the email before signing in.

The SQL enables Row Level Security. Each account can only access its own entries.

## Step 2: Connect this app

1. In Supabase, open **Project Settings > API**.
2. Copy the Project URL.
3. Copy the publishable key. A legacy anon key also works.
4. Open `config.js` and replace both placeholders.

Never place a service-role key in `config.js`.

## Step 3: Test locally

Because this app uses JavaScript modules, serve the folder rather than double-clicking `index.html`.

With Python installed:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Step 4: Put it online

### Fastest method: Netlify Drop

1. After updating `config.js`, zip or select the project folder.
2. Open Netlify Drop and drag the folder into the page.
3. Netlify provides an HTTPS address.
4. Open that address on each device and sign in with the same account.

### GitHub + Netlify or Vercel

Upload the files to a private GitHub repository and import that repository. This is a static app, so there is no build command and the publish directory is the repository root.

On Android or iPhone, open the deployed address and use **Add to Home Screen** for an app-like shortcut.

## Accuracy calculation

- Energy represented by weight change per day = `(weight change × 3,500) ÷ elapsed days`
- Estimated actual TDEE = `average intake − daily energy represented by weight change`
- WHOOP error = `average WHOOP expenditure − estimated actual TDEE`
- Personal correction factor = `estimated actual TDEE ÷ average WHOOP expenditure`

Treat 14 days as preliminary and 28–56 days as more useful. Food-log errors and water, glycogen, sodium and digestive-content changes can materially distort the result.
