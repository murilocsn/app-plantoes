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

-- 19:00 in Sao Paulo is 22:00 UTC.
select cron.schedule(
  'financplantoes-lembrete-diario',
  '0 22 * * *',
  $$
  select net.http_post(
    url := 'https://SEU_PROJECT_REF.supabase.co/functions/v1/send-shift-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', vault.get_secret('shift_reminders_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Check the schedule:
-- select * from cron.job where jobname = 'financplantoes-lembrete-diario';
-- Check executions:
-- select * from cron.job_run_details order by start_time desc limit 10;
