-- Permite registrar o aviso de inicio sem alterar entregas, RLS ou permissoes.
alter table public.push_reminder_deliveries
  drop constraint if exists push_reminder_deliveries_reminder_kind_check,
  add constraint push_reminder_deliveries_reminder_kind_check
    check (reminder_kind in ('24h', '90m', 'start'));
