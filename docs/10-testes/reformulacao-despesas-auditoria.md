# Reformulação de despesas e auditoria de desempenho

## Resultado funcional

- Cadastro único com escolha inicial entre despesa pessoal e compartilhada.
- Um formulário reaproveitado para descrição, valor, data, categoria, observações e local.
- Local pessoal opcional; local compartilhado obrigatório, selecionado entre os cards acessíveis.
- Criação de local durante o cadastro sem perder o rascunho; foco de teclado restaurado.
- Resumo pessoal, compartilhado e geral por período; filtros de período, tipo, categoria e local.
- Lista com carregamento visual de 20 registros por vez, preservando os totais de todo o período.
- Cards abaixo da lista, com total do local, parte do usuário, participantes, detalhes e edição do nome.
- Convites por e-mail, aceite, recusa e cancelamento pelo proprietário. Participantes aceitos podem cadastrar despesas compartilhadas.
- Despesas e convites anteriores permanecem na lista, com o fluxo original de valores individuais.
- Sem a migration nova, despesas pessoais sem local e o histórico continuam disponíveis.

## Modelo e autorização

Nenhuma tabela nova foi criada. `shared_expense_cards` passa a representar tanto
os cards anteriores de despesa quanto os containers de local (`card_kind`).
As despesas compartilhadas novas usam `location_card_id` para apontar ao container.
`personal_expenses` ganha o vínculo opcional com um local pessoal do mesmo dono.
`shared_expense_invitations` continua armazenando convites: nos locais, o valor é
zero e representa participação, sem criar um gasto artificial.

`locations` permanece dedicado aos locais de plantão e suas regras de pagamento;
`spaces` conserva suas regras legadas. Não houve mudança em LGPD, autenticação,
configurações de produção ou migrations anteriores.

A divisão de cada despesa compartilhada é registrada em `expense_split` entre
os participantes aceitos naquele instante. O proprietário recebe o eventual
centavo restante. Novos aceites liberam a leitura do local e dos gastos, mas não
transferem despesas anteriores ao novo participante. A divisão das próximas
despesas passa a incluir esse participante.

O backend valida schemas e utiliza o JWT do solicitante. As RPCs validam
`auth.uid()` e permissões; as funções privilegiadas ficam no schema privado com
`search_path` vazio. RLS permite leitura do local e dos filhos apenas ao dono e
aos convidados aceitos. A escrita direta nos cards continua bloqueada. Triggers
impedem vincular despesas pessoais a locais alheios e utilizar a RPC antiga de
convite para uma despesa filha ou um local. Os locks usados em aceite e cadastro
serializam mudanças de participantes e o registro das divisões.

As verificações seguem a [documentação de RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).
Os testes usam PostgreSQL 18 temporário com papéis `anon` e `authenticated` e
usuários fictícios, sem acesso ao banco do aplicativo.

## Auditoria: evidências e prioridades

| Prioridade | Evidência observada | Ação |
| --- | --- | --- |
| Alta | Despesas usava `/dashboard/bootstrap`, com 7 chamadas ao Supabase e dados de plantões, locais de trabalho e recebimentos | Novo `/expenses/overview`, com 2 consultas de despesas e 1 RPC em paralelo, sem dados de outras páginas; verificado por teste da API |
| Alta | `render.yaml` declara `plan: free` | Possível causa de demora após inatividade. Confirmar o plano realmente ativo e medir solicitações frias/quentes antes de decidir mudanças de hospedagem |
| Média | Bootstrap e despesas carregam históricos completos; a lista anterior renderizava todos os registros de uma vez | Renderização progressiva em despesas; paginação no servidor e agregação por período ficam recomendadas para uma fase separada |
| Média | Bundle principal com aproximadamente 449 kB sem compressão | Lazy loading de páginas já existia e foi preservado; nenhum ganho de download inicial é atribuído a esta alteração |
| Média | Novas consultas por vínculo de local e período | Índices parciais para `shared_expense_cards(location_card_id, expense_date)` e `personal_expenses(user_id, location_card_id, expense_date)` na migration local |
| Baixa | Respostas de despesas não tinham tempo agregado próprio no cabeçalho | Adicionado `Server-Timing: expenses;dur=...`; métricas usam somente templates de rota, sem IDs ou e-mails |
| Baixa | Página misturava cards, participantes e caixa de convites | Componentes específicos extraídos, reaproveitando botões, modal, campos e feedback existentes |

