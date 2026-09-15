-- Execute manually in Supabase SQL Editor after deploying the Edge Function.
-- Required Supabase Vault secret:
--   shift_reminders_cron_secret
-- The Edge Function must have CRON_SECRET with the same value.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('financplantoes-lembrete-diario')
where exists (
  select 1 from cron.job where jobname = 'financplantoes-lembrete-diario'
);

-- Runs frequently enough to catch the 24h and 90min reminder windows.
select cron.schedule(
  'financplantoes-lembrete-diario',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://onqbnogccjfgihmmxrid.supabase.co/functions/v1/send-shift-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'shift_reminders_cron_secret'
        limit 1
      )
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Check the schedule:
-- select * from cron.job where jobname = 'financplantoes-lembrete-diario';
-- Check executions:
-- select * from cron.job_run_details order by start_time desc limit 10;
