# FinancPlantões

Aplicação web para profissionais de saúde organizarem **plantões, locais de trabalho, recebimentos, despesas e rotina financeira**, com conta individual e dados protegidos por usuário.

> **Status:** MVP em evolução ativa. O foco atual é estabilidade, segurança e uma experiência simples o suficiente para uso diário.

## Visão do produto

O FinancPlantões está sendo construído para ir além de uma agenda de plantões: a proposta é unir a praticidade de um gestor de escalas com uma camada de controle financeiro pessoal e, progressivamente, recursos de colaboração inspirados em apps de divisão de despesas.

Referências de produto utilizadas para decisões de UX e funcionalidades:

- **Plantãozinho:** referência de rapidez para cadastrar, visualizar e acompanhar plantões e recebimentos, incluindo recorrência, filtros e organização visual. O produto destaca cadastro rápido de plantões, controle de pagamentos e sincronização entre dispositivos.
- **Splitwise:** referência para grupos, participantes, saldos, despesas compartilhadas, pagamentos/ajustes e redução de complexidade na divisão financeira.

A intenção não é copiar esses produtos, mas combinar aprendizados de usabilidade com as necessidades específicas de profissionais de saúde.

## Estado atual

A versão principal é servida pela raiz do projeto (`index.html`). O aplicativo não deve depender de uma rota `/v2` para funcionar.

Já existem no projeto:

- Supabase Auth;
- isolamento de dados por usuário com PostgreSQL + RLS;
- calendário de plantões;
- cadastro, edição e exclusão de plantões;
- locais de trabalho;
- recorrências;
- cálculo de duração e valores;
- indicadores financeiros;
- relatórios e exportação;
- PWA e estrutura de notificações;
- espaços compartilhados em evolução;
- despesas e recursos financeiros em evolução.

## Funcionalidades e regras de produto

### Plantões

- Data, horário, duração, local e valor;
- plantões diurnos e noturnos;
- recorrências;
- calendário mensal;
- edição e exclusão;
- controle do que foi recebido e do que permanece pendente.

### Locais

Cada usuário deve poder criar, editar e excluir seus próprios locais.

A evolução do cadastro prevê também informações relacionadas à regra de pagamento do local, para que o recebimento possa ser acompanhado de forma mais inteligente.

### Pagamentos

Os meios de pagamento aceitos pelo produto devem permanecer flexíveis, incluindo:

- transferência bancária;
- PIX;
- dinheiro;
- outros meios informados pelo usuário.

O sistema deve registrar o pagamento sem obrigar o usuário a utilizar um provedor de pagamento específico.

### Recorrências

Ao excluir uma repetição, o usuário deve escolher claramente entre:

1. somente este;
2. este e próximos;
3. toda a repetição;
4. cancelar.

Essa decisão é parte da regra de produto e deve ser preservada em futuras refatorações.

### Espaços compartilhados

A ideia de **Espaços** é permitir contextos como residência, clínica, viagem, evento ou outro grupo de interesse.

A evolução prevista inclui:

- criação de espaço;
- convite de participantes;
- permissões por participante;
- despesas compartilhadas;
- visão de saldos e responsabilidades;
- separação entre dados pessoais e dados compartilhados.

O modelo de privacidade deve seguir uma regra simples: o usuário só visualiza dados pessoais próprios e dados compartilhados dos espaços dos quais participa.

## Arquitetura atual

O projeto ainda é uma aplicação web estática em processo de modularização. O estado real do repositório é mais próximo desta estrutura:

```text
FinancPlantões
├── index.html                 # shell principal e interface
├── app.js                     # inicialização, sessão e dados principais
├── supabase-config.js         # configuração pública do Supabase
├── calendar.js                # calendário
├── locations-flow.js          # fluxo de locais
├── shift-flow.js              # fluxo de plantões
├── recurrence-engine.js       # recorrências
├── space-flow-v2.js           # fluxo de espaços
├── finance-actions-core.js    # ações financeiras
├── dashboard-compat.js        # compatibilidade do dashboard
├── dom-guard.js               # proteções/interações de DOM
├── app-stability-v3.js        # estabilidade e compatibilidade
├── auth-guard.js              # proteção de autenticação
├── auth-recovery.js           # legado/recovery; não deve duplicar o cliente Auth
├── logout.js                  # legado; não deve criar outro cliente Supabase
├── service-worker.js          # PWA/cache de assets estáticos
├── manifest.json
├── icons/
├── css/
├── database/
├── docs/
└── supabase-schema.sql
```

### Regra crítica de autenticação

O navegador deve possuir **uma única instância de `GoTrueClient`/Supabase Client para a aplicação**. Criar clientes concorrentes usando a mesma chave de armazenamento pode causar comportamento indefinido.

O `app.js` é o ponto principal responsável pelo cliente atualmente. Arquivos auxiliares não devem criar uma segunda instância.

### Service Worker

O Service Worker foi ajustado para não transformar os arquivos dinâmicos do aplicativo em uma cópia antiga do sistema. HTML, JavaScript e CSS devem ser buscados pela rede; o cache fica restrito a assets estáticos.

