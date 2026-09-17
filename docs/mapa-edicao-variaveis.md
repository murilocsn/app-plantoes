# Mapa de edicao e variaveis do projeto

Este documento mostra onde alterar cada parte do FinancPlantoes e quais variaveis de ambiente controlam o comportamento do app. Ele deve ser usado antes de fazer mudancas em tela, API, banco, deploy ou integracoes.

> Nunca coloque valores reais de `.env` neste documento. Use apenas nomes das variaveis e exemplos neutros.

## Visao geral

```text
apps/web        Frontend React/Vite
apps/api        API Express/Node
packages/shared Schemas, tipos e validacoes compartilhadas
supabase        Configuracao local e Edge Functions
docs            Documentacao do projeto
```

## Variaveis de ambiente

Arquivo de referencia:

```text
.env.example
```

Arquivos locais privados:

```text
.env
apps/web/.env
apps/api/.env
```

Esses arquivos nao devem ser commitados nem documentados com valores reais.

### Frontend

| Variavel | Onde e usada | Para que serve | Onde editar em producao |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `apps/web/src/lib/supabase.ts` | URL publica do projeto Supabase usada no navegador | Variaveis do deploy do frontend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `apps/web/src/lib/supabase.ts` | Chave publica/publishable do Supabase para Auth no navegador | Variaveis do deploy do frontend |
| `VITE_API_BASE_URL` | `apps/web/src/lib/api.ts` | Base da API consumida pelo frontend. Em dev pode ser `/api`; em mobile precisa ser URL HTTPS absoluta | Variaveis do deploy do frontend ou build mobile |
| `VITE_VAPID_PUBLIC_KEY` | `apps/web/src/components/PushReminderButton.tsx` | Chave publica para notificacoes push | Variaveis do deploy do frontend |
| `API_TARGET` | `apps/web/vite.config.ts` | Destino do proxy local `/api` durante desenvolvimento | `.env` local |
| `WEB_PORT` | `apps/web/vite.config.ts` | Porta do Vite em desenvolvimento | `.env` local |

Observacoes:

- Variaveis com prefixo `VITE_` ficam disponiveis no navegador. Nao coloque segredo nelas.
- Para localhost, o frontend chama `/api` e o Vite encaminha para `API_TARGET` ou `http://localhost:3333`.
- Para APK/app mobile, `VITE_API_BASE_URL` deve apontar para uma API HTTPS real.

### API

| Variavel | Onde e usada | Para que serve | Onde editar em producao |
|---|---|---|---|
| `NODE_ENV` | `apps/api/src/config/env.ts`, `apps/api/src/app.ts` | Ambiente da API e formato de logs | Render/API hosting |
| `API_PORT` | `apps/api/src/config/env.ts`, `apps/api/src/server.ts` | Porta local da API quando `PORT` nao existe | `.env` local |
| `PORT` | `apps/api/src/server.ts` | Porta fornecida pela hospedagem, como Render | Render/API hosting |
| `SUPABASE_URL` | `apps/api/src/lib/supabase.ts` | URL do Supabase usada pela API | Render/API hosting |
| `SUPABASE_PUBLISHABLE_KEY` | `apps/api/src/lib/supabase.ts` | Chave usada pela API para validar usuario e consultar Supabase com token do usuario | Render/API hosting |
| `WEB_ORIGIN` | `apps/api/src/app.ts` | Origem permitida no CORS | Render/API hosting |

### Supabase Edge Functions e cron

| Variavel | Onde e usada | Para que serve | Onde editar |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions/rotinas administrativas | Chave privada para operacoes server-side privilegiadas | Supabase Secrets |
| `VAPID_PUBLIC_KEY` | Edge Function de lembretes | Par publico das notificacoes push | Supabase Secrets |
| `VAPID_PRIVATE_KEY` | Edge Function de lembretes | Chave privada das notificacoes push | Supabase Secrets |
| `VAPID_SUBJECT` | Edge Function de lembretes | Identificacao de contato do push, geralmente email | Supabase Secrets |
| `CRON_SECRET` | Chamadas agendadas/cron | Segredo para proteger execucoes automaticas | Supabase Secrets/Render cron |
| `WEB_APP_URL` | Lembretes/links gerados | URL publica do app web | Supabase Secrets |

Regra de seguranca: `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY` e `CRON_SECRET` nunca podem ir para frontend, docs, logs ou commits.

## Onde editar cada coisa

### Rotas e navegacao do frontend

| O que mudar | Arquivo |
|---|---|
| Rotas principais do app | `apps/web/src/App.tsx` |
| Menu lateral, botoes de navegacao, layout logado | `apps/web/src/components/AppLayout.tsx` |
| Logo/marca no app | `apps/web/src/components/Brand.tsx`, `apps/web/src/components/BrandMark.tsx`, `apps/web/public/logo.svg` |
| Entrada React | `apps/web/src/main.tsx` |
| HTML base, titulo, manifest e icone | `apps/web/index.html` |

