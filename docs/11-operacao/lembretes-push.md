# Lembretes push de plantao

Status: PARCIALMENTE IMPLEMENTADA

Este documento registra o fluxo operacional dos alertas de plantao no celular.

## Fluxo tecnico

1. O usuario ativa os lembretes no frontend.
2. O navegador registra o Service Worker `sw.js`.
3. O navegador cria uma assinatura Web Push usando `VITE_VAPID_PUBLIC_KEY`.
4. A assinatura e salva em `push_subscriptions`.
5. O cron do Supabase executa a Edge Function `send-shift-reminders` a cada 5 minutos.
6. A Edge Function busca plantoes `scheduled` com `start_time` preenchido.
7. Se o plantao estiver na janela de 24h ou 90min, a funcao envia o push.
8. Entregas bem-sucedidas sao registradas em `push_reminder_deliveries`.

## Secrets necessarios

### Frontend

| Variavel | Local | Observacao |
| --- | --- | --- |
| `VITE_VAPID_PUBLIC_KEY` | Deploy do frontend | Mesmo valor de `VAPID_PUBLIC_KEY`. |

### Edge Function

| Secret | Local | Observacao |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase Edge Function Secrets | Default secret do projeto. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function Secrets | Default secret usado pela funcao atual. |
| `VAPID_PUBLIC_KEY` | Supabase Edge Function Secrets | Par publico VAPID. |
| `VAPID_PRIVATE_KEY` | Supabase Edge Function Secrets | Chave privada VAPID. |
| `VAPID_SUBJECT` | Supabase Edge Function Secrets | Identificacao do emissor, geralmente `mailto:`. |
| `CRON_SECRET` | Supabase Edge Function Secrets | Segredo exigido no header `x-cron-secret`. |
| `WEB_APP_URL` | Supabase Edge Function Secrets | URL aberta ao tocar na notificacao. |
| `REMINDER_WINDOW_MINUTES` | Supabase Edge Function Secrets | Janela de busca, recomendado `10`. |

### Vault

| Secret | Local | Observacao |
| --- | --- | --- |
| `shift_reminders_cron_secret` | Supabase Vault | Precisa ter o mesmo valor de `CRON_SECRET`. |

## Cron correto

O script versionado fica em:

```text
database/cron/shift-reminders.sql
```

O cron esperado e:

```text
*/5 * * * *
```

O comando do job precisa conter:

```text
x-cron-secret
```

## Consultas de validacao

Conferir agendamento:

```sql
select jobid, jobname, schedule, active, command
from cron.job
where jobname = 'financplantoes-lembrete-diario';
```

Conferir execucoes:

```sql
select jobid, status, start_time, end_time, return_message
from cron.job_run_details
where jobid in (
  select jobid
  from cron.job
  where jobname = 'financplantoes-lembrete-diario'
)
order by start_time desc
limit 10;
```

Conferir base minima:

```sql
select 'push_subscriptions' as item, count(*)::int as total
from public.push_subscriptions
union all
select 'push_reminder_deliveries' as item, count(*)::int as total
from public.push_reminder_deliveries
union all
select 'scheduled_shifts_with_time' as item, count(*)::int as total
from public.shifts
where status = 'scheduled'
  and start_time is not null;
```

## Teste no celular

1. Publicar o frontend com `VITE_VAPID_PUBLIC_KEY`.
2. Abrir o app pela URL HTTPS no celular.
3. No iPhone/iPad, se estiver no Safari, tocar em `Compartilhar` e depois `Adicionar a Tela de Inicio`.
4. Abrir o app pelo icone instalado na Tela de Inicio.
5. Desativar lembretes, caso ja estejam ativos.
6. Ativar lembretes novamente.
7. Aceitar a permissao do navegador.
8. Clicar em `Enviar teste`.
9. Criar um plantao para daqui a aproximadamente 95 minutos.
10. Aguardar o cron entrar na janela de 90 minutos.

## Suporte por navegador

| Ambiente | Status | Observacao |
| --- | --- | --- |
| Chrome/Edge Android | SUPORTADO | Exige HTTPS, permissao de notificacao e VAPID configurado. |
| Safari iPhone/iPad aberto direto | LIMITADO | O Safari pode nao expor Push API fora do app instalado. |
| PWA iPhone/iPad na Tela de Inicio | SUPORTADO COM RESTRICOES | Instalar via `Compartilhar > Adicionar a Tela de Inicio` e ativar pelo app instalado. |
| Safari desktop | SUPORTADO COM RESTRICOES | Exige permissao do site e HTTPS. |

## Causas comuns de falha

| Sintoma | Causa provavel | Correcao |
| --- | --- | --- |
| Botao informa VAPID ausente | `VITE_VAPID_PUBLIC_KEY` nao foi publicado | Configurar variavel e rebuildar frontend. |
| iPhone mostra navegador sem suporte | Site aberto direto no Safari | Instalar na Tela de Inicio e abrir pelo icone do app. |
| Cron executa mas nao envia | `x-cron-secret` ausente ou errado | Rodar `database/cron/shift-reminders.sql` e conferir Vault. |
| Funcao retorna 401 | `shift_reminders_cron_secret` diferente de `CRON_SECRET` | Igualar os valores. |
| Nao encontra candidatos | Plantao fora da janela, sem horario ou status diferente | Usar `scheduled` e `start_time` preenchido. |
| Teste local funciona, real nao | Cron/Edge Function/Secrets incompletos | Validar secrets, cron e job_run_details. |
