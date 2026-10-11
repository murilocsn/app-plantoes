# Checklist de implementacao pendente

Status: PLANEJADA

Ultima revisao: 2026-10-11

Este checklist consolida as pendencias documentadas em `README.md`, `docs/01-produto`, `docs/06-seguranca`, `docs/07-privacidade-lgpd`, `docs/10-testes`, `docs/11-operacao`, `docs/14-comercial`, `docs/15-governanca` e `docs/16-roadmap`.

O objetivo e orientar a proxima fase de implementacao sem alterar banco de dados, autenticacao, APIs ou regras de negocio sem decisao explicita.

## Proxima fase recomendada

Fase: Prontidao comercial minima e estabilidade.

Meta: transformar a base atual em uma versao mais segura, validavel e operavel antes de ampliar funcionalidades grandes.

Escopo recomendado:

- [ ] Fechar LGPD minima: politica, termos, retencao, exclusao e exportacao.
- [ ] Validar seguranca real: RLS, acesso cruzado, segredos, logs e rate limiting.
- [ ] Fechar backup/restore testado.
- [ ] Configurar monitoramento, alertas e suporte.
- [ ] Completar validacoes de regressao do fluxo principal.

Fora de escopo inicial:

- [ ] Refatoracao ampla de arquitetura.
- [ ] Mudancas destrutivas no banco.
- [ ] Novas features grandes de financeiro/espacos antes de estabilizar seguranca e operacao.
- [ ] Reativar Assistente IA sem redesenhar objetivo, fontes, limites e criterios de qualidade.

## Bloqueadores antes de uso comercial amplo

### Privacidade e LGPD

Fonte principal: `docs/07-privacidade-lgpd/*`.

- [ ] Definir papel juridico/comercial do produto: controlador, operador ou ambos.
- [ ] Criar politica de privacidade publica.
- [ ] Criar termos de uso.
- [ ] Definir canal de atendimento ao titular.
- [ ] Definir processo de exclusao completa de conta e dados.
- [ ] Definir processo de exportacao completa dos dados do usuario.
- [ ] Definir prazos de retencao por tipo de dado.
- [ ] Criar mapa de subprocessadores: Supabase, Render, hospedagem, e-mail, analytics, lojas mobile e demais servicos.
- [ ] Criar registro/processo de incidentes de seguranca e privacidade.
- [ ] Revisar documentos com apoio juridico antes de publicacao comercial.

### Seguranca

Fontes principais: `docs/06-seguranca/*`, `docs/10-testes/validacao-rls.md`.

- [ ] Auditar segredos em arquivos rastreados e historico Git antes de publicar.
- [ ] Definir rotina recorrente de auditoria de segredos.
- [ ] Validar RLS em ambiente real novamente antes de lancamento.
- [ ] Automatizar testes de isolamento entre dois usuarios.
- [ ] Testar regras especificas de convites em `space_invitations`.
- [ ] Testar mudanca de papeis em `space_members`.
- [ ] Testar isolamento de `expense_splits` e `settlements`.
- [ ] Implementar rate limiting na API.
- [ ] Revisar logs de producao para evitar dados sensiveis.
- [ ] Formalizar rotina de auditoria de dependencias.
- [ ] Confirmar HTTPS em todos os ambientes publicados.

### Backup e recuperacao

Fontes principais: `docs/11-operacao/backup-recuperacao.md` e `docs/11-operacao/backup-baixo-custo.md`.

- [ ] Definir RPO.
- [ ] Definir RTO.
- [ ] Executar backup real do banco.
- [ ] Copiar backup para armazenamento externo.
- [ ] Testar restore em ambiente separado.
- [ ] Documentar evidencia do teste de restore.
- [ ] Definir frequencia de backup.
- [ ] Definir responsavel pela rotina.
- [ ] Criar regra obrigatoria de backup antes de migrations.
- [ ] Documentar quando arquivos gerados nao devem ser considerados backup valido.

### Monitoramento e suporte

Fontes principais: `docs/11-operacao/monitoramento.md`, `docs/11-operacao/suporte.md`.

- [ ] Configurar alerta de indisponibilidade.
- [ ] Configurar alerta para erros 5xx.
- [ ] Configurar monitoramento de uptime.
- [ ] Monitorar falhas da Edge Function de lembretes.
- [ ] Monitorar entregas de push.
- [ ] Definir canal oficial de suporte.
- [ ] Definir horario de atendimento.
- [ ] Definir SLA.
- [ ] Definir procedimento de incidentes.
- [ ] Definir responsavel tecnico.
- [ ] Definir responsavel comercial.

### API e contratos

Fontes principais: `docs/05-api/*`, `docs/15-governanca/divida-tecnica.md`.

- [ ] Completar OpenAPI com schemas de request.
- [ ] Completar OpenAPI com schemas de response.
- [ ] Documentar erros padronizados por endpoint.
- [ ] Conferir endpoints parciais de despesas.
- [ ] Conferir endpoints parciais de espacos.
- [ ] Garantir que exemplos nao exponham dados reais.

## Produto e experiencia

### Fluxo principal

Fonte principal: `README.md`.

- [ ] Validar login em navegador limpo.
- [ ] Validar logout.
- [ ] Validar recuperacao de sessao sem reload infinito.
- [ ] Validar ausencia de clientes GoTrue duplicados.
- [ ] Validar estabilidade do calendario.
- [ ] Validar CRUD de locais.
- [ ] Validar CRUD de plantoes.
- [ ] Validar regras de recorrencia e exclusao granular.
- [ ] Validar isolamento entre duas contas.
- [ ] Validar comportamento desktop e mobile.
- [ ] Validar service worker/cache apos mudancas de frontend.

