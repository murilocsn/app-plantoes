# FinancPlantões

Sistema web multiusuário para profissionais de saúde registrarem plantões, locais de trabalho, horários, duração e valores, com dados sincronizados online por conta de usuário.

## Status

🚧 **MVP funcional em evolução ativa**

O sistema já possui autenticação, isolamento de dados por usuário, calendário, locais, recorrência, relatórios financeiros, exportação CSV e recursos PWA. A arquitetura está sendo migrada gradualmente de um `index.html` monolítico para módulos independentes.

## Principais funcionalidades

- Cadastro e login por usuário com Supabase Auth
- Dados isolados por usuário com PostgreSQL + Row Level Security (RLS)
- Cadastro, edição e exclusão de plantões
- Cadastro de locais/unidades
- Calendário mensal
- Plantões diurnos e noturnos
- Plantões recorrentes
- Cálculo de duração e valores
- Meta financeira e indicadores
- Relatórios por período
- Exportação CSV
- PWA instalável
- Estrutura para notificações push e lembretes

## Arquitetura atual

A aplicação continua compatível com hospedagem estática, mas está em processo de modularização.

```text
FinancPlantões
│
├── index.html
│   └── interface e legado em migração
│
├── js/
│   └── core/
│       ├── supabase.js   # fronteira única do cliente Supabase
│       ├── auth.js       # sessão e autenticação
│       └── router.js     # rotas e proteção de navegação
│
├── docs/
│   └── architecture.md
│
├── icons/
├── manifest.json
├── service-worker.js
├── supabase-schema.sql
└── cron-schedule.sql
```

### Rotas planejadas/protegidas

```text
#/login       público
#/app          protegido
#/calendar     protegido
#/locations    protegido
#/report       protegido
```

O router controla a navegação e a apresentação das views. Ele **não substitui o RLS**: a segurança real dos dados continua sendo aplicada no banco.

## Autenticação e segurança

O fluxo de autenticação utiliza Supabase Auth. As operações protegidas devem ocorrer com uma sessão válida.

As tabelas de dados utilizam Row Level Security e políticas baseadas em `auth.uid() = user_id`, impedindo que um usuário autenticado consulte ou modifique registros pertencentes a outra conta.

```text
Usuário
   ↓
Supabase Auth
   ↓
Sessão
   ↓
Frontend / Router
   ↓
Supabase PostgreSQL
   ↓
RLS: auth.uid() = user_id
```

A chave pública do Supabase pode estar no frontend. **Nunca** coloque uma `service_role` key ou qualquer credencial privada no código publicado.

## Banco de dados

As entidades principais atualmente utilizadas pelo aplicativo incluem:

- `locations`
- `shifts`
- `settings`
- `push_subscriptions`

Evoluções planejadas:

- `payments` — controle de pagamentos recebidos/pendentes
- `recurrences` — regras independentes de recorrência

O arquivo `supabase-schema.sql` documenta a estrutura inicial do banco.

## PWA e notificações

O projeto possui `manifest.json`, `service-worker.js` e ícones para instalação como PWA.

O recurso de lembretes utiliza uma combinação de Push API, assinatura do dispositivo, Supabase e Edge Function. A configuração detalhada de VAPID e agendamento deve ser feita conforme a documentação existente no projeto antes de considerar o recurso pronto para produção.

## Tecnologias

- HTML5
- CSS3
- JavaScript ES Modules
- Supabase Auth
- Supabase PostgreSQL
- Row Level Security (RLS)
- PWA / Service Worker
- GitHub Pages

## Desenvolvimento local

Como o projeto utiliza módulos JavaScript, recomenda-se executar um servidor HTTP local.

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000`.

## Roadmap

### P0 — Fundação e regressão

- [x] Supabase Auth
- [x] RLS por usuário
- [x] Camada `supabase.js`
- [x] Camada `auth.js`
- [x] Primeiro router protegido
- [x] Remover arquivo temporário de documentação
- [ ] Integrar definitivamente o router ao fluxo principal do `index.html`
- [ ] Validar login e logout sem regressões
- [ ] Testar isolamento entre duas contas
- [ ] Testar criação, edição e exclusão de plantões
- [ ] Testar calendário após autenticação
- [ ] Atualizar e validar documentação final

### P1 — Modularização

- [ ] Extrair `shifts.js`
- [ ] Extrair `locations.js`
- [ ] Extrair `reports.js`
- [ ] Criar camada de acesso a dados
- [ ] Remover gradualmente código duplicado do `index.html`

### P2 — Evolução do produto

- [ ] Criar `payments`
- [ ] Criar `recurrences`
- [ ] Melhorar notificações
- [ ] Criar testes automatizados
- [ ] Melhorar observabilidade e tratamento de erros

## Princípios do projeto

1. **Segurança primeiro:** Auth + RLS são obrigatórios para dados de usuário.
2. **Migração incremental:** não substituir o aplicativo funcional inteiro de uma vez.
3. **Separação de responsabilidades:** novas funcionalidades devem ser módulos independentes.
4. **Compatibilidade:** manter a possibilidade de hospedagem estática durante a evolução.
5. **Dados por usuário:** uma conta nunca deve acessar dados de outra conta.
6. **Testabilidade:** cada etapa da migração deve preservar os fluxos existentes.

## Critério para considerar o MVP pronto para produção

Antes de abrir o sistema para usuários reais, devemos concluir o P0 e validar pelo menos:

- autenticação e logout;
- recuperação de sessão;
- isolamento entre usuários;
- CRUD de plantões;
- calendário;
- locais;
- relatórios;
- comportamento mobile/PWA;
- tratamento de erros de rede;
- políticas RLS;
- ausência de credenciais privadas no frontend.

## Licença

Projeto em desenvolvimento. Definir a licença antes de distribuir o código como software open source.