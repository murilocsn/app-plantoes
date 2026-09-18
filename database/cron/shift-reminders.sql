-- FinancPlantoes - Cron tecnico dos lembretes de plantao.
--
-- Objetivo:
--   Executar a Edge Function send-shift-reminders a cada 5 minutos para
--   capturar as janelas de lembrete de 24h e 90min antes do plantao.
--
-- Pre-requisitos:
--   1. Edge Function publicada:
--        send-shift-reminders
--   2. Edge Function Secrets configurados:
--        SUPABASE_URL
--        SUPABASE_SERVICE_ROLE_KEY
--        VAPID_PUBLIC_KEY
--        VAPID_PRIVATE_KEY
--        VAPID_SUBJECT
--        CRON_SECRET
--        WEB_APP_URL
--        REMINDER_WINDOW_MINUTES
--   3. Supabase Vault secret criado:
--        shift_reminders_cron_secret
--      O valor precisa ser exatamente igual ao CRON_SECRET da Edge Function.
--
-- Observacao:
--   Este script e idempotente para o job financplantoes-lembrete-diario:
--   remove o agendamento antigo com o mesmo nome e cria novamente.

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

-- Verificacao do agendamento:
-- select jobid, jobname, schedule, active, command
-- from cron.job
-- where jobname = 'financplantoes-lembrete-diario';
--
-- Verificacao das execucoes:
-- select jobid, status, start_time, end_time, return_message
-- from cron.job_run_details
-- where jobid in (
--   select jobid
--   from cron.job
--   where jobname = 'financplantoes-lembrete-diario'
-- )
-- order by start_time desc
-- limit 10;
