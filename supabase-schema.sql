-- ============================================================
-- FinancPlantões — schema do banco de dados (Supabase)
-- Multiusuário: cada conta (login) só enxerga os próprios dados.
--
-- Este script é seguro para rodar mais de uma vez (idempotente):
-- se você já rodou uma versão anterior, pode colar este arquivo
-- inteiro de novo e clicar em RUN sem medo de duplicar nada.
-- ============================================================

-- Tabela de locais de plantão (por usuário)
create table if not exists locations (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  value12 numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Tabela de plantões lançados (por usuário)
create table if not exists shifts (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  start_time time,
  location_id text references locations(id) on delete set null,
  location_name text not null,
  duration integer not null,
  value12 numeric not null default 0,
  value numeric not null default 0,
  professional text,
  notes text,
  recurring_group_id text,
  created_at timestamptz not null default now()
);

-- Tabela de configurações do usuário (meta financeira de ganho)
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
-- Segurança (RLS) — isolamento por usuário
-- Cada pessoa só pode ler, criar, editar e excluir os PRÓPRIOS
-- registros. auth.uid() é o id de quem está logado no momento
-- da requisição (definido pelo Supabase Auth).
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
create policy "locations_update" on locations for update using (auth.uid() = user_id);
create policy "locations_delete" on locations for delete using (auth.uid() = user_id);

drop policy if exists "shifts_select" on shifts;
drop policy if exists "shifts_insert" on shifts;
drop policy if exists "shifts_update" on shifts;
drop policy if exists "shifts_delete" on shifts;

create policy "shifts_select" on shifts for select using (auth.uid() = user_id);
create policy "shifts_insert" on shifts for insert with check (auth.uid() = user_id);
create policy "shifts_update" on shifts for update using (auth.uid() = user_id);
create policy "shifts_delete" on shifts for delete using (auth.uid() = user_id);

drop policy if exists "settings_select" on settings;
drop policy if exists "settings_insert" on settings;
drop policy if exists "settings_update" on settings;
drop policy if exists "settings_delete" on settings;

create policy "settings_select" on settings for select using (auth.uid() = user_id);
create policy "settings_insert" on settings for insert with check (auth.uid() = user_id);
create policy "settings_update" on settings for update using (auth.uid() = user_id);
create policy "settings_delete" on settings for delete using (auth.uid() = user_id);

-- ============================================================
-- Tempo real: permite que o app atualize a tela automaticamente
-- quando o próprio usuário lança/edita/exclui um plantão, local
-- ou meta em outro dispositivo. Envolvido em blocos que ignoram
-- o erro "já está na publicação" ao rodar o script de novo.
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

-- ============================================================
-- Opcional: exigir/dispensar confirmação por e-mail no cadastro
-- Por padrão o Supabase já exige confirmação de e-mail antes do
-- primeiro login. Para DESATIVAR isso (útil em testes internos):
-- Authentication → Providers → Email → desmarque
-- "Confirm email". Não é necessário rodar SQL para isso.
-- ============================================================
