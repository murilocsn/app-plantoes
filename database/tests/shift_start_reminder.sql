-- Somente no cluster temporario local usado pelos testes de despesas.
-- Requer o auth minimo de expense_sharing_fixture.sql. Tudo e revertido.
\set ON_ERROR_STOP on
begin;

do $$
begin
  if position('/node_modules/.cache/financ-validation/expense-sharing-postgres/data'
    in replace(current_setting('data_directory'), chr(92), '/')) = 0 then
    raise exception 'Este teste exige o cluster temporario local, sem dados reais.';
  end if;
end $$;

create table public.shifts (id text primary key);
\ir ../migrations/005_push_reminder_deliveries.sql

create temp table reminder_security_before as
select relrowsecurity, relacl::text as permissions,
  (select string_agg(polname || ':' || pg_get_expr(polqual, polrelid), ',' order by polname)
   from pg_policy where polrelid = c.oid) as policies
from pg_class c where c.oid = 'public.push_reminder_deliveries'::regclass;

insert into auth.users (id, email, email_confirmed_at)
values ('00000000-0000-4000-8000-000000000099', 'reminder-test@example.test', now());
insert into public.shifts values ('reminder-test');
insert into public.push_reminder_deliveries (user_id, shift_id, reminder_kind)
select '00000000-0000-4000-8000-000000000099', 'reminder-test', kind
from unnest(array['24h', '90m']) as kind;

\ir ../migrations/20261018213821_shift_start_reminder.sql
\ir ../migrations/20261018213821_shift_start_reminder.sql

insert into public.push_reminder_deliveries (user_id, shift_id, reminder_kind)
values ('00000000-0000-4000-8000-000000000099', 'reminder-test', 'start');

do $$
begin
  if (select count(*) from public.push_reminder_deliveries) <> 3 then
    raise exception 'Entregas anteriores ou novo tipo de aviso nao preservados.';
  end if;
  begin
    insert into public.push_reminder_deliveries (user_id, shift_id, reminder_kind)
    values ('00000000-0000-4000-8000-000000000099', 'reminder-test', 'start');
    raise exception 'Aviso duplicado foi permitido.';
  exception when unique_violation then null;
  end;
  begin
    insert into public.push_reminder_deliveries (user_id, shift_id, reminder_kind)
    values ('00000000-0000-4000-8000-000000000099', 'reminder-test', 'invalid');
    raise exception 'Tipo invalido foi permitido.';
  exception when check_violation then null;
  end;
  if exists (
    select 1 from reminder_security_before b
    join pg_class c on c.oid = 'public.push_reminder_deliveries'::regclass
    where b.relrowsecurity is distinct from c.relrowsecurity
      or b.permissions is distinct from c.relacl::text
      or b.policies is distinct from (
        select string_agg(polname || ':' || pg_get_expr(polqual, polrelid), ',' order by polname)
        from pg_policy where polrelid = c.oid)
  ) then
    raise exception 'RLS, permissoes ou policies foram alteradas.';
  end if;
end $$;

rollback;
\echo 'PASS: inicio permitido, entregas preservadas, duplicacao bloqueada e RLS inalterada.'
