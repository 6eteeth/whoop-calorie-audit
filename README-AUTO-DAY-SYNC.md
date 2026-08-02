# ZCore automatic selected-day WHOOP sync

## What changed

- Selecting a date in Daily Entry now automatically:
  - loads any ZCore entry already saved for that date;
  - retrieves WHOOP workouts that started on that local calendar date;
  - finds the completed, scored WHOOP physiological cycle associated with that date;
  - fills WHOOP total calories, day strain, average/max heart rate, recovery, resting heart rate, HRV, SpO2, skin temperature, sleep stages, sleep performance, sleep efficiency, consistency, respiratory rate, disturbances, and sleep need.
- The button remains available as **Refresh selected day**.
- The cycle matcher no longer relies only on the date the cycle ended. It prefers a completed cycle that starts on the selected local date, then a cycle that spans local noon, and uses the local end date only as a fallback.
- WHOOP total calories are calculated from the cycle's kilojoules using kilojoules / 4.184.
- Steps remain a manual field because the official WHOOP Developer API does not currently expose step counts.

## Install

1. Back up the current GitHub project folder.
2. Copy everything in this update folder into the existing project folder and replace matching files.
3. In GitHub Desktop, commit with: `Improve automatic selected-day WHOOP sync`
4. Push origin and wait for Netlify to publish.
5. No Supabase SQL or new environment variables are required for this update.

## Test

1. Open Daily Entry.
2. Change the date to a completed prior day.
3. Wait for the loading message to finish.
4. Confirm WHOOP total calories, workouts, recovery, resting HR, HRV, strain, and sleep populate.
5. Enter steps manually, review the values, and save.
