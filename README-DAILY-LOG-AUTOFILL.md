# ZCore daily-log autofill fix

This update fixes the Daily Log so reopening it automatically loads the saved record for today.

## Behavior

- Enter and save morning weight.
- Leave the Daily Log.
- Return later the same day.
- The saved weight and completion indicator are shown automatically.
- Later updates continue to upsert the same date rather than creating a duplicate.

No Supabase SQL or Netlify environment-variable changes are required.
