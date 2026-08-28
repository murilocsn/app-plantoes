-- FinancPlantoes - modern React + Node API extensions
-- Complements the legacy schema with the entities used by the API.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.shifts
  add column if not exists status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled'));

alter table public.locations
  add column if not exists reference_start_day integer not null default 1,
  add column if not exists reference_end_day integer not null default 28,
  add column if not exists payment_due_day integer not null default 10,
  add column if not exists payment_due_months_after integer not null default 1;

alter table public.locations
  drop constraint if exists locations_payment_rules_check;

alter table public.locations
  add constraint locations_payment_rules_check check (
    reference_start_day between 1 and 31 and
    reference_end_day between 1 and 31 and
    payment_due_day between 1 and 31 and
    payment_due_months_after between 0 and 12
  );

create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  shift_id text references public.shifts(id) on delete set null,
  location_id text,
  description text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  expected_date date not null,
  received_date date,
  payment_method text,
  status text not null default 'pending'
    check (status in ('pending', 'received', 'overdue', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_receivables_user_id on public.receivables(user_id);
create index if not exists idx_receivables_shift_id on public.receivables(shift_id);
create index if not exists idx_receivables_status on public.receivables(user_id, status);
create index if not exists idx_receivables_expected on public.receivables(user_id, expected_date);

alter table public.receivables enable row level security;

drop policy if exists receivables_select on public.receivables;
drop policy if exists receivables_insert on public.receivables;
drop policy if exists receivables_update on public.receivables;
drop policy if exists receivables_delete on public.receivables;

create policy receivables_select on public.receivables
  for select using (auth.uid() = user_id);
create policy receivables_insert on public.receivables
  for insert with check (auth.uid() = user_id);
create policy receivables_update on public.receivables
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy receivables_delete on public.receivables
  for delete using (auth.uid() = user_id);

drop trigger if exists receivables_set_updated_at on public.receivables;
create trigger receivables_set_updated_at
before update on public.receivables
for each row execute function public.set_updated_at();

create table if not exists public.personal_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  expense_date date not null,
  category text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_personal_expenses_user_id on public.personal_expenses(user_id);
create index if not exists idx_personal_expenses_date on public.personal_expenses(user_id, expense_date);

alter table public.personal_expenses enable row level security;

drop policy if exists personal_expenses_select on public.personal_expenses;
drop policy if exists personal_expenses_insert on public.personal_expenses;
drop policy if exists personal_expenses_update on public.personal_expenses;
drop policy if exists personal_expenses_delete on public.personal_expenses;

create policy personal_expenses_select on public.personal_expenses
  for select using (auth.uid() = user_id);
create policy personal_expenses_insert on public.personal_expenses
  for insert with check (auth.uid() = user_id);
create policy personal_expenses_update on public.personal_expenses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy personal_expenses_delete on public.personal_expenses
  for delete using (auth.uid() = user_id);

drop trigger if exists personal_expenses_set_updated_at on public.personal_expenses;
create trigger personal_expenses_set_updated_at
before update on public.personal_expenses
for each row execute function public.set_updated_at();

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  space_type text not null default 'other'
    check (space_type in ('residence', 'clinic', 'trip', 'event', 'team', 'project', 'other')),
  description text,
  start_date date,
  end_date date,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spaces_valid_dates check (end_date is null or start_date is null or end_date >= start_date)
);

create index if not exists idx_spaces_owner_id on public.spaces(owner_id);

alter table public.spaces enable row level security;

create table if not exists public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active' check (status in ('pending', 'active', 'removed')),
  invited_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, user_id)
);

create index if not exists idx_space_members_space_id on public.space_members(space_id);
create index if not exists idx_space_members_user_id on public.space_members(user_id);

alter table public.space_members enable row level security;

drop policy if exists spaces_select on public.spaces;
drop policy if exists spaces_insert on public.spaces;
drop policy if exists spaces_update on public.spaces;
drop policy if exists spaces_delete on public.spaces;

create policy spaces_select on public.spaces
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = spaces.id
        and sm.user_id = auth.uid()
        and sm.status = 'active'
    )
  );
create policy spaces_insert on public.spaces
  for insert with check (owner_id = auth.uid());
create policy spaces_update on public.spaces
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy spaces_delete on public.spaces
  for delete using (owner_id = auth.uid());

