# Requisitos funcionais

## RF-001 - Autenticacao

- Descricao: permitir login e acesso autenticado com Supabase Auth.
- Ator: usuario.
- Arquivos: `apps/web/src/pages/LoginPage.tsx`, `apps/web/src/contexts/AuthContext.tsx`, `apps/api/src/middleware/auth.ts`.
- Criterios: usuario autenticado acessa o app; token ausente recebe 401.
- Status: IMPLEMENTADA.

## RF-002 - Gerenciar locais

- Descricao: listar, criar, editar e inativar locais de trabalho.
- Arquivos: `LocationsPage.tsx`, `LocationForm.tsx`, `routes/locations.ts`.
- Tabela: `locations`.
- Status: IMPLEMENTADA.

## RF-003 - Gerenciar plantoes

- Descricao: criar, listar, editar e excluir plantoes, com marcador visual e validacao de conflito.
- Arquivos: `ShiftsPage.tsx`, `ShiftForm.tsx`, `routes/shifts.ts`, `shift-conflicts.ts`.
- Tabelas: `shifts`, `receivables`, `recurrences`.
- Status: IMPLEMENTADA.

## RF-004 - Criar recorrencias

- Descricao: criar multiplas ocorrencias por frequencia, quantidade ou data final.
- Arquivos: `ShiftForm.tsx`, `shift-rules.ts`, `routes/shifts.ts`.
- Status: PARCIALMENTE IMPLEMENTADA.

## RF-005 - Gerenciar recebiveis

- Descricao: criar, listar, editar, excluir e marcar como recebido.
- Arquivos: `FinancePage.tsx`, `ReceivableForm.tsx`, `MarkPaidForm.tsx`, `routes/receivables.ts`.
- Status: IMPLEMENTADA.

## RF-006 - Registrar despesas

- Descricao: registrar despesas pessoais e compartilhadas.
- Arquivos: `ExpensesPage.tsx`, `ExpenseForm.tsx`, `routes/expenses.ts`.
- Status: PARCIALMENTE IMPLEMENTADA.

## RF-007 - Gerenciar espacos

- Descricao: criar, listar, editar e remover/arquivar espacos.
- Arquivos: `SpacesPage.tsx`, `SpaceForm.tsx`, `routes/spaces.ts`.
- Status: PARCIALMENTE IMPLEMENTADA.

## RF-008 - Exportar CSV

- Descricao: exportar plantoes, recebiveis e despesas em CSV.
- Arquivos: `ReportsPage.tsx`, `routes/reports.ts`.
- Status: IMPLEMENTADA.

## RF-009 - Lembretes push

- Descricao: registrar inscricao push e enviar lembretes 24h/90m.
- Arquivos: `PushReminderButton.tsx`, `public/sw.js`, `supabase/functions/send-shift-reminders/index.ts`.
- Status: PARCIALMENTE IMPLEMENTADA.

## RF-010 - Build mobile

- Descricao: empacotar frontend como app Android/iOS via Capacitor.
- Arquivos: `capacitor.config.ts`, `apps/web/android`, `apps/web/ios`.
- Status: PARCIALMENTE IMPLEMENTADA.
