-- Tracks sent push reminders so frequent cron runs do not duplicate alerts.
create table if not exists public.push_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shift_id text not null references public.shifts(id) on delete cascade,
  reminder_kind text not null check (reminder_kind in ('24h', '90m')),
  sent_at timestamptz not null default now(),
  unique (shift_id, reminder_kind)
);

create index if not exists idx_push_reminder_deliveries_user_id
  on public.push_reminder_deliveries(user_id);

create index if not exists idx_push_reminder_deliveries_shift_id
  on public.push_reminder_deliveries(shift_id);

alter table public.push_reminder_deliveries enable row level security;

drop policy if exists push_reminder_deliveries_select
  on public.push_reminder_deliveries;

create policy push_reminder_deliveries_select
  on public.push_reminder_deliveries
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
