create table if not exists public.whoop_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.whoop_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  whoop_user_id bigint,
  whoop_email text,
  whoop_first_name text,
  whoop_last_name text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  body_measurement jsonb,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.whoop_workouts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  whoop_user_id bigint,
  workout_date date not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone_offset text,
  sport_id integer,
  sport_name text,
  score_state text,
  strain numeric,
  average_heart_rate integer,
  max_heart_rate integer,
  kilojoule numeric,
  calories integer,
  duration_minutes integer,
  raw_data jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.whoop_daily_metrics (
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id bigint not null,
  metric_date date not null,
  cycle_start timestamptz,
  cycle_end timestamptz,
  timezone_offset text,
  cycle_score_state text,
  strain numeric,
  total_kilojoule numeric,
  total_calories integer,
  average_heart_rate integer,
  max_heart_rate integer,
  recovery_score integer,
  resting_heart_rate integer,
  hrv_rmssd_milli numeric,
  spo2_percentage numeric,
  skin_temp_celsius numeric,
  raw_cycle jsonb,
  raw_recovery jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, cycle_id)
);

alter table public.whoop_oauth_states enable row level security;
alter table public.whoop_connections enable row level security;
alter table public.whoop_workouts enable row level security;
alter table public.whoop_daily_metrics enable row level security;

-- OAuth states and token records are server-only. No browser policies are created.

create policy "Users can view their WHOOP workouts"
on public.whoop_workouts for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their WHOOP daily metrics"
on public.whoop_daily_metrics for select to authenticated
using ((select auth.uid()) = user_id);

create index if not exists whoop_workouts_user_date_idx on public.whoop_workouts (user_id, workout_date desc);
create index if not exists whoop_daily_metrics_user_date_idx on public.whoop_daily_metrics (user_id, metric_date desc);
