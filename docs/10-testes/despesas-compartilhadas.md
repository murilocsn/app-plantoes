# Validação de despesas compartilhadas — 18/10/2026

Status: implementação local preparada. Migration não aplicada no Supabase de
produção. Não houve commit, push, deploy ou alteração de registros reais.

## Comportamento

- Espaços sai dos menus; o endereço antigo redireciona para Despesas.
- Despesas pessoais e registros compartilhados anteriores são preservados.
- Novas despesas compartilhadas têm card próprio, total, parte individual e
  participantes. O criador define o valor do convite, sem divisão automática.
- O popup exige e-mail, confirmação e valor. O convite é aceito ou recusado
  dentro do app; não há envio de e-mail externo.
- A lista é atualizada ao abrir Convites. O criador pode cancelar pendentes.
- Convites pendentes reservam valor, mas não entram nos gastos do destinatário.
  Depois do aceite, cada usuário vê apenas sua parte nos totais mensais e CSV.
- Sem a migration, o compartilhamento fica indisponível explicitamente, enquanto
  as despesas pessoais e os registros anteriores continuam acessíveis.

## Verificações executadas

| Comando/fluxo | Resultado |
| --- | --- |
| `npm.cmd run test` | 207 testes passaram: 110 API, 69 frontend, 28 compartilhados. |
| `npm.cmd run typecheck` | Passou nas três aplicações/pacotes. |
| `npm.cmd run lint` | Passou. |
| `npm.cmd run build` | API e frontend compilados. |
| Playwright: compartilhamento, layout de Despesas e desativação de Espaços | 15 cenários passaram em desktop, Chromium mobile e WebKit mobile. |
| PostgreSQL: `database/tests/expense_sharing.sql` | Migration aplicada no banco temporário; RLS, autorização, estados e valores passaram. |
| `node database/tests/expense_sharing_concurrency.mjs` | Reservas concorrentes e corrida aceitar/cancelar passaram. |
| Supabase CLI `db advisors` no banco temporário | Nenhum problema de segurança encontrado. |

Após os ajustes finais de foco dos popups, o frontend foi compilado novamente e
os fluxos de despesas foram repetidos nos três navegadores. O popup contém o
foco durante Tab/Shift+Tab, fecha com Escape e restaura o foco ao controle de
origem. Ações e fechamento ficam bloqueados durante o envio.

Os testes de navegador usam contas e respostas sintéticas. Os testes SQL usam
PostgreSQL 18 local, com roles anon/authenticated e uma estrutura mínima de Auth.
O Supabase de produção usa PostgreSQL 17; a migration não usa recursos exclusivos
da versão 18. A validação com contas reais e o advisor de produção ficam para
a ativação autorizada. As instruções locais estão em `database/tests/README.md`.

Falhas iniciais de testes foram investigadas: a expectativa do estado vazio
buscava um heading onde o componente existente usa strong; a correção foi no
seletor do teste. Ao retomar a sessão, os serviços locais estavam encerrados;
foram reiniciados antes de repetir os cenários. Não foram ocultadas falhas de
API, banco ou permissões com respostas de sucesso.

## Arquivos desta implementação

- `apps/api/src/lib/expense-sharing.ts`
- `apps/api/src/observability/http-attributes.ts`
- `apps/api/src/routes/dashboard.ts`
- `apps/api/src/routes/dashboard.test.ts`
- `apps/api/src/routes/expenses.ts`
- `apps/api/src/routes/expense-sharing.test.ts`
- `apps/api/src/routes/reports.ts`
- `apps/api/src/routes/reports.test.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/components/AppLayout.tsx`
- `apps/web/src/components/Modal.tsx`
- `apps/web/src/components/forms/ExpenseForm.tsx`
- `apps/web/src/components/forms/ExpenseInviteForm.tsx`
- `apps/web/src/lib/domain-api.ts`
- `apps/web/src/pages/ExpensesPage.tsx`
- `apps/web/src/responsive.css`
- `e2e/auth.spec.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/schemas.ts`
- `packages/shared/src/types.ts`
- `packages/shared/src/expense-sharing.ts`
- `packages/shared/src/expense-sharing.test.ts`
- `database/migrations/20261018170810_expense_sharing_cards.sql`
- `database/tests/README.md`
- `database/tests/expense_sharing.sql`
- `database/tests/expense_sharing_fixture.sql`
- `database/tests/expense_sharing_concurrency.mjs`
- `docs/05-api/proposta-despesas-compartilhadas.md`
- `docs/10-testes/despesas-compartilhadas.md`

As alterações anteriores de nomenclatura para Faturamento foram preservadas,
inclusive em `apps/web/src/pages/FinancePage.tsx`, que já estava modificado ao
iniciar esta tarefa. Nenhum arquivo de código foi removido; a tela antiga de
Espaços permanece no repositório, fora da navegação ativa.

`database/migrations/006_legal_acceptances.sql` apareceu no workspace durante
esta tarefa; não foi criado, alterado nem aplicado por esta implementação.

## Ativação pendente

Aplicar a migration somente após autorização explícita; depois publicar API e
frontend, nessa ordem. A migration cria apenas as novas tabelas e funções, sem
modificar tabelas, registros ou policies dos fluxos anteriores. Consultar
`docs/05-api/proposta-despesas-compartilhadas.md` para o fluxo completo.