### Painel e calendario

Status atual: redesign responsivo iniciado na fase anterior.

- [ ] Validar manualmente o painel autenticado em 320px, 375px, 390px, 768px, 1024px e 1440px.
- [ ] Validar tema claro e escuro no painel.
- [ ] Validar navegacao por teclado no calendario.
- [ ] Validar leitores de tela para selecao de dias.
- [ ] Validar modo mensal e semanal com dados reais.
- [ ] Validar que nao ha rolagem horizontal em conta autenticada.

### Financeiro e despesas

Fontes principais: `docs/01-produto/funcionalidades.md`, `README.md`.

- [ ] Melhorar despesas compartilhadas.
- [ ] Implementar despesas recorrentes, se mantidas no roadmap.
- [ ] Melhorar filtros por periodo e local.
- [ ] Evoluir regras de pagamento por local.
- [ ] Expandir acompanhamento de pagamento: dinheiro, PIX, transferencia e outros meios.
- [ ] Evoluir relatorios financeiros.

### Espacos e colaboracao

Fontes principais: `docs/01-produto/funcionalidades.md`, `README.md`.

- [ ] Completar convites para espacos.
- [ ] Completar permissoes por membro.
- [ ] Completar rateios de despesas.
- [ ] Completar saldos por espaco.
- [ ] Completar acertos entre participantes.
- [ ] Criar testes multiusuario para fluxos compartilhados.

### Lembretes push

Fonte principal: `docs/11-operacao/lembretes-push.md`.

- [ ] Confirmar `VITE_VAPID_PUBLIC_KEY` no frontend publicado.
- [ ] Confirmar secrets VAPID na Edge Function.
- [ ] Confirmar `CRON_SECRET` e Vault alinhados.
- [ ] Confirmar cron `*/5 * * * *` ativo.
- [ ] Testar notificacao no Android.
- [ ] Testar PWA instalado no iPhone.
- [ ] Testar lembrete real de 90 minutos.
- [ ] Testar lembrete real de 24 horas.
- [ ] Monitorar entregas e falhas.

### Assistente IA

Status atual: inativado no frontend por qualidade insuficiente.

- [ ] Definir se a funcionalidade sera removida, mantida oculta ou redesenhada.
- [ ] Definir objetivo claro do assistente.
- [ ] Definir fontes permitidas e limites de resposta.
- [ ] Definir criterios de qualidade antes de reativar.
- [ ] Revisar custos, logs e privacidade antes de nova publicacao.

## Mobile e PWA

Fontes principais: `docs/mobile-publication-phase-1.md`, `docs/12-manual-usuario/instalar-na-tela-de-inicio-iphone.md`.

- [ ] Instalar/configurar Java JDK.
- [ ] Instalar/configurar Android Studio.
- [ ] Rodar `apps/web/android/gradlew.bat assembleDebug`.
- [ ] Corrigir eventuais falhas do build Android.
- [ ] Gerar build Android assinado.
- [ ] Gerar `.aab` para Play Store.
- [ ] Publicar teste interno na Play Store.
- [ ] Preparar ambiente macOS/Xcode para iOS.
- [ ] Gerar build iOS.
- [ ] Publicar via TestFlight.
- [ ] Definir URL publica de politica de privacidade para lojas.
- [ ] Definir e-mail de suporte para lojas.
- [ ] Validar push em app instalado.

## Governanca e comercial

Fontes principais: `docs/14-comercial/*`, `docs/15-governanca/*`.

- [ ] Auditar licencas das dependencias.
- [ ] Definir propriedade intelectual e termos de distribuicao.
- [ ] Definir estrategia de monetizacao.
- [ ] Definir separacao entre plano gratuito e premium, se aplicavel.
- [ ] Criar processo de suporte comercial.
- [ ] Criar rotina de manutencao.
- [ ] Revisar codigo legado e decidir remocao ou preservacao.
- [ ] Definir metricas de uso e estabilidade.
- [ ] Avaliar necessidade de painel administrativo.

## Ordem sugerida de execucao

### Etapa 1 - Estabilidade e risco

- [ ] Validar regressao do fluxo principal.
- [ ] Validar RLS pendente e acesso multiusuario.
- [ ] Fechar backup/restore testado.
- [ ] Implementar rate limiting.

### Etapa 2 - LGPD e operacao

- [ ] Criar politica de privacidade.
- [ ] Criar termos de uso.
- [ ] Definir exclusao/exportacao de dados.
- [ ] Configurar monitoramento e suporte.

### Etapa 3 - Produto parcial

- [ ] Finalizar validacao do painel responsivo.
- [ ] Fortalecer push.
- [ ] Melhorar espacos/despesas compartilhadas.
- [ ] Completar OpenAPI.

### Etapa 4 - Mobile/publicacao

- [ ] Fechar build Android.
- [ ] Fechar build iOS.
- [ ] Preparar lojas.
- [ ] Executar testes em dispositivos reais.

## Definition of done para cada item

- [ ] Implementacao feita nos arquivos corretos.
- [ ] Sem alteracao destrutiva nao autorizada.
- [ ] Typecheck executado.
- [ ] Lint executado.
- [ ] Testes relacionados executados.
- [ ] Build executado quando houver impacto em frontend/backend.
- [ ] Validacao manual documentada quando depender de conta, loja, Supabase ou dispositivo.
- [ ] Documentacao atualizada.
- [ ] Riscos e pendencias remanescentes registrados.