A documentação do Render confirma a suspensão de instâncias gratuitas após
15 minutos sem tráfego. Isso é uma hipótese para a implantação, não uma medição
da produção: [Render — Deploy for Free](https://render.com/docs/free).

O cache existente do TanStack Query mantém `staleTime` de 30 segundos, não
refaz consultas ao focar a janela e limpa dados nas trocas de sessão. Esses
mecanismos foram preservados. A nova chave `expenses` participa da invalidação
após mutações. As chamadas independentes permanecem em `Promise.all`.

Não foram adicionadas dependências ao aplicativo, mecanismos duplicados de lazy
loading ou memoizações indiscriminadas. O formulário de despesas fica em um
chunk carregado ao abrir o cadastro. As imagens públicas somam cerca de 45 kB;
não foi identificado benefício que justificasse reprocessá-las. Não há fonte
externa no HTML inicial. Compressão HTTP depende da hospedagem e não foi alterada.

## Métricas comparativas

As medidas de build usam bytes reais dos arquivos locais. O total inclui os
45.055 bytes de recursos públicos, idênticos antes/depois. Tempos de execução dos
testes e do build não representam velocidade de carregamento do aplicativo.

| Medida | Antes (bytes) | Depois (bytes) |
| --- | ---: | ---: |
| Build completo | 853607 | 866576 |
| JavaScript/CSS/HTML gerados | 808552 | 821521 |
| Bundle principal JavaScript | 449416 | 449422 |
| Página de despesas | 13197 | 21117 |
| CSS | 71999 | 73769 |
| Chamadas de dados ao Supabase por acesso a despesas (sem autenticação) | 7 | 3 |
| Requisições HTTP do frontend para carregar despesas | 1 | 1 |


O aumento do tamanho da página corresponde aos novos controles, cards e fluxos.
Não houve redução mensurável do bundle principal. O ganho comprovado é remover
dados de outras páginas e reduzir 7 chamadas ao Supabase para 3 no acesso a
despesas. Isso não equivale a uma medição de latência em produção.

| Indicador solicitado | Situação |
| --- | --- |
| Carregamento inicial real antes/depois | Não medido com dados e rede de produção |
| Dashboard após autenticação | Não medido em sessão real; o fluxo existente não foi alterado |
| Navegação para despesas | Coberta nos navegadores com API simulada; tempos não extrapolados para produção |
| Resposta dos principais endpoints | Testes locais de contrato; `Server-Timing` disponível para medição autenticada real |
| Requisições após login | Código do dashboard faz overview + recebimentos; despesas passa a ter consulta própria. Não há medição de uma sessão real |
| Lighthouse | Não executado; sem pontuação estimada ou inventada |
| Índices/consultas de produção | Migrations analisadas e testes locais; sem `EXPLAIN ANALYZE` sobre dados reais |

Para fechar essas métricas, capturar uma sessão autenticada representativa, HAR,
Lighthouse móvel/desktop e `Server-Timing`, comparando rede e backend frio/quente.
Analisar planos de execução antes de propor mais índices, cache ou mudanças de plano.

## Validação

| Verificação | Comando / procedimento | Resultado |
| --- | --- | --- |
| Unitários e API | `npm.cmd test` | 248 aprovados: API 148, web 69, shared 31 |
| Navegadores | `npm.cmd exec -- playwright test e2e/expenses.spec.ts --output=node_modules/.cache/expense-reform/e2e-final-checked --workers=1` | 36 aprovados: desktop, Chromium móvel e Safari móvel |
| Tipos do aplicativo | `npm.cmd run typecheck` | Aprovado em todos os workspaces |
| Tipos dos testes de navegador | `npm.cmd exec -- tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck e2e/expenses.spec.ts` | Aprovado |
| Lint | `npm.cmd run lint` | Aprovado |
| Build de produção | `npm.cmd run build` | API e web aprovados |
| Migration e RLS reais | Fixture isolado, migration anterior, suíte anterior, migration nova, suíte anterior novamente e `expense_locations.sql` | Aprovado, incluindo execução final desde banco vazio |
| Concorrência | `node database/tests/expense_locations_concurrency.mjs` | Aprovado: duplicidade com SQLSTATE 23505 e corrida aceite/cadastro |
| Advisors | `supabase db advisors` com URL exclusiva de loopback do cluster temporário | Sem alertas de segurança; três avisos de desempenho preexistentes, descritos abaixo |
| Revisão de diff | `git diff --check` | Aprovado |

O PowerShell exige `npm.cmd` neste ambiente. O build inicial com isolamento
restrito encontrou bloqueio de leitura na carga do config do Vite; a referência
foi gerada com `vite build --configLoader runner`. O build final padrão completo
foi executado com a permissão local necessária e passou. Não foram alteradas
configurações do projeto para contornar essas restrições. O PostgreSQL temporário
foi encerrado após a validação.

O verificador de segurança do Supabase não encontrou problemas no banco
temporário. A auditoria de desempenho encontrou três avisos `auth_rls_initplan`
nas policies pessoais anteriores (os mesmos predicados de `002_modern_app_extensions.sql`).
Essas policies não foram alteradas. O aviso de múltiplas policies permissivas
introduzido durante a implementação foi resolvido combinando a nova condição
com a policy de leitura existente; as suítes de isolamento e regressão passaram
novamente após o ajuste.

A matriz de 320, 390, 768 e 1280 pixels é exercitada pelo projeto desktop.
Chromium móvel e Safari móvel também validam o viewport nativo de iPhone,
incluindo os modais. Capturas de 390 e 1280 pixels foram inspecionadas.
Os testes aguardam a página estar pronta após navegação/reload; não usam cliques
forçados para contornar problemas de interação.

O navegador usa autenticação e respostas de API simuladas: não lê nem grava
despesas reais. Os testes da API verificam JWT, validação, propriedade e contratos
das RPCs. Os testes SQL verificam permissões reais no PostgreSQL, incluindo
tentativas por acesso direto, antes e depois da aceitação. São verificações
complementares; nessa auditoria inicial não foi usado um projeto Supabase remoto
para integração.

## Publicação

A migration local `database/migrations/20261019021850_expense_location_cards.sql`
depende das extensões existentes e de `20261018170810_expense_sharing_cards.sql`.
Na implementação inicial, as migrations permaneceram locais. Em 19/10/2026,
após autorização explícita do usuário, as duas foram aplicadas no Supabase do
projeto `plantoes-app`, na ordem abaixo. O MCP atribuiu os identificadores de
aplicação remota; os arquivos locais foram preservados.

| Arquivo local | Versão registrada no Supabase |
| --- | --- |
| `20261018170810_expense_sharing_cards.sql` | `20261019140224` |
| `20261019021850_expense_location_cards.sql` | `20261019140232` |

A consulta autenticada `expense_sharing_snapshot()` retornou os quatro arrays
esperados, incluindo `locations`. As dez RPCs públicas permitem execução por
`authenticated` e bloqueiam `anon`. As duas tabelas novas têm RLS ativo e
bloqueiam escrita direta pelo cliente. A Data API reconheceu a RPC de consulta
e negou acesso anônimo com `42501`, confirmando a atualização do schema cache.
Os dois registros pessoais existentes foram preservados, e o verificador de
segurança manteve os mesmos alertas anteriores, sem novos apontamentos.

Na verificação desta aplicação, os testes de compartilhamento da API (37) e do
pacote compartilhado (6) passaram. O fluxo com duas contas no navegador continua
coberto por simulação; a verificação remota autenticada foi somente de leitura.
API e frontend não foram republicados nesta aplicação das migrations.

## Recuperação da disponibilidade dos locais

A página de despesas agora reconsulta a API ao abrir e ao voltar para a janela.
Quando a API ainda informa indisponibilidade, a página e o modal oferecem
`Verificar disponibilidade`. Uma resposta atualizada libera os botões de local e
compartilhamento mesmo quando nenhum local foi criado. Falhas na atualização
exibem o erro e preservam a lista e o rascunho aberto para uma nova tentativa.

Os testes de navegador incluem a transição de indisponível para disponível, o
cadastro do primeiro local, a atualização ao voltar à janela e a preservação do
rascunho após erro. Typecheck, lint dos arquivos envolvidos e build web passaram.

A verificação do endereço público em 19/10/2026 identificou o frontend anterior,
publicado a partir de `089611f952f35dc64767ba70a5cba22d9eb1115e`, sem as rotas de
locais. A publicação coordenada da API e do frontend é necessária para levar o
fluxo implementado ao GitHub Pages e ao Render.

## Lista de gastos e autoria

Os detalhes de um local exibem uma lista semântica com todos os seus gastos no
período selecionado. Cada linha mostra descrição, data, categoria, observações,
valor total e nome de quem cadastrou; nos locais compartilhados, também mostra a
parte individual. Gastos sem participação financeira do usuário continuam na
lista. O resumo separa o total do local da parte individual.

A migration `20261019180927_expense_authors.sql`, criada pelo Supabase CLI,
acrescenta `shared_expense_cards.created_by` com chave estrangeira e índice.
O default `auth.uid()` é configurado depois da criação da coluna, preservando
autoria desconhecida nos registros existentes. As RPCs atuais registram assim
o solicitante autenticado, mesmo quando ele é convidado e o local tem outro dono.
Valores, divisões e RLS permanecem preservados. A consulta retorna somente o
nome de exibição, com fallback para `profiles.display_name`.

Os gastos antigos vinculados a locais, sem autor registrado, mostram
`Autor não registrado`. Para cards antigos avulsos, o proprietário original
é o autor conhecido. Nos locais pessoais, o proprietário é o autor.

Após autorização explícita, a migration foi aplicada ao projeto `plantoes-app`
em 19/10/2026, com versão remota `20261019181141`. A consulta autenticada retornou
o campo de autoria, e a comparação anterior/posterior confirmou preservação da
quantidade de registros e dos valores. Não houve novos alertas no verificador de
segurança remoto. A auditoria de segurança do PostgreSQL temporário não apontou
problemas.

A validação local passou em 18 cenários de navegador, cobrindo desktop,
Chromium móvel e Safari móvel, além de typecheck, lint dos arquivos envolvidos
e build web. As suítes SQL anteriores passaram antes e depois da migration;
`expense_authors.sql` validou autoria, histórico e permissões com dados fictícios.
Os arquivos novos desta etapa são a migration e os testes
`database/tests/expense_authors.sql` e `database/tests/expense_authors_fixture.sql`.

## Arquivos alterados e criados

Modificados:

- `apps/api/src/lib/expense-sharing.ts`
- `apps/api/src/observability/http-attributes.ts`
- `apps/api/src/routes/expense-sharing.test.ts`
- `apps/api/src/routes/expenses.ts`
- `apps/web/src/components/forms/ExpenseForm.tsx`
- `apps/web/src/components/forms/ExpenseInviteForm.tsx`
- `apps/web/src/hooks/useBootstrap.ts`
- `apps/web/src/lib/domain-api.ts`
- `apps/web/src/pages/ExpensesPage.tsx`
- `apps/web/src/responsive.css`
- `database/tests/README.md`
- `docs/05-api/endpoints.md`
- `docs/05-api/openapi.yaml`
- `packages/shared/src/expense-sharing.test.ts`
- `packages/shared/src/expense-sharing.ts`
- `packages/shared/src/schemas.ts`

Criados:

- `apps/web/src/components/ExpenseInbox.tsx`
- `apps/web/src/components/ExpenseLocations.tsx`
- `apps/web/src/components/ExpenseParticipants.tsx`
- `apps/web/src/components/forms/ExpenseLocationForm.tsx`
- `database/migrations/20261019021850_expense_location_cards.sql`
- `database/tests/expense_locations.sql`
- `database/tests/expense_locations_concurrency.mjs`
- `database/tests/expense_locations_fixture.sql`
- `docs/10-testes/reformulacao-despesas-auditoria.md`
- `e2e/expenses.spec.ts`

Nenhum arquivo de código ou dado foi removido. Artefatos anteriores dos testes foram restaurados.

## Arquivos adicionais analisados sem alterações

- `AGENTS.md`, `package.json`, manifests dos workspaces e `render.yaml`.
- `apps/web/src/App.tsx`, `main.tsx`, `contexts/AuthContext.tsx`, `lib/api.ts`, `lib/supabase.ts`, `lib/monthly-finance.ts` e `vite.config.ts`.
- `apps/web/src/components/Modal.tsx`, `Field.tsx`, `Button.tsx`, `StatCard.tsx`, `PeriodNavigation.tsx` e `AppLayout.tsx`.
- `apps/api/src/routes/dashboard.ts`, `spaces.ts`, `locations.ts`, `middleware/auth.ts`, `lib/db.ts`, `app.ts` e `server.ts`.
- Migrations `001_foundation.sql`, `002_modern_app_extensions.sql` e `20261018170810_expense_sharing_cards.sql`.
- `database/tests/expense_sharing.sql`, `expense_sharing_fixture.sql`, `expense_sharing_concurrency.mjs` e `playwright.config.ts`.
