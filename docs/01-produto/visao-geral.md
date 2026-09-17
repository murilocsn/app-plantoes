# Visao geral do produto

FinancPlantoes e uma aplicacao para organizacao de plantoes, locais de trabalho, valores, pagamentos, despesas e rotina financeira de profissionais de saude.

A fonte desta documentacao e o codigo atual do repositorio. Funcionalidades nao confirmadas pelo codigo sao marcadas explicitamente.

## Arquitetura de produto

- Frontend web React/Vite.
- API Node/Express.
- Supabase para Auth e banco de dados.
- Edge Function para lembretes push.
- Projetos mobile Android/iOS via Capacitor.

## Funcionalidades principais

| Funcionalidade | Status | Evidencia |
|---|---|---|
| Login e sessao Supabase | IMPLEMENTADA | `LoginPage.tsx`, `AuthContext.tsx`, `middleware/auth.ts` |
| Dashboard mensal | IMPLEMENTADA | `DashboardPage.tsx`, `routes/dashboard.ts` |
| Locais de trabalho | IMPLEMENTADA | `LocationsPage.tsx`, `routes/locations.ts` |
| Plantoes | IMPLEMENTADA | `ShiftsPage.tsx`, `ShiftForm.tsx`, `routes/shifts.ts` |
| Recorrencia | PARCIALMENTE IMPLEMENTADA | `ShiftForm.tsx`, `shift-rules.ts`, `routes/shifts.ts` |
| Recebiveis | IMPLEMENTADA | `FinancePage.tsx`, `routes/receivables.ts` |
| Despesas pessoais | PARCIALMENTE IMPLEMENTADA | `ExpensesPage.tsx`, `routes/expenses.ts` |
| Espacos compartilhados | PARCIALMENTE IMPLEMENTADA | `SpacesPage.tsx`, `routes/spaces.ts` |
| Relatorio CSV | IMPLEMENTADA | `ReportsPage.tsx`, `routes/reports.ts` |
| Push reminders | PARCIALMENTE IMPLEMENTADA | `PushReminderButton.tsx`, Edge Function |
| App mobile | PARCIALMENTE IMPLEMENTADA | Capacitor Android/iOS |
| Codigo legacy | LEGACY | `legacy/*`, `js/core/*` |
