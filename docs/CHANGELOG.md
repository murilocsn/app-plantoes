# Changelog

Todas as mudancas relevantes de documentacao, arquitetura e produto devem ser registradas aqui.

## 2026-10-16

### Alterado

- Acoes de editar e excluir agrupadas em painel flutuante no calendario, proximos plantoes, lista de plantoes e recebimentos: editar em azul claro e excluir no vermelho do selo financeiro. O painel fecha ao selecionar uma acao, tocar fora, rolar ou pressionar Esc, sem aumentar a altura das linhas.

- Recebimentos e pendencias usam faixa e selo financeiros: verde para pago, amarelo para pendente e vermelho para atrasado, com legenda e filtro de atrasados. Resumo separa valores pendentes e atrasados sem somar duas vezes, considerando o dia local para o vencimento.
- Plantoes preservam as cores dos marcadores do calendario, independentemente do pagamento.

- Dia selecionado no calendario, Plantoes e Recebimentos usam linhas compactas com faixa colorida, horario, local, valor, selo financeiro e seta para abrir as acoes existentes.
- Plantoes e Recebimentos exibem resumo financeiro, percentual pago, navegacao mensal e filtros expansiveis; recebimentos continuam consultando todos os periodos ate a selecao de um mes.
- Selos de plantoes usam somente recebiveis ligados por `shift_id`, distinguindo pagamento parcial, cancelamento, ausencia de vinculo e informacao indisponivel. O status de agendamento nao determina pagamento.
- Calendario consulta a rota autenticada existente de recebiveis e atualiza o cache apos alteracoes; falha financeira mantem a agenda disponivel com selo neutro. Banco, RLS e regras de pagamento preservados.

## 2026-10-15

### Alterado

- Interface compacta em todas as abas: hierarquia tipografica, espacamentos menores, filtros em colunas e botoes com novo acabamento visual.
- Recebimentos mantem busca e status acessiveis e agrupa periodo/unidade em painel expansivel; navegacao inferior passa a usar icones destacados e botao central arredondado.
- Navegacao inferior fixa no celular com atalhos Calendario, Plantoes e Recebimento, botao central azul para novo plantao e acesso ao Menu, respeitando a area segura e o espaco do conteudo.
- Tela de Plantoes inicia com o primeiro e o ultimo dia do mes vigente nos filtros, permitindo consultar outros periodos ou limpar a selecao.
- Estado vazio da lista de plantoes orienta ajustar os filtros quando existem registros em outros periodos ou unidades.
- Guidelines e Assistente IA inativadas nos menus desktop e mobile; os enderecos antigos redirecionam ao painel.
- Endpoint da Assistente IA desativado com resposta 404 e codigo `FEATURE_DISABLED`, preservando a autenticacao e sem chamar o provedor de IA.
- Paginas, conteudos e implementacao da assistente preservados no repositorio para eventual reativacao.

## 2026-09-19

### Adicionado

- Manual visual com imagens para instalar o FinancPlantoes na Tela de Inicio do iPhone/iPad.
- Registro de validacao parcial de RLS com teste pratico de isolamento em `locations`.
- Testes praticos adicionais de RLS para `shifts`, `receivables`, `personal_expenses`, `spaces` e `expenses`.
- Runbook e script de backup de baixo custo para uso sem Supabase Pro.

### Alterado

- Documentacao de lembretes push atualizada com o fluxo correto para iPhone/iPad via PWA instalado na Tela de Inicio.
- Script de backup ajustado para falhar quando Docker/Podman estiver ausente ou quando o dump gerado estiver vazio.

## 2026-09-18

### Adicionado

- Botao `Enviar teste` no controle de lembretes push para validar notificacao diretamente no aparelho.
- Runbook operacional de lembretes push em `docs/11-operacao/lembretes-push.md`.

### Alterado

- Cron de lembretes documentado de forma tecnica para execucao a cada 5 minutos com header `x-cron-secret`.
- Troubleshooting e deploy atualizados com as validacoes de VAPID, Vault, Edge Function e cron.
- `.env.example` ajustado para usar placeholders em vez de valores reais/publicaveis.

## 2026-09-17

### Adicionado

- Estrutura profissional de documentacao em `docs`.
- Documentacao de produto, requisitos, arquitetura, banco, API, seguranca, LGPD, instalacao, deploy, testes, operacao, manuais, comercial, governanca e roadmap.
- Contrato inicial OpenAPI em `docs/05-api/openapi.yaml`.

### Observacoes

- Documentacao criada a partir do codigo-fonte e arquivos existentes no repositorio.
- Pontos nao confirmados foram marcados explicitamente como `NAO CONFIRMADA`, `PARCIALMENTE IMPLEMENTADA`, `PLANEJADA` ou `LEGACY`.
