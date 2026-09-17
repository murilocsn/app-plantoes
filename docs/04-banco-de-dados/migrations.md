# Migrations

Status: IMPLEMENTADA

As migrations ficam em `database/migrations`.

| Arquivo | Status | Conteudo principal |
| --- | --- | --- |
| `001_foundation.sql` | IMPLEMENTADA | Recorrencias, pagamentos, updated_at e RLS inicial. |
| `002_modern_app_extensions.sql` | IMPLEMENTADA | Status de plantoes, recebiveis, despesas, espacos e rateios. |
| `003_push_subscriptions.sql` | IMPLEMENTADA | Assinaturas Web Push. |
| `004_shift_markers.sql` | IMPLEMENTADA | Marcadores/cor dos plantoes. |
| `005_push_reminder_deliveries.sql` | IMPLEMENTADA | Historico de lembretes push. |

## Procedimento recomendado

1. Revisar migration em ambiente local ou staging.
2. Aplicar em Supabase de teste.
3. Validar API e RLS.
4. Fazer backup antes de aplicar em producao.
5. Registrar data, responsavel e resultado.

## Pendencia

Nao foi encontrado um runbook completo de migracao/rollback de banco. Isso deve ser formalizado antes de ambiente comercial.
