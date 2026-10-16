# Metricas HTTP com OpenTelemetry

## Escopo e inicializacao

A primeira fase observa somente o backend `apps/api`: volume, duracao e status
das requisicoes HTTP. O runtime nao inicializa traces nem logs remotos e nao
instrumenta banco, frontend ou Edge Functions. Nao e necessario expor `/metrics`.

`src/server.ts` carrega dotenv, inicializa um unico runtime de metricas e somente
depois importa dinamicamente a aplicacao Express. Essa ordem vale para
`npm run dev:api` (`tsx watch`) e `npm run start -w @financplantoes/api` apos o
build ESM com tsup. Nao adicionar auto-instrumentations, loaders OTel, outro
middleware de metricas ou preloads em `NODE_OPTIONS`: a coleta e manual e unica.
O provider e privado; nao modifica o provider global do processo.

As configuracoes OTel sao lidas separadamente em `observability/config.ts`, antes
do carregamento de rotas. Dotenv preserva o comportamento existente: procura
`.env` no diretorio de execucao. Os scripts npm da API executam em `apps/api`.
Para escolher outro arquivo local, definir `DOTENV_CONFIG_PATH` explicitamente.
Em hospedagem, configurar as variaveis diretamente no ambiente do backend.

## Configuracao

Telemetria fica desabilitada por padrao. Somente `OTEL_SDK_DISABLED=false`
habilita a coleta e a exportacao. Configuracao invalida desabilita a telemetria,
mantem a API disponivel e produz um aviso fixo sem imprimir valores.

| Variavel                      | Comportamento                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `OTEL_SDK_DISABLED`           | `true` por padrao; `false` habilita metricas.                                                          |
| `OTEL_METRICS_EXPORTER`       | `otlp` por padrao; `none` tambem desabilita.                                                           |
| `OTEL_SERVICE_NAME`           | Somente `financplantoes-api` e permitido.                                                              |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | Somente `http/protobuf` e permitido.                                                                   |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint base; o codigo acrescenta `/v1/metrics`, preservando `/otlp`, se existente.                   |
| `OTEL_EXPORTER_OTLP_HEADERS`  | Opcional localmente; somente `authorization` e permitido. Nunca versionar seu valor real.              |
| `OTEL_METRIC_EXPORT_INTERVAL` | Milissegundos; padrao `60000`, minimo `1000`, maximo `300000`.                                         |
| `OTEL_EXPORTER_OTLP_TIMEOUT`  | Milissegundos; padrao `5000` ou o intervalo, se menor; entre `100` e `10000`, sem exceder o intervalo. |

