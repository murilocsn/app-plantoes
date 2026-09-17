# Fluxo de dados

Status: IMPLEMENTADA

## Fluxo autenticado

1. Usuario acessa o frontend em `apps/web`.
2. Login e sessao sao controlados pelo Supabase Auth.
3. O frontend envia requisicoes para a API com `Authorization: Bearer <token>`.
4. `apps/api/src/middleware/auth.ts` valida o token com Supabase.
5. As rotas usam o usuario autenticado para consultar/alterar dados.
6. O Supabase/Postgres aplica regras de seguranca conforme migrations e RLS.

## Fluxo de plantao

1. Usuario cria um plantao pela interface.
2. O formulario valida dados localmente.
3. A API valida novamente com schemas e regras de conflito.
4. O registro e salvo na tabela `shifts`.
5. Se aplicavel, a API gera recebivel relacionado em `receivables`.

## Fluxo de lembrete push

Status: PARCIALMENTE IMPLEMENTADA

1. Assinaturas push sao armazenadas em `push_subscriptions`.
2. A Edge Function `send-shift-reminders` busca plantoes proximos.
3. A funcao envia push usando VAPID.
4. Entregas sao registradas em `push_reminder_deliveries`.

## Pontos pendentes

- Confirmar configuracao real do cron em producao.
- Confirmar politicas RLS aplicadas no ambiente Supabase ativo.
- Confirmar monitoramento de falhas de envio push.
