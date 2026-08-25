-- ============================================================
-- FinancPlantões — schema do banco de dados (Supabase)
-- Multiusuário: cada conta só enxerga e altera os próprios dados.
-- Este script é idempotente para a estrutura e as políticas.
-- ============================================================

create table if not exists locations (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  value12 numeric not null default 0,
  doc text,
  created_at timestamptz not null default now()
);

-- Compatibilidade com bancos criados antes da coluna doc existir.
alter table locations add column if not exists doc text;

create table if not exists shifts (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  start_time time,
  location_id text,
  location_name text not null,
  duration integer not null,
  value12 numeric not null default 0,
  value numeric not null default 0,
  professional text,
  notes text,
  recurring_group_id text,
  created_at timestamptz not null default now(),
  constraint shifts_location_owner_fk foreign key (location_id, user_id)
    references locations(id, user_id) on delete set null
);

create table if not exists settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_goal numeric not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_shifts_date on shifts(date);
create index if not exists idx_shifts_user on shifts(user_id);
create index if not exists idx_shifts_location on shifts(location_id);
create index if not exists idx_shifts_recurring on shifts(recurring_group_id);
create index if not exists idx_locations_user on locations(user_id);

-- ============================================================
-- RLS — isolamento por usuário
-- ============================================================

alter table locations enable row level security;
alter table shifts enable row level security;
alter table settings enable row level security;

drop policy if exists "locations_select" on locations;
drop policy if exists "locations_insert" on locations;
drop policy if exists "locations_update" on locations;
drop policy if exists "locations_delete" on locations;
create policy "locations_select" on locations for select using (auth.uid() = user_id);
create policy "locations_insert" on locations for insert with check (auth.uid() = user_id);
create policy "locations_update" on locations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "locations_delete" on locations for delete using (auth.uid() = user_id);

drop policy if exists "shifts_select" on shifts;
drop policy if exists "shifts_insert" on shifts;
drop policy if exists "shifts_update" on shifts;
drop policy if exists "shifts_delete" on shifts;
create policy "shifts_select" on shifts for select using (auth.uid() = user_id);
create policy "shifts_insert" on shifts for insert with check (auth.uid() = user_id);
create policy "shifts_update" on shifts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shifts_delete" on shifts for delete using (auth.uid() = user_id);

drop policy if exists "settings_select" on settings;
drop policy if exists "settings_insert" on settings;
drop policy if exists "settings_update" on settings;
drop policy if exists "settings_delete" on settings;
create policy "settings_select" on settings for select using (auth.uid() = user_id);
create policy "settings_insert" on settings for insert with check (auth.uid() = user_id);
create policy "settings_update" on settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "settings_delete" on settings for delete using (auth.uid() = user_id);

-- ============================================================
-- Realtime
-- ============================================================
do $$
begin
  alter publication supabase_realtime add table shifts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table locations;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table settings;
exception when duplicate_object then null;
end $$;

-- O Supabase Auth controla confirmação de e-mail em:
-- Authentication → Providers → Email → Confirm email.
