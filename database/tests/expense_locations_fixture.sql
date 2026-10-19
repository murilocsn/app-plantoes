-- TEST ONLY, empty disposable PostgreSQL cluster. Fails if auth already exists.
\ir expense_sharing_fixture.sql
create table public.personal_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  description text not null, amount numeric(12,2) not null check(amount>=0),
  expense_date date not null, category text, notes text, created_at timestamptz not null default now()
);
alter table public.personal_expenses enable row level security;
grant select,insert,update,delete on public.personal_expenses to authenticated;
create policy personal_expenses_select on public.personal_expenses for select using(auth.uid()=user_id);
create policy personal_expenses_insert on public.personal_expenses for insert with check(auth.uid()=user_id);
create policy personal_expenses_update on public.personal_expenses for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
