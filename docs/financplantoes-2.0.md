# FinancPlantões 2.0 — Arquitetura funcional e de dados

## Objetivo

Evoluir o FinancPlantões de uma agenda pessoal de plantões para uma plataforma de gestão profissional e financeira para profissionais de saúde, combinando:

- agenda e recorrência de plantões;
- locais de trabalho e regras de pagamento;
- contas a receber e previsão de recebimentos;
- despesas pessoais;
- Espaços compartilhados para residência, clínica, viagem, evento e equipe;
- membros, convites e permissões por Espaço;
- despesas compartilhadas, divisão e acertos;
- dashboards e fluxo financeiro consolidado.

A versão 2.0 deve preservar o isolamento por usuário já validado no MVP e evitar alterações destrutivas no banco existente.

## Princípios

1. **Usuário é dono dos próprios dados.**
2. **Espaço é uma unidade compartilhada de colaboração.**
3. **Permissão é explícita e nunca inferida pelo frontend.**
4. **Recorrência é uma entidade própria; ocorrências são independentes.**
5. **Plantão e recebível são entidades relacionadas, mas não são a mesma coisa.**
6. **Despesa compartilhada não altera diretamente o saldo do plantão.**
7. **RLS é a última barreira de segurança.**
8. **Nenhuma migração 2.0 deve apagar dados do MVP sem migração e validação prévias.**

## Modelo de domínio

```text
profiles
  │
  ├── locations
  │      └── payment_rules
  │
  ├── recurrences
  │      └── shifts
  │             └── receivables
  │
  ├── personal_expenses
  │
  └── spaces
         ├── space_members
         ├── space_invitations
         ├── expenses
         │      └── expense_splits
         └── settlements
```

## Entidades

### profiles

Extensão do usuário autenticado para dados não sensíveis de apresentação.

- id = auth.users.id
- display_name
- avatar_url opcional
- created_at
- updated_at

Autorização nunca deve depender de `user_metadata`; papéis e permissões de acesso devem ser dados relacionais no banco.

### locations

Local onde o profissional realiza plantões.

- id
- owner_id
- name
- type: hospital, clinic, residence, other
- city
- state
- address opcional
- default_value opcional
- notes
- active
- created_at
- updated_at

### payment_rules

Regra padrão para previsão de pagamento de um local.

- id
- location_id
- owner_id
- rule_type: days_after_shift, fixed_day_of_month, end_of_month, custom
- days_after_shift opcional
- payment_day opcional
- reference_mode
- active
- created_at
- updated_at

A regra deve ser copiada/interpretada ao criar o recebível, para que uma alteração futura na regra do local não reescreva historicamente recebíveis já gerados.

### recurrences

Representa a regra de repetição, não as ocorrências.

- id
- owner_id
- frequency: daily, weekly, biweekly, monthly, custom
- interval_value
- start_date
- end_date opcional
- max_occurrences opcional
- timezone
- active
- created_at
- updated_at

### shifts

Cada ocorrência é um registro independente.

- id
- owner_id
- recurrence_id opcional
- location_id opcional
- date
- start_time
- duration
- location_name_snapshot
- value
- status: scheduled, completed, cancelled
- notes
- created_at
- updated_at

`location_name_snapshot` preserva o histórico mesmo se o local for renomeado.

### receivables

Representa dinheiro que o profissional espera receber por um plantão ou outra origem.

- id
- owner_id
- shift_id opcional
- location_id opcional
- description
- amount
- expected_date
- received_date opcional
- status: expected, overdue, received, cancelled
- payment_method opcional
- notes
- created_at
- updated_at

O recebível deve guardar a previsão calculada no momento da geração. Não deve depender apenas da regra atual do local.

### personal_expenses

Despesas que pertencem somente ao usuário.

- id
- owner_id
- description
- category
- amount
- due_date opcional
- paid_at opcional
- status
- notes
- created_at
- updated_at

### spaces

Unidade compartilhada criada por um usuário.

Exemplos: residência, clínica, viagem, evento, equipe, congresso.

- id
- owner_id
- name
- type
- description
- currency
- status
- created_at
- updated_at

### space_members

Relaciona usuários a Espaços.

- id
- space_id
- user_id
- role: owner, admin, finance, member, viewer
- status: invited, active, removed
- joined_at
- created_at
- updated_at

O owner também deve existir como membro para simplificar autorização.

### space_invitations

Convites para participação em um Espaço.

- id
- space_id
- invited_by
- invited_user_id opcional
- invited_email opcional
- proposed_role
- status: pending, accepted, declined, expired, revoked
- expires_at
- created_at
- responded_at opcional

### expenses

Despesa compartilhada de um Espaço.

- id
- space_id
- created_by
- paid_by
- description
- category
- amount
- expense_date
- split_method: equal, exact, percentage, selected
- notes
- created_at
- updated_at

### expense_splits

