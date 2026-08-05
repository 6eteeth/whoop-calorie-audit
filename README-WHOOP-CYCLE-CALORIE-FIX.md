# ZCore WHOOP selected-day calorie fix

This update prevents calories from the current WHOOP cycle from being written into a historical Daily Log date.

## Changes

- The browser sends its local UTC offset for the selected date, including daylight-saving time.
- The server accepts only the WHOOP physiological cycle whose local start date exactly matches the selected Daily Log date.
- Calories, strain, heart rate, recovery, HRV, and sleep are all returned from that same cycle ID.
- If an exact cycle cannot be matched, ZCore leaves the daily wearable fields unchanged rather than substituting another day's cycle.
- Netlify function logs now include the requested date, matched cycle ID, timestamps, local start date, score state, and calorie result for troubleshooting.

## Install

Copy the contents of this project over the current ZCore project, commit, push, and wait for Netlify to deploy. No Supabase migration or new environment variables are required.
