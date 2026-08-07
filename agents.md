# ZCore Development Instructions

## Product

ZCore is a React, Supabase, and Netlify application focused on helping users understand Calories In vs. Calories Out and their personal metabolism.

## Architecture

- Frontend: React and Vite
- Database and authentication: Supabase
- Hosting and server functions: Netlify
- Production branch: main
- Production domain: [https://zcore.health](https://zcore.health)

## Safety

- Never expose the Supabase service-role key in frontend code.
- Never expose WHOOP client secrets or refresh tokens.
- Keep privileged user and admin operations inside Netlify functions.
- Preserve Supabase row-level security.
- Do not include secrets in commits, logs, screenshots, or pull requests.

## Development workflow

- Create a new branch for every change.
- Do not commit directly to main.
- Keep changes narrowly scoped.
- Run the production build before declaring work complete.
- Report any build or test failures honestly.
- Open a pull request with a clear explanation of the changes.
- Do not delete or rewrite existing features unless the task explicitly requires it.

## Date handling

- Calendar dates shown to users must use the user's local timezone.
- Avoid parsing YYYY-MM-DD strings through UTC when calculating local calendar dates.
- Add tests for date and timezone behavior when changing sync logic.

## Wearables

- Wearables are optional enhancements, not required for ZCore.
- WHOOP-specific behavior must not affect users without WHOOP.
- Workouts, recovery, sleep, and calorie expenditure may use different provider date conventions.
- Do not change WHOOP date mappings without documenting the exact rule and adding tests.

## Database migrations

- Put new SQL migrations in the supabase directory.
- Migrations must preserve existing user data.
- Clearly identify any manual migration step in the pull request.
