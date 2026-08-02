-- ZCore wearable-optional daily log and context update
alter table public.daily_entries
  add column if not exists workout_1_calories numeric,
  add column if not exists workout_2_calories numeric,
  add column if not exists workout_3_calories numeric,
  add column if not exists used_ai_calorie_estimate boolean not null default false,
  add column if not exists caffeine_after_3pm boolean not null default false,
  add column if not exists alcohol_consumed boolean not null default false;

-- Preserve existing WHOOP workout calories in the generic workout calorie fields.
update public.daily_entries
set workout_1_calories = coalesce(workout_1_calories, workout_1_whoop_calories),
    workout_2_calories = coalesce(workout_2_calories, workout_2_whoop_calories),
    workout_3_calories = coalesce(workout_3_calories, workout_3_whoop_calories);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wearable_provider text not null default 'none' check (wearable_provider in ('none','whoop','other')),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users can read their preferences" on public.user_preferences;
create policy "Users can read their preferences"
on public.user_preferences for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their preferences" on public.user_preferences;
create policy "Users can insert their preferences"
on public.user_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their preferences" on public.user_preferences;
create policy "Users can update their preferences"
on public.user_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
