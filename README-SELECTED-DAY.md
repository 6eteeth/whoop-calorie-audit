# ZCore 0.5 — Selected-Day WHOOP Sync + Macro Calories

## What changed

- Daily Entry now has **Sync selected day from WHOOP**.
- The function asks WHOOP only for records around the selected date, filters them to that date, and upserts them without duplicates.
- It fills total WHOOP calories, up to three workouts, workout minutes/calories, day strain, recovery, resting heart rate, HRV, SpO2, skin temperature, average/max heart rate, and detailed sleep metrics.
- Nutrition entry now uses **carbohydrates, fat, and protein grams**. Calories are calculated as carbs x 4 + protein x 4 + fat x 9.
- Historical rows remain intact. Old rows may show blank carbs and fat until edited.

## Important WHOOP date note

WHOOP organizes data by physiological cycles rather than strict midnight-to-midnight calendar days. ZCore assigns a completed cycle to the local date on which the cycle ended, matching the date shown for the completed WHOOP day. Workouts are assigned by their local start date.

## Installation

1. Run `supabase/zcore-daily-sync-macros.sql` in the Supabase SQL Editor.
2. Copy this package over the existing project files.
3. Commit and push to GitHub.
4. Wait for Netlify to publish.
5. Open Daily Entry, choose a date, and press **Sync selected day from WHOOP**.
6. Review the imported values, enter weight/macros/steps, and save.

No new Netlify environment variables are required.
