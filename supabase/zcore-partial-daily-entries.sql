-- ZCore partial daily-entry update.
-- Allows a day's record to be saved in stages: weight first, nutrition and WHOOP later.
-- Safe to run more than once.

alter table public.daily_entries alter column weight_lb drop not null;
alter table public.daily_entries alter column calories_eaten drop not null;
alter table public.daily_entries alter column whoop_calories_burned drop not null;

-- Macro fields may be entered gradually and may include decimal grams.
alter table public.daily_entries alter column protein_g type numeric using protein_g::numeric;

alter table public.daily_entries drop constraint if exists daily_entries_weight_lb_check;
alter table public.daily_entries add constraint daily_entries_weight_lb_check check (weight_lb is null or weight_lb > 0);

alter table public.daily_entries drop constraint if exists daily_entries_calories_eaten_check;
alter table public.daily_entries add constraint daily_entries_calories_eaten_check check (calories_eaten is null or calories_eaten >= 0);

alter table public.daily_entries drop constraint if exists daily_entries_whoop_calories_burned_check;
alter table public.daily_entries add constraint daily_entries_whoop_calories_burned_check check (whoop_calories_burned is null or whoop_calories_burned >= 0);

alter table public.daily_entries drop constraint if exists daily_entries_protein_g_check;
alter table public.daily_entries add constraint daily_entries_protein_g_check check (protein_g is null or protein_g >= 0);
