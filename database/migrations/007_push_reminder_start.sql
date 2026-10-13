-- Allows the final push reminder at the scheduled shift start time.
alter table public.push_reminder_deliveries
  drop constraint if exists push_reminder_deliveries_reminder_kind_check;

alter table public.push_reminder_deliveries
  add constraint push_reminder_deliveries_reminder_kind_check
  check (reminder_kind in ('24h', '90m', 'start'));
