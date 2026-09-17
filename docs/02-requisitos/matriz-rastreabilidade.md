# Matriz de rastreabilidade

| Requisito | Funcionalidade | Componente | Arquivo | Teste |
|---|---|---|---|---|
| RF-001 | Login | Auth/Login | `AuthContext.tsx`, `LoginPage.tsx`, `auth.ts` | `e2e/auth.spec.ts` |
| RF-002 | Locais | Locais/API | `LocationsPage.tsx`, `routes/locations.ts` | `e2e/locations-api.smoke.mjs` |
| RF-003 | Plantoes | Plantao/API | `ShiftsPage.tsx`, `routes/shifts.ts` | `e2e/shift-dates.spec.ts`, `shift-conflicts.test.ts` |
| RF-004 | Recorrencia | Regras | `ShiftForm.tsx`, `shift-rules.ts` | `shift-rules.test.ts` |
| RF-005 | Recebiveis | Financeiro/API | `FinancePage.tsx`, `routes/receivables.ts` | Nao foi possivel confirmar teste dedicado. |
| RF-006 | Despesas | Despesas/API | `ExpensesPage.tsx`, `routes/expenses.ts` | Nao foi possivel confirmar teste dedicado. |
| RF-007 | Espacos | Espacos/API | `SpacesPage.tsx`, `routes/spaces.ts` | Nao foi possivel confirmar teste dedicado. |
| RF-008 | Relatorio | Reports/API | `ReportsPage.tsx`, `routes/reports.ts` | Nao foi possivel confirmar teste dedicado. |
| RF-009 | Push | Push/Edge | `PushReminderButton.tsx`, Edge Function | Nao foi possivel confirmar teste automatizado. |
