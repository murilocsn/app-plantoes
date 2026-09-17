# API

Status: IMPLEMENTADA

A API fica em `apps/api` e usa Express. O arquivo principal de montagem e `apps/api/src/app.ts`.

## Base

- Rotas publicas: `/` e `/health`.
- Rotas protegidas: prefixo `/api`.
- Autenticacao: bearer token do Supabase.
- Respostas: JSON, exceto exportacao CSV.

## Modulos

| Modulo | Caminho | Status |
| --- | --- | --- |
| Dashboard | `routes/dashboard.ts` | IMPLEMENTADA |
| Locais | `routes/locations.ts` | IMPLEMENTADA |
| Plantoes | `routes/shifts.ts` | IMPLEMENTADA |
| Recebiveis | `routes/receivables.ts` | IMPLEMENTADA |
| Despesas | `routes/expenses.ts` | PARCIALMENTE IMPLEMENTADA |
| Espacos | `routes/spaces.ts` | PARCIALMENTE IMPLEMENTADA |
| Configuracoes | `routes/settings.ts` | IMPLEMENTADA |
| Relatorios | `routes/reports.ts` | IMPLEMENTADA |
