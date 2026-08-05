# ZCore Admin Analytics Update

## 1. Run the Supabase migration

Open `supabase/zcore-admin-analytics.sql` and replace:

`REPLACE_WITH_YOUR_ZCORE_EMAIL`

with the email address you use to sign into ZCore. Keep the single quotation marks.

Run the full file in Supabase SQL Editor.

## 2. Deploy

Copy this update into the existing GitHub project, commit, and push. No new environment variables are required because the existing server-side Supabase service-role variables are reused.

## Included

- Admin tab visible only to approved administrators
- Server-side administrator verification
- First and last name collection for new accounts
- User directory with email, last login, wearable status, last sync, log count, and streak
- DAU, WAU, MAU, monthly signups, wearable adoption, workout mix, logging consistency, 28-day TDEE readiness, aggregate TDEE, and aggregate weight-change analytics

The admin portal intentionally does not display individual users' weight, calories, sleep, recovery, or other detailed health records.
