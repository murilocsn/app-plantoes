# Tabelas

Status: IMPLEMENTADA

## Resumo das tabelas

| Tabela | Migration | Status | Observacoes |
| --- | --- | --- | --- |
| `locations` | base do projeto e `002` | IMPLEMENTADA | Usada por plantoes e financeiro. |
| `shifts` | base do projeto, `002`, `004` | IMPLEMENTADA | Inclui status e marcadores visuais. |
| `settings` | base do projeto | IMPLEMENTADA | Configuracoes por usuario. |
| `recurrences` | `001` | IMPLEMENTADA | Regras de repeticao. |
| `payments` | `001` | IMPLEMENTADA | Pagamentos. |
| `receivables` | `002` | IMPLEMENTADA | Contas a receber. |
| `personal_expenses` | `002` | IMPLEMENTADA | Despesas pessoais. |
| `spaces` | `002` | PARCIALMENTE IMPLEMENTADA | Estrutura compartilhada. |
| `space_members` | `002` | PARCIALMENTE IMPLEMENTADA | Membros e papeis. |
| `expenses` | `002` | PARCIALMENTE IMPLEMENTADA | Despesas de espacos. |
| `expense_splits` | `002` | PARCIALMENTE IMPLEMENTADA | Rateios. |
| `push_subscriptions` | `003` | PARCIALMENTE IMPLEMENTADA | Web Push. |
| `push_reminder_deliveries` | `005` | PARCIALMENTE IMPLEMENTADA | Controle de envio. |

## Campos exatos

Os campos devem ser consultados nas migrations SQL correspondentes antes de qualquer alteracao estrutural.
