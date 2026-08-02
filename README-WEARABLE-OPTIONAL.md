# ZCore Wearable-Optional Update

This release makes weight, macros, steps, and manual workouts the default ZCore experience. WHOOP is now an optional integration under **Integrations**.

## Database migration
Run `supabase/zcore-wearable-optional-context.sql` in the Supabase SQL Editor before deploying the code.

## New daily context flags
- AI-assisted calorie estimate
- Caffeine after 3 PM
- Alcohol consumed

## Workout changes
Each of three workouts now has a generic optional calorie field. Existing WHOOP workout calories are copied into these generic fields by the migration.

## Deployment
Copy this update over the existing repository, commit, and push. No new Netlify environment variables are required.