### Telas

| Tela | Arquivo |
|---|---|
| Painel/Dashboard | `apps/web/src/pages/DashboardPage.tsx` |
| Plantoes | `apps/web/src/pages/ShiftsPage.tsx` |
| Locais | `apps/web/src/pages/LocationsPage.tsx` |
| Financeiro | `apps/web/src/pages/FinancePage.tsx` |
| Despesas | `apps/web/src/pages/ExpensesPage.tsx` |
| Espacos | `apps/web/src/pages/SpacesPage.tsx` |
| Relatorios | `apps/web/src/pages/ReportsPage.tsx` |
| Login | `apps/web/src/pages/LoginPage.tsx` |

### Formularios

| Formulario | Arquivo |
|---|---|
| Criar/editar plantao | `apps/web/src/components/forms/ShiftForm.tsx` |
| Criar/editar local | `apps/web/src/components/forms/LocationForm.tsx` |
| Criar/editar despesa | `apps/web/src/components/forms/ExpenseForm.tsx` |
| Criar/editar recebivel | `apps/web/src/components/forms/ReceivableForm.tsx` |
| Marcar recebivel como pago | `apps/web/src/components/forms/MarkPaidForm.tsx` |
| Criar/editar espaco | `apps/web/src/components/forms/SpaceForm.tsx` |

### Componentes visuais reutilizaveis

| Componente | Arquivo |
|---|---|
| Botoes | `apps/web/src/components/Button.tsx` |
| Modal | `apps/web/src/components/Modal.tsx` |
| Campo de formulario | `apps/web/src/components/Field.tsx` |
| Campo de data | `apps/web/src/components/DateField.tsx` |
| Estado vazio | `apps/web/src/components/EmptyState.tsx` |
| Indicadores/cards | `apps/web/src/components/StatCard.tsx` |
| Mensagens/toasts | `apps/web/src/components/ToastHost.tsx` |
| Feedback de pagina | `apps/web/src/components/PageFeedback.tsx` |
| Calendario mensal | `apps/web/src/components/CalendarMonth.tsx` |
| Modais de plantao | `apps/web/src/components/ShiftCrudModals.tsx` |
| Botao de lembretes push | `apps/web/src/components/PushReminderButton.tsx` |

### Estilos

| O que mudar | Arquivo |
|---|---|
| Tema, cores globais, componentes e layout desktop | `apps/web/src/styles.css` |
| Responsividade/mobile | `apps/web/src/responsive.css` |
| Paleta de cores do calendario/plantao | `apps/web/src/lib/calendar.ts` |
| Icone/logo | `apps/web/public/logo.svg` |
| Manifest/PWA | `apps/web/public/manifest.json` |

### Regras de calendario e formatacao

| Regra | Arquivo |
|---|---|
| Cores do calendario e marcadores | `apps/web/src/lib/calendar.ts` |
| Testes das cores/datas | `apps/web/src/lib/calendar.test.ts` |
| Formatacao de moeda, datas e textos | `apps/web/src/lib/formatters.ts` |
| Testes dos formatadores | `apps/web/src/lib/formatters.test.ts` |

### Comunicacao frontend/API

| O que mudar | Arquivo |
|---|---|
| Cliente HTTP, erro padrao e renovacao de sessao | `apps/web/src/lib/api.ts` |
| Funcoes de dominio usadas pelas telas | `apps/web/src/lib/domain-api.ts` |
| Cliente Supabase do navegador | `apps/web/src/lib/supabase.ts` |
| Contexto de autenticacao | `apps/web/src/contexts/AuthContext.tsx` |
| Carregamento inicial do app | `apps/web/src/hooks/useBootstrap.ts` |

## Backend/API

### Entrada e configuracao

| O que mudar | Arquivo |
|---|---|
| Criacao do Express, CORS, middlewares e rotas | `apps/api/src/app.ts` |
| Porta e inicializacao do servidor | `apps/api/src/server.ts` |
| Validacao das variaveis da API | `apps/api/src/config/env.ts` |
| Cliente Supabase server-side | `apps/api/src/lib/supabase.ts` |
| Autenticacao por bearer token | `apps/api/src/middleware/auth.ts` |
| Tratamento padrao de erros | `apps/api/src/middleware/error-handler.ts` |
| Padrao de resposta JSON | `apps/api/src/lib/respond.ts` |
| Erros HTTP | `apps/api/src/lib/http-error.ts` |
| Wrapper async para rotas | `apps/api/src/lib/async-handler.ts` |

### Rotas da API

