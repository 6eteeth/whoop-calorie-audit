-- ZCore admin portal and user profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;

create policy "Users can view their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can insert their own profile"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

-- Do not create browser policies for admin_users. It is server-only.

create or replace function public.handle_new_zcore_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, first_name, last_name)
  values (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name')
  on conflict (user_id) do update set
    first_name = coalesce(excluded.first_name, profiles.first_name),
    last_name = coalesce(excluded.last_name, profiles.last_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_zcore_profile on auth.users;
create trigger on_auth_user_created_zcore_profile
after insert or update of raw_user_meta_data on auth.users
for each row execute procedure public.handle_new_zcore_user();

-- Backfill profiles for existing users.
insert into public.profiles (user_id, first_name, last_name)
select id, raw_user_meta_data ->> 'first_name', raw_user_meta_data ->> 'last_name'
from auth.users
on conflict (user_id) do nothing;

-- IMPORTANT: replace the email below with the email address you use to sign into ZCore.
insert into public.admin_users (user_id)
select id from auth.users where lower(email) = lower('zsoard@gmail.com')
on conflict (user_id) do nothing;