Isso é importante durante a evolução do projeto porque impede que uma versão antiga de `app.js` ou outro módulo continue sendo executada por causa de cache.

## Segurança

O Supabase Auth identifica o usuário e o PostgreSQL aplica Row Level Security.

```text
Usuário
   ↓
Supabase Auth
   ↓
Sessão única no frontend
   ↓
Supabase PostgreSQL
   ↓
RLS: auth.uid() = user_id
```

A chave pública (`anon`/publishable) pode ser utilizada no frontend. **Nunca** publicar `service_role` ou outra credencial privada no código do navegador.

## Banco de dados

O banco utiliza, entre outras, entidades para:

- `locations`;
- `shifts`;
- `settings`;
- `push_subscriptions`;
- estruturas de recorrência;
- estruturas financeiras e de espaços em evolução.

A tabela `locations` utiliza `id` como chave primária. O frontend também deve gerar identificadores quando apropriado, enquanto o banco pode possuir um valor padrão para evitar registros sem ID.

## UX e princípios de design

O produto deve privilegiar:

1. **Velocidade:** cadastrar um plantão precisa ser mais rápido que abrir uma planilha.
2. **Clareza financeira:** o usuário deve entender rapidamente quanto tem a receber, quanto já recebeu e o que está pendente.
3. **Calendário como centro da rotina:** a agenda deve ser visual, legível e não pode travar a aplicação.
4. **Ações óbvias:** botões como `+ Plantão`, `+ Local` e `+ Espaço` precisam ter comportamento imediato e previsível.
5. **Pouca fricção:** evitar telas e confirmações desnecessárias.
6. **Privacidade:** dados individuais nunca devem vazar para outro usuário.
7. **Colaboração explícita:** dados compartilhados devem mostrar claramente quem participa e quais permissões possui.
8. **Mobile first:** profissionais de saúde frequentemente acessam o sistema em deslocamento ou entre atendimentos.
9. **Estabilidade antes de novas funcionalidades:** uma funcionalidade nova não deve ser considerada pronta se causar regressão em login, calendário ou dados existentes.

## Roadmap

### P0 — Recuperação e estabilidade

- [x] Supabase Auth;
- [x] RLS por usuário;
- [x] cliente Supabase único no fluxo principal;
- [x] remoção do cache agressivo de arquivos dinâmicos pelo Service Worker;
- [ ] validar login/logout em navegador limpo;
- [ ] validar ausência de `Multiple GoTrueClient instances`;
- [ ] validar recuperação de sessão sem reload infinito;
- [ ] validar calendário sem congelamento;
- [ ] validar CRUD de locais;
- [ ] validar CRUD de plantões;
- [ ] validar espaços;
- [ ] validar isolamento entre duas contas.

### P1 — Experiência central

- [ ] calendário rápido e responsivo;
- [ ] cadastro de plantão em poucos passos;
- [ ] edição simples de locais;
- [ ] regras de recebimento por local;
- [ ] visão de recebidos x pendentes;
- [ ] filtros por período/local;
- [ ] recorrências com exclusão granular;
- [ ] melhorias mobile/PWA.

### P2 — Financeiro e colaboração

- [ ] recebíveis estruturados;
- [ ] despesas recorrentes;
- [ ] Espaços com convites e permissões;
- [ ] despesas compartilhadas;
- [ ] saldos por espaço;
- [ ] registro de pagamentos em dinheiro, PIX, transferência ou outros;
- [ ] simplificação de saldos entre participantes;
- [ ] relatórios financeiros mais completos.

### P3 — Produto rentável

- [ ] métricas de uso e estabilidade;
- [ ] onboarding simples;
- [ ] diferenciação clara entre plano gratuito e recursos premium;
- [ ] backup/sincronização confiáveis;
- [ ] notificações úteis;
- [ ] testes automatizados dos fluxos críticos;
- [ ] monitoramento de erros;
- [ ] estratégia de monetização antes de escalar funcionalidades.

## Desenvolvimento local

Como o projeto usa JavaScript e recursos web, recomenda-se um servidor HTTP local:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Checklist de regressão

Antes de considerar uma alteração pronta:

- [ ] abrir o aplicativo sem reload/reboot;
- [ ] sessão persistente funcionar;
- [ ] login funcionar;
- [ ] logout funcionar;
- [ ] nenhum `Multiple GoTrueClient instances` no console;
- [ ] calendário renderizar uma única vez e permanecer responsivo;
- [ ] adicionar/editar/excluir local;
- [ ] adicionar/editar/excluir plantão;
- [ ] recorrência preservar as opções de exclusão;
- [ ] criar/editar espaço;
- [ ] dados continuarem isolados por usuário;
- [ ] testar em desktop e mobile;
- [ ] verificar cache/Service Worker após alterações de frontend.

## Referências de produto

- [Plantãozinho — site oficial](https://plantaozinho.com/)
- [Splitwise — site oficial](https://www.splitwise.com/)

Essas referências são usadas somente para benchmarking de experiência, organização de fluxos e ideias de produto. O objetivo é desenvolver uma identidade própria para o FinancPlantões.

## Licença

Projeto proprietário em desenvolvimento. Definir a licença de distribuição antes de qualquer publicação como software open source.