As variantes `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, `..._METRICS_PROTOCOL`,
`..._METRICS_HEADERS` e `..._METRICS_TIMEOUT` tem precedencia. O endpoint especifico
deve conter o caminho completo terminado em `/v1/metrics`; nao recebe sufixo.
Os headers genericos e especificos sao validados e combinados; o especifico
prevalece para `authorization`. Basic e Bearer sao aceitos; o espaco pode ser
codificado como `%20`. Valores de configuracao nunca sao incluidos em avisos.

Exigir HTTPS para destinos remotos. HTTP so e permitido para loopback
(`localhost`, `127.0.0.1` ou `[::1]`). URLs com usuario, senha, query string ou
fragmento sao rejeitadas. Nao usar variaveis `VITE_OTEL_*`, nem enviar credenciais
do Grafana ao frontend. `OTEL_RESOURCE_ATTRIBUTES` e detectores de host/processo
nao sao usados por este provider.

## Dados exportados e privacidade

| Instrumento                           | Tipo / unidade        | Finalidade                                                          |
| ------------------------------------- | --------------------- | ------------------------------------------------------------------- |
| `financplantoes.http.server.requests` | Counter / `{request}` | Volume por metodo, template e status; metrica propria da aplicacao. |
| `http.server.request.duration`        | Histogram / `s`       | Duracao; soma, contagem e buckets permitem calcular percentis.      |

Recursos permitidos: `service.name=financplantoes-api` e
`deployment.environment.name` restrito a `development`, `test` ou `production`.
Atributos permitidos: `http.request.method` (metodos conhecidos ou `_OTHER`),
`http.route` (lista fechada em `http-attributes.ts`),
`http.response.status_code` (100 a 599, somente quando headers foram enviados),
`error.type=client_aborted` em desconexoes. O SDK pode emitir somente o indicador
booleano `otel.metric.overflow` quando a cardinalidade atinge o limite de 2000
combinacoes por instrumento; esse bucket agrega o excedente sem novos valores.

O middleware comeca antes de CORS e do parser JSON e registra uma unica vez no
fim ou fechamento da resposta. Rotas parametrizadas usam, por exemplo,
`/api/shifts/:id`. Falhas antes do roteamento, 401 na autenticacao, 404 de caminhos
desconhecidos e templates nao aprovados usam `unmatched`, sem inspecionar ou
exportar a URL. Templates novos precisam de inclusao explicita na lista.
Health checks sao incluidos nesta fase e podem ser filtrados no painel.

Nao sao coletados corpos, query strings, headers de clientes, cookies, IPs,
identificadores pessoais, parametros reais, dados clinicos, valores financeiros,
mensagens de erro ou baggage. O header de autorizacao do exportador e uma
credencial de transporte; nunca e um atributo nem vem da requisicao HTTP.
Os logs locais existentes do Morgan usam o mesmo filtro e duracao em
milissegundos, sem exportacao remota.

A exportacao e periodica, cumulativa e fora do caminho da requisicao, com uma
exportacao concorrente no maximo. Falhas de transporte geram somente um aviso
fixo por minuto, sem repassar detalhes do erro ao diagnostico. SIGTERM/SIGINT
interrompem novas conexoes, drenam as existentes (limite de 10 segundos) e
encerram o provider com flush limitado pelo timeout configurado mais 1 segundo.
Nao ha persistencia local: encerramentos abruptos podem perder o ultimo intervalo.

## Validacao local

1. Usar um coletor OTLP local ou [Grafana OTEL LGTM](https://grafana.com/docs/opentelemetry/docker-lgtm/), com portas restritas a loopback.
2. Configurar no backend `OTEL_SDK_DISABLED=false`,
   `OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318` e
   `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`; sem headers reais.
   Para testes manuais, `OTEL_METRIC_EXPORT_INTERVAL=1000` e timeout `500`.
3. Iniciar `npm run dev:api`, acessar `/health` e uma rota `/api` sem token.
   Esperar status 200 e 401, respectivamente, e series com `/health` e `unmatched`.
4. Parar o coletor: a API deve continuar respondendo; verificar somente o aviso fixo.
5. Repetir com `OTEL_SDK_DISABLED=true`: nenhuma exportacao deve ocorrer.

Verificacoes automatizadas na raiz:

```text
npm run typecheck
npm run lint
npm test
npm run build
node scripts/check-http-metrics.mjs
```

No PowerShell com scripts bloqueados, usar `npm.cmd`. O smoke test usa somente
variaveis sinteticas, nao carrega arquivos `.env` e testa o servidor fonte com
tsx e o artefato compilado, com coleta habilitada e desabilitada. Nao consulta
Supabase nem executa deploy. Os testes unitarios/integrados cobrem contagem,
duracao, status, privacidade, autenticacao sem token, desconexao, protobuf,
rejeicao, timeout e excecoes do exportador.

## Conexao futura com Grafana Cloud

1. Obter o endpoint OTLP da stack e criar uma credencial restrita a `metrics:write`.
2. No ambiente exclusivo do backend, definir endpoint, protocolo e o header
   de autorizacao fornecido pelo Grafana. Manter a credencial em secrets da
   hospedagem, sem coloca-la no Git, comandos compartilhados ou capturas de tela.
3. Habilitar a coleta com `OTEL_SDK_DISABLED=false` e confirmar a ingestao em
   homologacao antes de liberar em producao. Esta alteracao nao realiza deploy.
4. Consultar os nomes efetivos no Explore: a traducao OTLP/Prometheus pode
   normalizar nomes e unidades. Criar paineis de volume, status, 5xx e p95/p99,
   separando `/health`; manter 4xx separados de erros internos.
5. Comparar latencia, CPU, memoria e cardinalidade com a linha de base. Monitorar
   o aviso de falha de exportacao. Para rollback, definir `OTEL_SDK_DISABLED=true`
   e reiniciar a API.

Falhas internas convertidas em 400 ou fallback 200 continuam com o comportamento
atual. Esta fase mede HTTP e nao adiciona instrumentacao de dependencias.

### Configuracao no Render (somente a API)

Na pagina do servico `financplantoes-api`, abrir **Environment** e cadastrar
cada nome e valor separadamente, sem `export` e sem aspas no painel:

| Nome                          | Valor                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `OTEL_SDK_DISABLED`           | `false`                                                                           |
| `OTEL_METRICS_EXPORTER`       | `otlp`                                                                            |
| `OTEL_SERVICE_NAME`           | `financplantoes-api`                                                              |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf`                                                                   |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint base HTTPS da sua stack, incluindo `/otlp` quando fornecido.             |
| `OTEL_EXPORTER_OTLP_HEADERS`  | Autorizacao privada fornecida pelo Grafana, no formato `Authorization=Basic ...`. |
| `OTEL_METRIC_EXPORT_INTERVAL` | `60000`                                                                           |
| `OTEL_EXPORTER_OTLP_TIMEOUT`  | `5000`                                                                            |

