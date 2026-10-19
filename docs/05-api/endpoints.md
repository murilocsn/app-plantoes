# Endpoints

Status: IMPLEMENTADA

## Publicos

| Metodo | Rota | Descricao |
| --- | --- | --- |
| GET | `/` | Informacao basica da API. |
| GET | `/health` | Health check para hospedagem. |

## Protegidos

Todas as rotas abaixo exigem bearer token.

| Metodo | Rota | Status | Descricao |
| --- | --- | --- | --- |
| GET | `/api/dashboard/overview` | IMPLEMENTADA | Resumo do painel. |
| GET | `/api/dashboard/bootstrap` | IMPLEMENTADA | Dados iniciais do app. |
| GET | `/api/locations` | IMPLEMENTADA | Lista locais. |
| POST | `/api/locations` | IMPLEMENTADA | Cria local. |
| PATCH | `/api/locations/{id}` | IMPLEMENTADA | Atualiza local. |
| DELETE | `/api/locations/{id}` | IMPLEMENTADA | Inativa/remove local conforme regra. |
| GET | `/api/shifts` | IMPLEMENTADA | Lista plantoes. |
| POST | `/api/shifts` | IMPLEMENTADA | Cria plantao. |
| PATCH | `/api/shifts/{id}` | IMPLEMENTADA | Atualiza plantao. |
| DELETE | `/api/shifts/{id}` | IMPLEMENTADA | Remove plantao. |
| GET | `/api/receivables` | IMPLEMENTADA | Lista recebiveis. |
| POST | `/api/receivables` | IMPLEMENTADA | Cria recebivel. |
| PATCH | `/api/receivables/{id}` | IMPLEMENTADA | Atualiza recebivel. |
| DELETE | `/api/receivables/{id}` | IMPLEMENTADA | Remove recebivel. |
| POST | `/api/receivables/{id}/mark-paid` | IMPLEMENTADA | Marca como pago. |
| GET | `/api/expenses` | IMPLEMENTADA | Lista despesas. |
| GET | `/api/expenses/overview` | IMPLEMENTADA | Despesas pessoais, partes compartilhadas e locais acessíveis, sem carregar dados de outras páginas. |
| POST | `/api/expenses/personal` | IMPLEMENTADA | Cria despesa pessoal. |
| POST | `/api/expenses/locations` | IMPLEMENTADA | Cria card de local pessoal ou compartilhado. |
| PATCH | `/api/expenses/locations/{id}` | IMPLEMENTADA | Proprietário altera o nome do local. |
| POST | `/api/expenses/locations/{id}/expenses` | IMPLEMENTADA | Participante aceito registra despesa compartilhada no local, com divisão igual registrada no cadastro. |
| POST | `/api/expenses/locations/{id}/invitations` | IMPLEMENTADA | Proprietário convida usuário por e-mail para o local. |
| POST | `/api/expenses/invitations/{id}/respond` | IMPLEMENTADA | Destinatário aceita ou recusa convite de local ou despesa anterior. |
| POST | `/api/expenses/invitations/{id}/cancel` | IMPLEMENTADA | Proprietário cancela convite pendente. |
| POST | `/api/expenses/shared` | PARCIALMENTE IMPLEMENTADA | Cria despesa compartilhada. |
| GET | `/api/spaces` | PARCIALMENTE IMPLEMENTADA | Lista espacos. |
| POST | `/api/spaces` | PARCIALMENTE IMPLEMENTADA | Cria espaco. |
| PATCH | `/api/spaces/{id}` | PARCIALMENTE IMPLEMENTADA | Atualiza espaco. |
| DELETE | `/api/spaces/{id}` | PARCIALMENTE IMPLEMENTADA | Remove ou arquiva espaco. |
| GET | `/api/settings` | IMPLEMENTADA | Le configuracoes. |
| PUT | `/api/settings` | IMPLEMENTADA | Atualiza configuracoes. |
| GET | `/api/reports/export.csv` | IMPLEMENTADA | Exporta relatorio CSV. |

Os endpoints de locais de despesas dependem da migration local
`20261019021850_expense_location_cards.sql`. O cadastro pessoal aceita
`location_card_id` opcional, validado como local pessoal do mesmo proprietário.
As rotas de locais de plantão (`/api/locations`) mantêm o comportamento atual.
