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

No cadastro de plantão com recebível automático, o campo “Previsão de pagamento” exibe essa data e permite personalizá-la. O parâmetro opcional `shift.expected_payment_date` aceita uma data ISO válida; quando omitido ou vazio, a API calcula a previsão pela regra do local. A data é gravada em `receivables.expected_date`, sem alterar a unidade.

Em recorrências, uma data personalizada vale para todos os recebíveis criados naquele envio. Sem personalização, cada ocorrência tem a previsão calculada pela própria data. Sem recebível automático, nenhuma previsão é gravada.

Editar apenas valor, horário ou observações não recalcula a previsão salva. Ao mudar a data ou a unidade, somente recebíveis abertos cuja previsão ainda coincide com a regra anterior são recalculados. Datas diferentes da regra anterior são preservadas, assim como recebíveis recebidos ou cancelados. Como o banco registra a data, sem um indicador de origem, uma data escolhida manualmente que coincida com a regra anterior é tratada como herdada. A edição posterior da previsão continua disponível no faturamento.

## RN-006 - Cor de marcador deve ser hexadecimal

Schema `optionalMarkerColor` e constraint `shifts_marker_color_check` validam `#RRGGBB`.

## RN-007 - Recorrencia exige limite

`recurrenceDates` exige data final ou quantidade e limita pelo schema.
