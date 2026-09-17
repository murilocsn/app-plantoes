# Modelo de dados

Status: IMPLEMENTADA

O modelo de dados esta documentado principalmente nas migrations em `database/migrations`. O banco alvo e Supabase/Postgres.

## Entidades principais

| Entidade | Status | Finalidade |
| --- | --- | --- |
| `locations` | IMPLEMENTADA | Locais de plantao e dados de pagamento. |
| `shifts` | IMPLEMENTADA | Plantoes, valores, horarios, status e marcadores. |
| `settings` | IMPLEMENTADA | Preferencias do usuario. |
| `receivables` | IMPLEMENTADA | Valores a receber. |
| `personal_expenses` | IMPLEMENTADA | Despesas individuais. |
| `spaces` | PARCIALMENTE IMPLEMENTADA | Ambientes compartilhados. |
| `space_members` | PARCIALMENTE IMPLEMENTADA | Membros de espacos. |
| `expenses` | PARCIALMENTE IMPLEMENTADA | Despesas compartilhadas. |
| `expense_splits` | PARCIALMENTE IMPLEMENTADA | Rateio de despesas compartilhadas. |
| `push_subscriptions` | PARCIALMENTE IMPLEMENTADA | Assinaturas push. |
| `push_reminder_deliveries` | PARCIALMENTE IMPLEMENTADA | Historico de lembretes. |
| `recurrences` | IMPLEMENTADA | Configuracoes de recorrencia. |
| `payments` | IMPLEMENTADA | Pagamentos vinculados ao dominio financeiro. |

## Observacao

Esta documentacao descreve o que esta no codigo-fonte. A estrutura real em producao deve ser conferida no Supabase antes de auditoria ou comercializacao.
