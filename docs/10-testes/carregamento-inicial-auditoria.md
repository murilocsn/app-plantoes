# Carregamento inicial — investigação de 30/10/2026

## Medições públicas

Medições HTTP pontuais feitas a partir da máquina de desenvolvimento, sem sessão,
sem ler dados financeiros e sem gravar registros. Não são percentis de usuários
reais nem uma comparação autenticada antes/depois.

| Recurso | Tempo total | Resultado |
| --- | ---: | --- |
| HTML do GitHub Pages | 442 ms | HTTP 200 |
| Primeira chamada a `/health` no Render | 31.420 ms | HTTP 200 |
| Segunda chamada a `/health` no Render | 413 ms | HTTP 200 |
| JavaScript inicial publicado | 303 ms | HTTP 200; gzip; 132.172 bytes transferidos e 449.455 bytes descomprimidos |

O endpoint `/health` não consulta o Supabase. A diferença entre as duas chamadas
é compatível com inicialização após suspensão da API. `render.yaml` declara
`plan: free`; o plano efetivo do serviço ainda precisa ser conferido no painel.
O Render documenta suspensão após 15 minutos sem tráfego e inicialização no
próximo acesso: <https://render.com/docs/free#spinning-down-on-idle>.

Otimizações de consultas não eliminam essa espera da infraestrutura. Não foram
alterados planos, cobrança, hospedagem, policies ou schema do banco.

## Alteração no caminho do calendário

A tela inicial usa apenas plantões do calendário, próximos plantões e locais,
mas aguardava nove operações de dados do overview completo. Agora solicita
`GET /api/dashboard/overview?month=MM-AAAA&view=calendar`: duas consultas a
`shifts` e uma a `locations`, executadas em paralelo e filtradas pelo usuário
autenticado. Não espera despesas, compartilhamentos ou espaços.

O calendário continua buscando recebíveis em paralelo para seus indicadores de
pagamento. Portanto, há três operações no overview reduzido e uma consulta de
recebíveis, além da validação de autenticação por requisição. Sem `view=calendar`,
o contrato completo do overview é preservado. O bootstrap das demais telas
também é preservado.

## Medição da autenticação

O middleware acrescenta `auth;dur=...` ao `Server-Timing`, inclusive em falhas
do provedor. Overview e despesas acrescentam seus tempos sem apagar o de auth.
O CORS expõe esse cabeçalho ao frontend autorizado. O valor contém apenas nomes
fixos e duração em milissegundos, sem token, ID, e-mail ou valores financeiros.

A validação remota com `auth.getUser(token)` permanece. Não foi criado cache de
identidades nem substituída a verificação por simples leitura do JWT. Erros
inesperados do provedor chegam ao tratamento de erro da API.

## Verificação e limites

Os testes de contrato verificam redução de nove para três consultas, filtros do
usuário e período, indisponibilidade de serviços não utilizados, erros, contrato
completo e coexistência dos tempos de auth e dados. Os testes de navegador usam
sessão e respostas simuladas, sem acessar contas reais.

Ainda é necessário publicar a atualização para medir o calendário autenticado
em produção. A hipótese da suspensão deve ser confirmada nos eventos e no plano
efetivo do Render antes de decidir qualquer mudança de hospedagem.

## Verificações executadas

- `npm.cmd test`: 283 testes aprovados (174 API, 72 web, 37 shared).
- `npm.cmd run typecheck`: aprovado; API conferida novamente após ajuste do teste.
- `npm.cmd run lint`: aprovado.
- `npm.cmd run build -w @financplantoes/api`: aprovado.
- `npm.cmd exec -w @financplantoes/web -- vite build --configLoader runner`: aprovado.
- Playwright em `e2e/auth.spec.ts`: 15 cenários aprovados, combinando login,
  recarga, recebíveis em espera, ações do plantão, atualização dos selos de
  pagamento e layout do calendário em desktop, Chromium móvel e Safari móvel.
- `git diff --check`: aprovado.

## Arquivos desta atualização

- `apps/api/src/app.ts`
- `apps/api/src/app.test.ts`
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/routes/dashboard.ts`
- `apps/api/src/routes/dashboard.test.ts`
- `apps/api/src/routes/expenses.ts`
- `apps/web/src/lib/domain-api.ts`
- `packages/shared/src/types.ts`
- `e2e/auth.spec.ts` (cenário de carregamento inicial e recarga)
- `docs/10-testes/carregamento-inicial-auditoria.md`
