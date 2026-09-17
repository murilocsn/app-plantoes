# Relacionamentos

Status: IMPLEMENTADA

## Relacoes identificadas

| Origem | Destino | Status | Descricao |
| --- | --- | --- | --- |
| `shifts.location_id` | `locations.id` | IMPLEMENTADA | Plantao pertence a um local. |
| `receivables.shift_id` | `shifts.id` | IMPLEMENTADA | Recebivel pode nascer de plantao. |
| `expenses.space_id` | `spaces.id` | PARCIALMENTE IMPLEMENTADA | Despesa compartilhada pertence a espaco. |
| `space_members.space_id` | `spaces.id` | PARCIALMENTE IMPLEMENTADA | Membro participa de espaco. |
| `expense_splits.expense_id` | `expenses.id` | PARCIALMENTE IMPLEMENTADA | Rateio pertence a despesa. |
| `push_reminder_deliveries.shift_id` | `shifts.id` | PARCIALMENTE IMPLEMENTADA | Registro de lembrete por plantao. |

## Isolamento por usuario

A API usa o usuario autenticado como criterio de consulta. As migrations tambem definem RLS para tabelas modernas. Conferir o ambiente Supabase real antes de assumir conformidade em producao.
