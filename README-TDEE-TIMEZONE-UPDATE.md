# ZCore TDEE Gate and Local Time Update

## Changes

- Estimated actual TDEE remains hidden until the user has 28 complete logged days containing both morning weight and nutrition/calories.
- The dashboard shows a live countdown such as `17 days left` before the estimate becomes available.
- Wearable correction and accuracy estimates also wait for the same 28-day foundation.
- ZCore now derives the current date from the visitor's browser/device local time instead of UTC.
- The active date automatically rolls over at local midnight while the app remains open.
- Sunday-to-Saturday weekly grouping also uses local calendar dates rather than UTC conversion.

No Supabase migration or new environment variables are required.