| Area | Arquivo | Base URL |
|---|---|---|
| Dashboard | `apps/api/src/routes/dashboard.ts` | `/api/dashboard` |
| Locais | `apps/api/src/routes/locations.ts` | `/api/locations` |
| Plantoes | `apps/api/src/routes/shifts.ts` | `/api/shifts` |
| Recebiveis | `apps/api/src/routes/receivables.ts` | `/api/receivables` |
| Despesas | `apps/api/src/routes/expenses.ts` | `/api/expenses` |
| Espacos | `apps/api/src/routes/spaces.ts` | `/api/spaces` |
| Configuracoes | `apps/api/src/routes/settings.ts` | `/api/settings` |
| Relatorios | `apps/api/src/routes/reports.ts` | `/api/reports` |

Todas as rotas em `/api` passam por `requireAuth`, entao precisam de token Supabase no header `Authorization`.

### Regras de negocio da API

| Regra | Arquivo |
|---|---|
| Conflitos de plantao | `apps/api/src/lib/shift-conflicts.ts` |
| Testes de conflito | `apps/api/src/lib/shift-conflicts.test.ts` |
| Regras de plantao/recebimento | `apps/api/src/lib/shift-rules.ts` |
| Testes das regras | `apps/api/src/lib/shift-rules.test.ts` |
| Acesso ao banco e erros PostgREST | `apps/api/src/lib/db.ts` |
| Testes de banco/erros | `apps/api/src/lib/db.test.ts` |

## Schemas e tipos compartilhados

Pacote:

```text
packages/shared
```

| O que mudar | Arquivo |
|---|---|
| Schemas Zod de entrada e saida | `packages/shared/src/schemas.ts` |
| Tipos TypeScript compartilhados | `packages/shared/src/types.ts` |
| Exports publicos do pacote | `packages/shared/src/index.ts` |
| Testes de schema | `packages/shared/src/schemas.test.ts` |

Quando mudar uma regra de validacao de formulario ou API, geralmente o primeiro lugar correto e `packages/shared/src/schemas.ts`, porque frontend e backend usam os mesmos contratos.

## Banco de dados e Supabase

| O que mudar | Onde |
|---|---|
| Tabelas, colunas, indices, RLS e policies | Migrations SQL do projeto, quando existirem |
| Edge Function de lembretes | `supabase/functions/send-shift-reminders/index.ts` |
| Configuracao local Supabase | `supabase/config.toml` |
| Secrets da Edge Function | Supabase Dashboard ou CLI, nunca no repo |

Antes de mudar banco, confirmar:

1. se a mudanca e destrutiva;
2. se precisa migration;
3. se afeta RLS;
4. se precisa atualizar schemas em `packages/shared`;
5. se precisa atualizar rotas da API e telas.

## Deploy

### Frontend

O frontend e Vite. Scripts principais:

```text
npm run dev -w @financplantoes/web
npm run build -w @financplantoes/web
npm run test -w @financplantoes/web
npm run typecheck -w @financplantoes/web
```

### API

Scripts principais:

```text
npm run dev -w @financplantoes/api
npm run build -w @financplantoes/api
npm run test -w @financplantoes/api
npm run typecheck -w @financplantoes/api
```

### Monorepo

Scripts da raiz:

```text
npm run dev
npm run build
npm run test
npm run typecheck
```

## Checklist para alterar uma funcionalidade

1. Identificar a tela ou rota no mapa acima.
2. Verificar se existe schema em `packages/shared/src/schemas.ts`.
3. Verificar se a API precisa mudar em `apps/api/src/routes`.
4. Verificar se o frontend precisa mudar em `apps/web/src/pages` ou `apps/web/src/components`.
5. Se mexer em banco, revisar RLS e migrations antes.
6. Rodar typecheck e testes relacionados.
7. Atualizar este documento se criar nova tela, rota, variavel ou regra.

## Guia rapido: quero mudar X

| Quero mudar | Comece por |
|---|---|
| Texto ou layout do menu | `apps/web/src/components/AppLayout.tsx` |
| Visual geral do app | `apps/web/src/styles.css` |
| Responsivo/celular | `apps/web/src/responsive.css` |
| Cores dos marcadores | `apps/web/src/lib/calendar.ts` |
| Formulario de plantao | `apps/web/src/components/forms/ShiftForm.tsx` |
| Regras de validacao do plantao | `packages/shared/src/schemas.ts` |
| Salvamento/listagem de plantoes na API | `apps/api/src/routes/shifts.ts` |
| Calculo financeiro de plantao/recebivel | `apps/api/src/lib/shift-rules.ts` |
| Dashboard | `apps/web/src/pages/DashboardPage.tsx` e `apps/api/src/routes/dashboard.ts` |
| Login e sessao | `apps/web/src/contexts/AuthContext.tsx` e `apps/web/src/lib/supabase.ts` |
| Erro padrao da API | `apps/api/src/middleware/error-handler.ts` |
| URL da API no frontend | `VITE_API_BASE_URL` |
| Proxy local para API | `API_TARGET` |
| CORS da API | `WEB_ORIGIN` |
| Lembretes push no frontend | `apps/web/src/components/PushReminderButton.tsx` |
| Lembretes push no backend/Supabase | `supabase/functions/send-shift-reminders/index.ts` |