Participação individual em uma despesa.

- id
- expense_id
- user_id
- amount
- percentage opcional
- status: owed, settled, waived
- created_at
- updated_at

### settlements

Registro de acerto entre membros.

- id
- space_id
- payer_id
- payee_id
- amount
- settlement_date
- method opcional
- notes
- created_by
- created_at

## Permissões dos Espaços

| Ação | Owner | Admin | Finance | Member | Viewer |
|---|---:|---:|---:|---:|---:|
| Ver Espaço | ✓ | ✓ | ✓ | ✓ | ✓ |
| Editar Espaço | ✓ | ✓ | — | — | — |
| Convidar membros | ✓ | ✓ | — | — | — |
| Remover membros | ✓ | ✓ | — | — | — |
| Alterar permissões | ✓ | ✓ | — | — | — |
| Criar despesa | ✓ | ✓ | ✓ | ✓ | — |
| Editar despesa | ✓ | ✓ | ✓ | própria* | — |
| Registrar acerto | ✓ | ✓ | ✓ | ✓ | — |
| Excluir despesa | ✓ | ✓ | ✓ | própria* | — |

`*` A política final deve restringir edição/exclusão de uma despesa criada pelo próprio membro quando aplicável. O owner/admin sempre mantém controle administrativo.

## Recorrências — regra de segurança

Nunca executar um `delete` ou `update` em massa apenas porque registros compartilham `recurrence_id`.

A UI deverá apresentar explicitamente:

- Somente esta ocorrência
- Esta e as próximas
- Toda a recorrência
- Cancelar

A mesma regra vale para edição.

A implementação deve permitir que uma ocorrência seja cancelada ou alterada sem destruir as demais.

## Fluxo de recebíveis

```text
Criar/confirmar plantão
        ↓
Local possui payment_rule?
   ┌────┴────┐
  sim       não
   ↓          ↓
calcular    usuário define
previsão    manualmente
   └────┬────┘
        ↓
   receivable
        ↓
 expected_date
        ↓
 expected → overdue → received
```

O dashboard deverá separar:

- recebido;
- a receber;
- atrasado;
- previsão por período;
- previsão por local.

## RLS — estratégia

Todas as tabelas expostas no schema público devem ter RLS habilitado.

### Dados pessoais

`owner_id = auth.uid()`.

Aplicável a:

- locations
- payment_rules
- recurrences
- shifts
- receivables
- personal_expenses

### Dados compartilhados

Acesso baseado em `space_members`.

Exemplo conceitual:

```text
user → space_members → space → expenses
```

Um usuário só acessa dados de um Espaço se possuir membro ativo naquele Espaço.

Operações administrativas devem exigir role apropriada na própria tabela de membros. A autorização não deve ser feita apenas em JavaScript.

## Migração do MVP

O banco atual possui `locations`, `shifts` e `settings`. Essas tabelas devem ser preservadas inicialmente.

Estratégia:

1. criar novas tabelas 2.0 sem apagar as atuais;
2. adicionar colunas de compatibilidade quando necessário;
3. migrar dados existentes para o novo modelo;
4. validar contagens, valores e usuários;
5. alterar o frontend gradualmente;
6. manter compatibilidade durante a transição;
7. somente depois remover campos/tabelas obsoletos.

## Fases de implementação

### Fase 1 — Fundação

- corrigir recorrência;
- finalizar router;
- criar profiles;
- criar recurrences;
- ajustar shifts;
- criar payment_rules;
- criar receivables;
- RLS e índices;
- testes de isolamento.

### Fase 2 — Financeiro

- previsão de recebimento;
- contas a receber;
- status de pagamento;
- dashboard financeiro;
- filtros por local/período/status.

### Fase 3 — Espaços

- spaces;
- invitations;
- members;
- roles;
- telas de criação/convite/gestão.

### Fase 4 — Despesas compartilhadas

- expenses;
- expense_splits;
- divisão igual/exata/percentual/selecionada;
- saldos;
- settlements.

### Fase 5 — Integração

- plantão → recebível;
- recebível → dashboard;
- espaço → despesas;
- despesas → saldo individual;
- notificações;
- relatórios e exportações.

## Critérios de aceite 2.0

- Um usuário nunca visualiza plantões, locais, recebíveis ou despesas pessoais de outro usuário.
- Um membro só visualiza Espaços dos quais participa.
- Permissões são aplicadas pelo banco, não apenas pelo frontend.
- Excluir uma ocorrência recorrente nunca apaga outra ocorrência sem escolha explícita.
- Alterar uma regra de pagamento não altera recebíveis históricos.
- Um recebível pode ser marcado como recebido sem alterar o valor histórico do plantão.
- Uma despesa compartilhada gera participações individuais rastreáveis.
- Acertos reduzem saldos sem apagar o histórico da despesa.
- Migrações não destroem dados existentes.
