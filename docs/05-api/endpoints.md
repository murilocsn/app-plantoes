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
| POST | `/api/expenses/personal` | IMPLEMENTADA | Cria despesa pessoal. |
| POST | `/api/expenses/shared` | PARCIALMENTE IMPLEMENTADA | Cria despesa compartilhada. |
| GET | `/api/spaces` | PARCIALMENTE IMPLEMENTADA | Lista espacos. |
| POST | `/api/spaces` | PARCIALMENTE IMPLEMENTADA | Cria espaco. |
| PATCH | `/api/spaces/{id}` | PARCIALMENTE IMPLEMENTADA | Atualiza espaco. |
| DELETE | `/api/spaces/{id}` | PARCIALMENTE IMPLEMENTADA | Remove ou arquiva espaco. |
| GET | `/api/settings` | IMPLEMENTADA | Le configuracoes. |
| PUT | `/api/settings` | IMPLEMENTADA | Atualiza configuracoes. |
| GET | `/api/reports/export.csv` | IMPLEMENTADA | Exporta relatorio CSV. |
