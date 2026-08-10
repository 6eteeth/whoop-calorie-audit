-- Align stored WHOOP daily metrics with the calendar-day labels shown by WHOOP.
-- The selected-day and bulk sync paths now use this same cycle-end convention.
-- Safe to run more than once.

update public.whoop_daily_metrics
set metric_date = ((coalesce(cycle_end, cycle_start + interval '1 day')
  + coalesce(timezone_offset, '+00:00')::interval)::date),
    updated_at = now()
where cycle_start is not null
  and metric_date is distinct from ((coalesce(cycle_end, cycle_start + interval '1 day')
    + coalesce(timezone_offset, '+00:00')::interval)::date);

-- daily_entries deliberately are not moved here: those rows also contain weight,
-- nutrition, and manual workouts. Refreshing and saving a date replaces only that
-- date's wearable fields without risking movement of the user's other records.