drop policy if exists space_members_select on public.space_members;
drop policy if exists space_members_insert on public.space_members;
drop policy if exists space_members_update on public.space_members;
drop policy if exists space_members_delete on public.space_members;

create policy space_members_select on public.space_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.spaces s
      where s.id = space_members.space_id
        and s.owner_id = auth.uid()
    )
  );
create policy space_members_insert on public.space_members
  for insert with check (
    (user_id = auth.uid() and role = 'owner')
    or exists (
      select 1 from public.spaces s
      where s.id = space_members.space_id
        and s.owner_id = auth.uid()
    )
  );
create policy space_members_update on public.space_members
  for update using (
    exists (
      select 1 from public.spaces s
      where s.id = space_members.space_id
        and s.owner_id = auth.uid()
    )
  );
create policy space_members_delete on public.space_members
  for delete using (
    exists (
      select 1 from public.spaces s
      where s.id = space_members.space_id
        and s.owner_id = auth.uid()
    )
  );

drop trigger if exists spaces_set_updated_at on public.spaces;
create trigger spaces_set_updated_at
before update on public.spaces
for each row execute function public.set_updated_at();

drop trigger if exists space_members_set_updated_at on public.space_members;
create trigger space_members_set_updated_at
before update on public.space_members
for each row execute function public.set_updated_at();

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  paid_by uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  expense_date date not null,
  category text,
  split_method text not null default 'equal' check (split_method in ('equal', 'selected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_expenses_space_id on public.expenses(space_id);
create index if not exists idx_expenses_paid_by on public.expenses(paid_by);
create index if not exists idx_expenses_date on public.expenses(space_id, expense_date);

alter table public.expenses enable row level security;

drop policy if exists expenses_select on public.expenses;
drop policy if exists expenses_insert on public.expenses;
drop policy if exists expenses_update on public.expenses;
drop policy if exists expenses_delete on public.expenses;

create policy expenses_select on public.expenses
  for select using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = expenses.space_id
        and sm.user_id = auth.uid()
        and sm.status = 'active'
    )
  );
create policy expenses_insert on public.expenses
  for insert with check (
    paid_by = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = expenses.space_id
        and sm.user_id = auth.uid()
        and sm.status = 'active'
    )
  );
create policy expenses_update on public.expenses
  for update using (
    paid_by = auth.uid()
    or exists (
      select 1 from public.spaces s
      where s.id = expenses.space_id
        and s.owner_id = auth.uid()
    )
  );
create policy expenses_delete on public.expenses
  for delete using (
    paid_by = auth.uid()
    or exists (
      select 1 from public.spaces s
      where s.id = expenses.space_id
        and s.owner_id = auth.uid()
    )
  );

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'waived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expense_id, user_id)
);

create index if not exists idx_expense_splits_expense_id on public.expense_splits(expense_id);
create index if not exists idx_expense_splits_user_id on public.expense_splits(user_id);

alter table public.expense_splits enable row level security;

drop policy if exists expense_splits_select on public.expense_splits;
drop policy if exists expense_splits_insert on public.expense_splits;
drop policy if exists expense_splits_update on public.expense_splits;
drop policy if exists expense_splits_delete on public.expense_splits;

create policy expense_splits_select on public.expense_splits
  for select using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.expenses e
      join public.space_members sm on sm.space_id = e.space_id
      where e.id = expense_splits.expense_id
        and sm.user_id = auth.uid()
        and sm.status = 'active'
    )
  );
create policy expense_splits_insert on public.expense_splits
  for insert with check (
    exists (
      select 1
      from public.expenses e
      join public.space_members sm on sm.space_id = e.space_id
      where e.id = expense_splits.expense_id
        and sm.user_id = auth.uid()
        and sm.status = 'active'
    )
  );
create policy expense_splits_update on public.expense_splits
  for update using (user_id = auth.uid());
create policy expense_splits_delete on public.expense_splits
  for delete using (
    exists (
      select 1
      from public.expenses e
      join public.spaces s on s.id = e.space_id
      where e.id = expense_splits.expense_id
        and s.owner_id = auth.uid()
    )
  );

drop trigger if exists expense_splits_set_updated_at on public.expense_splits;
create trigger expense_splits_set_updated_at
before update on public.expense_splits
for each row execute function public.set_updated_at();
