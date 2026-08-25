-- FinancPlantões — foundation migration
-- Safe to review/apply separately from the current application.
-- This migration does not alter existing shifts/locations behavior.

create table if not exists public.recurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id text references public.locations(id) on delete set null,
  start_date date not null,
  end_date date,
  frequency text not null default 'weekly' check (frequency in ('daily','weekly','monthly')),
  interval_value integer not null default 1 check (interval_value > 0),
  start_time time not null,
  duration_hours numeric(6,2) not null check (duration_hours > 0),
  value numeric(12,2) not null default 0 check (value >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurrences_valid_dates check (end_date is null or end_date >= start_date)
);

create index if not exists idx_recurrences_user_id on public.recurrences(user_id);
create index if not exists idx_recurrences_location_id on public.recurrences(location_id);
create index if not exists idx_recurrences_active on public.recurrences(user_id, active);

alter table public.recurrences enable row level security;

drop policy if exists "Users can view own recurrences" on public.recurrences;
create policy "Users can view own recurrences"
  on public.recurrences for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own recurrences" on public.recurrences;
create policy "Users can insert own recurrences"
  on public.recurrences for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own recurrences" on public.recurrences;
create policy "Users can update own recurrences"
  on public.recurrences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own recurrences" on public.recurrences;
create policy "Users can delete own recurrences"
  on public.recurrences for delete
  using (auth.uid() = user_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shift_id text references public.shifts(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date,
  paid_date date,
  status text not null default 'pending' check (status in ('pending','paid','overdue','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_shift_id on public.payments(shift_id);
create index if not exists idx_payments_status on public.payments(user_id, status);
create index if not exists idx_payments_due_date on public.payments(user_id, due_date);

alter table public.payments enable row level security;

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own payments" on public.payments;
create policy "Users can insert own payments"
  on public.payments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own payments" on public.payments;
create policy "Users can update own payments"
  on public.payments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own payments" on public.payments;
create policy "Users can delete own payments"
  on public.payments for delete
  using (auth.uid() = user_id);

-- Keep updated_at consistent without requiring frontend code to remember it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recurrences_set_updated_at on public.recurrences;
create trigger recurrences_set_updated_at
before update on public.recurrences
for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();
