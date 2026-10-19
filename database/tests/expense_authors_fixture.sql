-- TEST ONLY: run after expense_locations_fixture.sql in a disposable cluster.
-- Matches the profile columns used for display-name fallback.
\set ON_ERROR_STOP on
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text
);
alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
create policy profiles_read_own on public.profiles for select to authenticated
  using ((select auth.uid())=user_id);
