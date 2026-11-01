# Publicação da API e identificação da versão

## Origem da divergência identificada em 01/11/2026

A branch `perf/medir-autenticacao-api` continha o commit `8ccc78a`, enquanto a
`main` permanecia em `0f79a04`. A publicação de produção em
`.github/workflows/ci-deploy.yml` só era disparada por pushes na `main`.
Os três commits novos da branch de trabalho, portanto, não acionaram o deploy.

O script anterior chamava o hook sem especificar um commit. Nesse caso, o Render
publica a versão da branch vinculada nas configurações do serviço, que pode ser
diferente da branch validada pelo GitHub Actions. O script também encerrava com
sucesso ao faltar o hook e não verificava qual versão ficava disponível.

A integração preserva o histórico já publicado e o trabalho atual. O único
conflito de conteúdo era em `routes/expenses.ts`: foi mantido `response.append`
para conservar o tempo da autenticação no cabeçalho `Server-Timing`.

## Fluxo de publicação

1. Integrar as alterações por PR na `main`.
2. O CI executa typecheck, lint, testes da aplicação e do deploy, e build.
3. O job de publicação envia o SHA completo de `github.sha` ao hook como `ref`.
4. O script consulta a URL pública `/version` até obter exatamente esse SHA.
5. Se o hook estiver ausente, falhar, ou a versão não for confirmada em dez
   minutos, o job falha. Enviar o pedido de deploy não equivale a concluí-lo.

Deploys da API ficam serializados pelo grupo `render-api-producao`.
O GitHub Pages continua sendo publicado pelo workflow próprio a partir da `main`.

## Configuração

O secret existente `RENDER_API_DEPLOY_HOOK_URL` continua privado. O workflow
fornece `RENDER_DEPLOY_COMMIT` e `RENDER_VERIFY_URL`. URLs de hook e suas chaves
não são impressas em logs, erros ou documentação.

O Render documenta que um deploy hook com `ref` desativa o auto-deploy nativo
do serviço. A publicação passa a ser controlada pelo CI da `main`; não é
necessário reativar o auto-deploy de outra branch no painel.

O endpoint público `GET /version` responde somente:

```json
{"data":{"commit":"SHA completo do deploy","branch":"branch informada pelo Render"}}
```

Os valores vêm de `RENDER_GIT_COMMIT` e `RENDER_GIT_BRANCH`. Metadados ausentes ou
inválidos são retornados como `null`. A resposta usa `Cache-Control: no-store` e
não consulta autenticação ou dados de usuários. O SHA é a referência exata da
versão executada; o nome da branch pode continuar refletindo a configuração do
serviço quando um commit específico foi solicitado.

## Verificação

- `node --test scripts/deploy-render.test.mjs`: cenários sintéticos, sem deploy real.
- `npm test`, `npm run typecheck`, `npm run lint` e builds dos workspaces.
- Após publicação, comparar `/version.data.commit` com o SHA do merge na `main`.
- Confirmar os workflows da API e do GitHub Pages e o conteúdo publicado.

Não há alteração de plano, cobrança, schema, migrations ou policies do banco.

Referências: [deploy hooks](https://render.com/docs/deploy-hooks),
[deploy de commit específico](https://render.com/docs/deploys#deploying-a-specific-commit),
[variáveis padrão do Render](https://render.com/docs/environment-variables).