Obter endpoint e autorizacao em **Grafana Cloud Portal > sua stack > OpenTelemetry > Configure**.
Criar uma credencial com permissao de escrita de metricas (`metrics:write`),
restrita a stack e com expiracao. Nao colocar o token puro no lugar da autorizacao
completa. Credenciais que tenham sido publicadas devem ser substituidas no painel
do provedor; nunca copia-las para documentacao ou capturas de tela.

Se o backend usa a branch `main`, o codigo desta integracao precisa passar por
revisao e chegar nessa branch antes da ativacao em producao. Alterar variaveis
sem publicar a instrumentacao nao cria metricas. Este procedimento nao autoriza
deploy automatico, merge ou alteracao da branch do servico.

### Confirmacao da ingestao

1. Confirmar `/health` com 200 e `/api/dashboard/bootstrap` sem sessao com 401.
   Com uma sessao valida no aplicativo, confirmar bootstrap 200 sem copiar seu corpo.
2. No Grafana, abrir **Explore**, selecionar o datasource de metricas
   **Prometheus** da stack e procurar `financplantoes` ou `http_server_request_duration`.
   Aguardar pelo menos dois intervalos de exportacao e usar uma janela de 15 minutos.
3. Conferir os nomes efetivamente normalizados pelo backend de metricas antes de
   escrever consultas: o contador e `financplantoes.http.server.requests`, e o
   histograma e `http.server.request.duration` em segundos na origem OTLP.
4. Montar paineis de requisicoes por segundo, distribuicao por status, proporcao
   de 5xx e p95 da duracao. Usar somente os templates autorizados e separar `/health`.
5. O assistente de **Application Observability** pode procurar traces e mostrar
   "could not find any traces". Esse teste nao comprova falha nas metricas:
   esta fase nao produz traces nem logs remotos. A confirmacao e no datasource de metricas.

Se nao houver metricas, conferir se a API esta executando o codigo instrumentado,
se a telemetria esta habilitada e se o endpoint/protocolo/header correspondem a
mesma stack. Verificar apenas o aviso fixo de falha de exportacao; nao imprimir
configuracao nem ativar logs de diagnostico com credenciais. Em uma falha do
exportador, a API continua disponivel. A validacao local com coletor de teste nao
constitui comprovacao de entrega no Grafana Cloud.

### Diagnostico de HTTP 500 no desenvolvimento

O frontend usa o proxy do Vite (`/api` para `API_TARGET`, por padrao
`http://localhost:3333`). Um 500 vazio do proxy com `ECONNREFUSED` e diferente
do JSON `INTERNAL_ERROR` produzido pelo backend. Verificar primeiro `/health`
diretamente na API. Se `npm run dev:api` nao encontra `tsx`, restaurar a instalacao
de dependencias na raiz; nao mudar RLS nem devolver dados vazios para contornar
uma API que nao iniciou. O arquivo `.env` da API deve ser carregado em `apps/api`,
e a configuracao publica do Vite fica no `.env` da raiz.

Os testes `apps/api/src/routes/dashboard.test.ts` usam fixtures sinteticas apenas
na suite de testes. Eles exercitam o handler real, escopo de usuario, erros de
sessao, rejeicoes de consultas e propagacao do codigo `42P17`; nao substituem a
validacao autenticada contra o Supabase real. As policies de `spaces` e
`space_members` na migration 002 possuem consultas reciprocas: confirmar o
estado efetivo do banco antes de atribuir qualquer falha a recursao de RLS.
Nao desabilitar RLS ou aplicar migrations como tentativa de resolver falha de proxy.

Referencias: [Grafana Cloud OTLP](https://grafana.com/docs/grafana-cloud/send-data/otlp/send-data-otlp/)
e [convencoes HTTP OpenTelemetry](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/).
