# Funcionalidades

## Legenda

- IMPLEMENTADA: existe codigo funcional identificado.
- PARCIALMENTE IMPLEMENTADA: existe parte relevante, mas ha lacunas.
- PLANEJADA: aparece em docs/roadmap, sem implementacao suficiente.
- LEGACY: codigo historico fora do fluxo principal.
- NAO CONFIRMADA: nao foi possivel confirmar pelo estado atual do repositorio.

| Nome | Descricao | Ator | Status | Frontend | Backend | Tabelas/APIs |
|---|---|---|---|---|---|---|
| Login | Autenticacao via Supabase | Usuario | IMPLEMENTADA | `LoginPage`, `AuthContext` | `requireAuth` | Supabase Auth |
| Dashboard | Resumo mensal, calendario, recebiveis | Usuario | IMPLEMENTADA | `DashboardPage` | `/api/dashboard` | `shifts`, `receivables`, `locations` |
| Locais | Cadastro e edicao de locais | Usuario | IMPLEMENTADA | `LocationsPage` | `/api/locations` | `locations` |
| Plantoes | CRUD, recorrencia, cor, conflito | Usuario | IMPLEMENTADA | `ShiftsPage`, `ShiftForm` | `/api/shifts` | `shifts`, `recurrences` |
| Recebiveis | Criar, editar, pagar, excluir | Usuario | IMPLEMENTADA | `FinancePage` | `/api/receivables` | `receivables` |
| Despesas | Criar/listar pessoais e compartilhadas | Usuario | PARCIALMENTE IMPLEMENTADA | `ExpensesPage` | `/api/expenses` | `personal_expenses`, `expenses` |
| Espacos | Criar/listar/editar/remover espacos | Usuario | PARCIALMENTE IMPLEMENTADA | `SpacesPage` | `/api/spaces` | `spaces`, `space_members` |
| Relatorios | Exportacao CSV | Usuario | IMPLEMENTADA | `ReportsPage` | `/api/reports/export.csv` | `shifts`, `receivables`, `personal_expenses` |
| Push | Lembretes 24h e 90m | Usuario | PARCIALMENTE IMPLEMENTADA | `PushReminderButton` | Edge Function | `push_subscriptions`, `push_reminder_deliveries` |
| Mobile | APK/iOS por Capacitor | Usuario | PARCIALMENTE IMPLEMENTADA | Capacitor | API HTTPS | N/A |
