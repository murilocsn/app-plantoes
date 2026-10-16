# Revisao de dependencias e validacao da API

Data da verificacao: 2026-10-16. Escopo: correcoes compativeis de seguranca,
restauracao da API local e integracao de metricas HTTP OpenTelemetry.

## Arquivos alterados

- `.env.example`
- `package.json`
- `package-lock.json`
- `apps/api/package.json`
- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/src/observability/config.ts`
- `apps/api/src/observability/config.test.ts`
- `apps/api/src/observability/http-attributes.ts`
- `apps/api/src/observability/http-middleware.ts`
- `apps/api/src/observability/metrics.ts`
- `apps/api/src/observability/http-metrics.test.ts`
- `apps/api/src/routes/dashboard.test.ts`
- `scripts/check-http-metrics.mjs`
- `docs/11-operacao/monitoramento.md`
- `docs/11-operacao/opentelemetry.md`
- `docs/11-operacao/dependencias-seguranca.md`

## Resultado da auditoria

| Escopo                                             | Baixas | Moderadas | Altas | Criticas | Total |
| -------------------------------------------------- | -----: | --------: | ----: | -------: | ----: |
| Lockfile antes da alteracao                        |      1 |         9 |     2 |        3 |    15 |
| Lockfile depois da alteracao                       |      1 |         5 |     0 |        0 |     6 |
| Workspace da API, omitindo devDependencies, depois |      1 |         0 |     0 |        0 |     1 |

Os totais representam alertas por pacote na arvore do npm. Os alertas criticos
de `concurrently` e `shell-quote` pertenciam a mesma cadeia de dependencias.
Nenhum alerta foi atribuido aos pacotes OpenTelemetry nesta verificacao.
O comando `npm audit` continua retornando codigo 1 enquanto houver alertas;
isso nao significa que a auditoria nao foi executada.

## Correcoes aplicadas

| Pacote                   | Antes  | Depois |
| ------------------------ | ------ | ------ |
| express                  | 4.22.2 | 4.22.3 |
| morgan                   | 1.11.0 | 1.12.1 |
| concurrently             | 9.2.4  | 9.2.5  |
| proxy-addr               | 2.0.7  | 2.0.8  |
| shell-quote              | 1.9.0  | 1.12.0 |
| qs                       | 6.15.3 | 6.16.1 |
| body-parser              | 1.20.6 | 1.20.8 |
| source-map-js            | 1.2.1  | 1.2.2  |
| brace-expansion, linha 1 | 1.1.18 | 1.1.21 |
| brace-expansion, linha 5 | 5.0.9  | 5.0.12 |

As versoes minimas dos tres pacotes diretos foram atualizadas nos manifests;
as demais resolucoes ficam no `package-lock.json`. As instalacoes usaram
`--ignore-scripts`, sem executar hooks de dependencias. O build e os testes
confirmaram o funcionamento das ferramentas instaladas.

Referencias dos alertas criticos:
[proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) e
[shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).

## Alertas restantes e tratamento separado

| Cadeia                                          | Alertas     | Motivo para tratamento separado                                                                                                                                                                                                                                      |
| ----------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| react-router-dom 6.30.6 / react-router 6.30.6   | 2 moderados | O npm propoe migrar para 7.18.4, fora da faixa principal declarada. Revisar navegacao, redirecionamentos e testes antes dessa migracao.                                                                                                                              |
| @capacitor/cli 8.5.2 / xcode 3.0.1 / uuid 7.0.3 | 3 moderados | A sugestao automatica troca a versao do CLI para 8.4.3, fora da faixa atual. Revisar a cadeia iOS e a compatibilidade com Capacitor Android/Core/iOS em uma alteracao propria.                                                                                       |
| tsup 8.5.1 / esbuild 0.27.7                     | 1 baixo     | A falha afeta o servidor de desenvolvimento do esbuild no Windows. O projeto usa tsup para build e nao inicia esse servidor. A linha atual do tsup declara esbuild `^0.27.0`; revisar uma atualizacao do bundler sem impor uma versao fora dessa faixa por override. |

O alerta do esbuild tambem aparece em `--omit=dev` porque tsup esta declarado
nas dependencias da API. Isso nao equivale a executar o servidor vulneravel
no processo Express. A avaliacao de uso reduz a exposicao identificada, mas
nao elimina os alertas pendentes. Nao foram usados `audit fix --force`,
supressoes ou overrides para fazer a contagem parecer zero.

Reexecutar a auditoria antes de publicar: advisories e versoes corrigidas mudam.

## HTTP 500 local: causa e verificacao

A instalacao local estava incompleta: `npm run dev:api` nao encontrava `tsx`,
e os testes nao encontravam `vitest`. A API nao atendia em `localhost:3333`.
O proxy do Vite em `localhost:5173` devolvia HTTP 500 vazio para
`/api/dashboard/bootstrap`, com `ECONNREFUSED` no acesso direto a API.

Depois da restauracao das dependencias:

- `/health` direto na API: 200.
- Bootstrap sem sessao, direto e pelo proxy: 401 `AUTH_REQUIRED`.
- Bootstrap com conta de testes ja configurada, direto e pelo proxy: 200,
  com o contrato esperado da resposta.
- As seis consultas do bootstrap foram conferidas separadamente com
  `select(..., { head: true })`, as mesmas projecoes e os filtros do usuario:
  todas retornaram 200, sem retornar linhas para o diagnostico.
- As sessoes criadas para a verificacao foram encerradas com escopo local.

Nenhum dado de negocio foi escrito. Credenciais, IDs de usuarios e corpos
de respostas nao fazem parte deste registro. Nao houve mudanca no handler
do bootstrap, na autenticacao, no banco ou nas policies de RLS.

A consulta reciproca entre as policies de `spaces` e `space_members` na
migration 002 permanece como ponto de revisao. Nao houve erro `42P17` na
conta testada, e nao foi constatado que essas definicoes correspondam as
policies efetivas do ambiente. Nao aplicar migration ou desativar RLS
para corrigir um erro de proxy.

## Verificacoes executadas

| Verificacao                           | Resultado                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm ls --depth=0`                    | Arvore valida, codigo 0.                                                                               |
| `npm run typecheck`                   | API, web e shared aprovados.                                                                           |
| `npm run lint`                        | Aprovado.                                                                                              |
| `npm test`                            | 125 testes: API 68, web 32 e shared 25.                                                                |
| `npm run build`                       | API ESM/tsup e web/Vite aprovados.                                                                     |
| `node scripts/check-http-metrics.mjs` | Quatro cenarios aprovados: fonte tsx e build ESM, telemetria ligada/desligada, protobuf e privacidade. |

O primeiro build falhou por restricao de leitura dos diretorios ancestrais
pelo esbuild no sandbox. A repeticao com a permissao de leitura necessaria
passou, sem alterar configuracoes de build ou a versao do Node.js.

Os testes novos de bootstrap usam fixtures somente na suite isolada. A
validacao autenticada descrita acima utilizou a API e o Supabase reais.
Os testes de metricas usaram um coletor local; a ingestao no Grafana Cloud
nao foi validada e nenhum deploy foi executado. Ver
[configuracao OpenTelemetry](opentelemetry.md) para a ativacao posterior.
