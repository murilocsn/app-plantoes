# Arquitetura geral

Status: IMPLEMENTADA

O FinancPlantoes usa uma arquitetura em monorepo com npm workspaces. A aplicacao esta separada em frontend web/mobile, backend HTTP, pacote compartilhado de tipos/validacoes e scripts de banco/operacao.

## Componentes principais

| Camada | Caminho | Status | Descricao |
| --- | --- | --- | --- |
| Frontend | `apps/web` | IMPLEMENTADA | React + Vite, telas do produto e integracao com API/Supabase. |
| Backend | `apps/api` | IMPLEMENTADA | Express, autenticacao por Supabase Auth e rotas REST. |
| Compartilhado | `packages/shared` | IMPLEMENTADA | Schemas Zod e tipos TypeScript usados por web/API. |
| Banco | `database/migrations` | IMPLEMENTADA | Migrations SQL para Supabase/Postgres. |
| Edge Function | `supabase/functions/send-shift-reminders` | PARCIALMENTE IMPLEMENTADA | Envio de lembretes push de plantoes. |
| Mobile | `apps/web/android`, `apps/web/ios` | PARCIALMENTE IMPLEMENTADA | Projetos Capacitor para empacotar o frontend como app. |
| Legacy | `legacy`, `js/core` | LEGACY | Codigo antigo mantido como referencia. |

## Estilo arquitetural

- SPA React no cliente.
- API REST propria para operacoes de dominio.
- Supabase como Auth, Postgres e RLS.
- Validacao compartilhada com Zod.
- Deploy backend previsto em Render.
- Frontend estatico previsto para Vite/GitHub Pages ou hospedagem equivalente.

## Fronteiras

O frontend nao deve conter chaves privadas. O backend e a Edge Function concentram operacoes que exigem segredos de servidor. O banco aplica isolamento por usuario via RLS nas tabelas contempladas pelas migrations.
