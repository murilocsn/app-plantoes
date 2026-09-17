# Componentes

Status: IMPLEMENTADA

## Frontend

| Componente | Caminho | Responsabilidade |
| --- | --- | --- |
| App e rotas | `apps/web/src/App.tsx` | Estrutura principal da interface autenticada. |
| Autenticacao | `apps/web/src/contexts/AuthContext.tsx` | Sessao do usuario e acesso ao Supabase Auth. |
| API client | `apps/web/src/lib/api.ts` | Comunicacao HTTP com backend. |
| Calendario | `apps/web/src/lib/calendar.ts`, `CalendarMonth.tsx` | Logica e exibicao de calendario. |
| Formularios | `apps/web/src/components/forms` | Criacao/edicao de dados de dominio. |

## Backend

| Componente | Caminho | Responsabilidade |
| --- | --- | --- |
| App Express | `apps/api/src/app.ts` | Middlewares, rotas publicas e montagem da API protegida. |
| Auth middleware | `apps/api/src/middleware/auth.ts` | Valida bearer token do Supabase. |
| Cliente DB | `apps/api/src/lib/db.ts` | Acesso Supabase e tratamento de erros. |
| Rotas | `apps/api/src/routes` | Endpoints de dashboard, plantoes, locais, financeiro e relatorios. |
| Regras | `apps/api/src/lib/shift-rules.ts` | Regras de recorrencia e previsao de pagamento. |

## Pacote compartilhado

`packages/shared` centraliza schemas e tipos para reduzir divergencia entre frontend e backend.
