# Regras de negocio

## RN-001 - Dados pertencem ao usuario autenticado

Rotas usam `user_id = request.auth.user.id`. Migrations usam RLS com `auth.uid()`.

## RN-002 - Local inativo nao permite novo plantao

`getLocation` em `routes/shifts.ts` retorna `LOCATION_INACTIVE`.

## RN-003 - Conflito de plantao e bloqueado

`shift-conflicts.ts` detecta sobreposicao de intervalos e `routes/shifts.ts` retorna `SHIFT_TIME_CONFLICT`.

## RN-004 - Recebivel pode ser gerado a partir do plantao

`createReceivable` em `shiftInputSchema` e `routes/shifts.ts` criam linhas em `receivables`.

## RN-005 - Data de pagamento segue regra do local

`expectedPaymentDate` em `shift-rules.ts` calcula vencimento com base em `reference_start_day`, `reference_end_day`, `payment_due_day` e `payment_due_months_after`.

## RN-006 - Cor de marcador deve ser hexadecimal

Schema `optionalMarkerColor` e constraint `shifts_marker_color_check` validam `#RRGGBB`.

## RN-007 - Recorrencia exige limite

`recurrenceDates` exige data final ou quantidade e limita pelo schema.
