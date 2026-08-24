-- ============================================================
-- FinancPlantões — Agendamento diário dos lembretes de plantão
-- Rode isto no SQL Editor DEPOIS de:
--  1) Ter feito o deploy da função "send-shift-reminders"
--  2) Ter configurado os Secrets VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
--     e VAPID_SUBJECT nas configurações da função
--  3) Ter desativado "Enforce JWT Verification" nessa função
--     (Edge Functions → send-shift-reminders → Settings)
-- ============================================================

-- Extensões necessárias para agendar e chamar a função via HTTP.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove um agendamento antigo com o mesmo nome, se existir (permite rodar de novo).
select cron.unschedule('financplantoes-lembrete-diario')
where exists (select 1 from cron.job where jobname = 'financplantoes-lembrete-diario');

-- Roda todo dia às 10:00 UTC = 07:00 no horário de São Paulo (UTC-3).
-- Para mudar o horário, troque apenas o "10" abaixo (hora em UTC).
select cron.schedule(
  'financplantoes-lembrete-diario',
  '0 10 * * *',
  $$
  select net.http_post(
    url := 'https://onqbnogccjfgihmmxrid.supabase.co/functions/v1/send-shift-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Para conferir se o agendamento foi criado:
-- select * from cron.job;

-- Para ver o histórico de execuções:
-- select * from cron.job_run_details order by start_time desc limit 10;
