-- ZCore selected-day WHOOP sync and macro-calorie update.
-- Safe to run more than once.

alter table public.daily_entries add column if not exists carbs_g numeric;
alter table public.daily_entries add column if not exists fat_g numeric;
alter table public.daily_entries add column if not exists whoop_day_strain numeric;
alter table public.daily_entries add column if not exists whoop_average_heart_rate integer;
alter table public.daily_entries add column if not exists whoop_max_heart_rate integer;
alter table public.daily_entries add column if not exists whoop_recovery_score integer;
alter table public.daily_entries add column if not exists whoop_resting_heart_rate integer;
alter table public.daily_entries add column if not exists whoop_hrv_rmssd_milli numeric;
alter table public.daily_entries add column if not exists whoop_spo2_percentage numeric;
alter table public.daily_entries add column if not exists whoop_skin_temp_celsius numeric;
alter table public.daily_entries add column if not exists whoop_sleep_duration_minutes integer;
alter table public.daily_entries add column if not exists whoop_time_in_bed_minutes integer;
alter table public.daily_entries add column if not exists whoop_awake_minutes integer;
alter table public.daily_entries add column if not exists whoop_light_sleep_minutes integer;
alter table public.daily_entries add column if not exists whoop_slow_wave_sleep_minutes integer;
alter table public.daily_entries add column if not exists whoop_rem_sleep_minutes integer;
alter table public.daily_entries add column if not exists whoop_sleep_performance_percentage numeric;
alter table public.daily_entries add column if not exists whoop_sleep_efficiency_percentage numeric;
alter table public.daily_entries add column if not exists whoop_sleep_consistency_percentage numeric;
alter table public.daily_entries add column if not exists whoop_respiratory_rate numeric;
alter table public.daily_entries add column if not exists whoop_disturbance_count integer;
alter table public.daily_entries add column if not exists whoop_sleep_cycle_count integer;
alter table public.daily_entries add column if not exists whoop_sleep_needed_minutes integer;
alter table public.daily_entries add column if not exists whoop_synced_at timestamptz;

alter table public.whoop_daily_metrics add column if not exists sleep_id uuid;
alter table public.whoop_daily_metrics add column if not exists sleep_start timestamptz;
alter table public.whoop_daily_metrics add column if not exists sleep_end timestamptz;
alter table public.whoop_daily_metrics add column if not exists sleep_duration_minutes integer;
alter table public.whoop_daily_metrics add column if not exists time_in_bed_minutes integer;
alter table public.whoop_daily_metrics add column if not exists awake_minutes integer;
alter table public.whoop_daily_metrics add column if not exists light_sleep_minutes integer;
alter table public.whoop_daily_metrics add column if not exists slow_wave_sleep_minutes integer;
alter table public.whoop_daily_metrics add column if not exists rem_sleep_minutes integer;
alter table public.whoop_daily_metrics add column if not exists sleep_performance_percentage numeric;
alter table public.whoop_daily_metrics add column if not exists sleep_efficiency_percentage numeric;
alter table public.whoop_daily_metrics add column if not exists sleep_consistency_percentage numeric;
alter table public.whoop_daily_metrics add column if not exists respiratory_rate numeric;
alter table public.whoop_daily_metrics add column if not exists disturbance_count integer;
alter table public.whoop_daily_metrics add column if not exists sleep_cycle_count integer;
alter table public.whoop_daily_metrics add column if not exists sleep_needed_minutes integer;
alter table public.whoop_daily_metrics add column if not exists raw_sleep jsonb;

alter table public.daily_entries drop constraint if exists daily_entries_carbs_g_check;
alter table public.daily_entries add constraint daily_entries_carbs_g_check check (carbs_g is null or carbs_g >= 0);
alter table public.daily_entries drop constraint if exists daily_entries_fat_g_check;
alter table public.daily_entries add constraint daily_entries_fat_g_check check (fat_g is null or fat_g >= 0);
