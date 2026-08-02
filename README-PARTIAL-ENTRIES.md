# ZCore Partial Daily Entries Update

This release changes each date into a living record that can be saved and updated in stages.

## Supabase first

Run `supabase/zcore-partial-daily-entries.sql` in the Supabase SQL Editor.

This removes the old requirement that weight, calories, and WHOOP total calories all be present before saving. It does not delete existing records.

## Install

Copy all files from this update into the existing ZCore repository, replace files when prompted, then commit and push through GitHub Desktop.

Suggested commit message:

`Allow partial daily entries and completion tracking`

## New workflow

- Save today's weight immediately with **Save progress**.
- Return later to the same date.
- Add macros and WHOOP data.
- Save again; the existing date is updated rather than duplicated.
- Completion indicators show whether weight, nutrition, WHOOP, and workouts are present.
