# Lembretes push de plantao

Status: aviso de inicio preparado localmente; ativacao em producao pendente.

Este documento registra o fluxo operacional dos alertas de plantao no celular.

## Fluxo tecnico

1. O usuario ativa os lembretes no frontend.
2. O navegador registra o Service Worker `sw.js`.
3. O navegador cria uma assinatura Web Push usando `VITE_VAPID_PUBLIC_KEY`.
4. A assinatura e salva em `push_subscriptions`.
5. O cron proposto executa a Edge Function `send-shift-reminders` a cada minuto.
6. A Edge Function busca plantoes `scheduled` com `start_time` preenchido.
7. Se o plantao estiver na janela de 24h, 90min ou inicio, a funcao envia o push.
8. Entregas bem-sucedidas sao registradas em `push_reminder_deliveries`.

O aviso de inicio nunca e antecipado. Ele e elegivel a partir do horario do
plantao e por menos de `REMINDER_WINDOW_MINUTES` minutos depois, permitindo
recuperar uma execucao atrasada. A busca inclui o dia anterior ao passar da
meia-noite. Os avisos de 24h e 90min mantem as janelas e mensagens anteriores.

O cron nao e um alarme de precisao: com execucao por minuto, a tentativa de envio
normalmente acontece em ate um minuto apos o inicio. Rede, dispositivo e sistema
operacional podem atrasar a entrega; nao existe garantia de exibicao instantanea.

## Diagnostico e ativacao do aviso de inicio

Em 18/10/2026, a leitura de producao confirmou: a Edge Function publicada nao tem
regra de inicio; a constraint `push_reminder_deliveries_reminder_kind_check`
aceita apenas `24h`/`90m`; o cron esta ativo com `*/5 * * * *`.
Nenhuma dessas configuracoes de producao foi modificada por esta preparacao.

Ativar somente apos autorizacao, nesta ordem:

1. Aplicar `database/migrations/20261018213821_shift_start_reminder.sql`.
   Inclui `start` na validacao existente, sem apagar entregas ou mudar RLS/permissoes.
2. Publicar `send-shift-reminders`, incluindo `index.ts` e `reminders.ts`.
3. Aplicar `database/cron/shift-reminders.sql`, passando de cinco para um minuto.
   Isso aumenta de 12 para 60 invocacoes por hora; confirmar a capacidade do plano.
4. Publicar o frontend com a descricao atualizada dos tres avisos.
5. Validar o aviso no aparelho com um plantao de teste autorizado, conferindo a
   entrega `start` e a ausencia de repeticao nas execucoes seguintes.

Nao publicar a funcao antes da migration: a constraint antiga impediria o
registro do novo aviso apos o envio, causando falhas e possiveis repeticoes.

Testes locais: `npm.cmd run test -w @financplantoes/api` cobre a logica real da
Edge Function em `apps/api/src/lib/shift-reminders.test.ts`, sem enviar push.
Para o SQL, no cluster temporario descrito em `database/tests/README.md`:

```powershell
psql -h 127.0.0.1 -p 55426 -U expense_test_admin -d postgres -v ON_ERROR_STOP=1 -f database/tests/shift_start_reminder.sql
```

O teste SQL verifica preservacao das entregas de 24h/90m, novo tipo `start`,
unicidade, rejeicao de tipos invalidos e manutencao de RLS/permissoes; termina
com rollback. Nunca executar o fixture ou esse teste contra producao.

Validacao local em 18/10/2026: 134 testes da API passaram, incluindo 24 casos
novos de lembretes. O teste SQL passou no PostgreSQL 18 temporario. O handler
real foi executado em um ambiente isolado com transporte push e banco de teste
substituidos: os tres avisos foram selecionados, a segunda execucao nao repetiu
entregas, pedidos sem autenticacao foram recusados e a recuperacao na virada da
meia-noite passou. Nenhuma notificacao real foi enviada. A verificacao de
entrega em aparelho real continua pendente da ativacao autorizada.

Arquivos da correcao:

- `supabase/functions/send-shift-reminders/index.ts`
- `supabase/functions/send-shift-reminders/reminders.ts`
- `apps/api/src/lib/shift-reminders.test.ts`
- `database/migrations/20261018213821_shift_start_reminder.sql`
- `database/tests/shift_start_reminder.sql`
- `database/cron/shift-reminders.sql`
- `apps/web/src/components/PushReminderButton.tsx`
- `docs/11-operacao/lembretes-push.md`

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
* * * * *
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
