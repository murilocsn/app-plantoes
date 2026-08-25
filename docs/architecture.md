# Arquitetura do FinancPlantões — Foundation v1

## Objetivo

Esta branch inicia a reorganização estrutural sem substituir a aplicação atual de uma vez. A `main` continua sendo a referência de produção.

## Estado atual

```text
index.html
  ├── HTML
  ├── CSS
  ├── JavaScript legado
  └── navegação/relatórios

Camada nova (adoção incremental)
  └── módulos JS independentes

Supabase
  ├── locations
  ├── shifts
  ├── settings
  ├── recurrences
  └── payments
```

## Direção da refatoração

A aplicação será migrada gradualmente para módulos independentes:

```text
js/
  core/
    supabase.js     # fronteira única do cliente Supabase
    auth.js         # autenticação
    utils.js        # formatação e utilidades compartilhadas
  shifts.js         # operações de plantões
  locations.js      # operações de locais
  recurrences.js    # regras de recorrência
  finance.js        # pagamentos e indicadores financeiros
  settings.js       # preferências e meta financeira
  reports.js        # relatórios
  notifications.js  # notificações
```

Os módulos de dados desta etapa são deliberadamente independentes da UI. Isso permite testar e migrar uma tela por vez, sem substituir o `index.html` inteiro.

O frontend continuará sendo estático e compatível com GitHub Pages. Não há necessidade de migrar para React/Next.js nesta etapa.

## Modelo de dados alvo

```text
User (Supabase Auth)
   │
   ├── locations
   │      │
   │      └── shifts
   │             │
   │             └── payments
   │
   ├── recurrences
   │
   └── settings
```

### Entidades

- `locations`: locais de trabalho do usuário.
- `shifts`: plantões efetivamente registrados.
- `recurrences`: regra que pode gerar uma série de plantões.
- `payments`: estado financeiro associado a um plantão.
- `settings`: meta mensal e preferências do usuário.

## Segurança

Todas as novas tabelas usam RLS e validam `auth.uid() = user_id` em leitura e escrita. As consultas da camada JavaScript não tentam substituir o isolamento do banco; elas dependem das policies do Supabase.

Nenhuma credencial privada deve ser colocada no frontend.

## Migração incremental

1. Criar e revisar o modelo no SQL. **Concluído na branch.**
2. Aplicar a migration no projeto Supabase. **Pendente de execução no ambiente do usuário.**
3. Validar RLS com duas contas diferentes.
4. Criar camada de acesso JavaScript. **Concluído para shifts, locations, recurrences, payments e settings.**
5. Integrar um módulo por vez à UI existente.
6. Remover código duplicado somente depois dos testes.

## Regra de compatibilidade

Durante a transição, não alterar `shifts`, `locations` ou `settings` existentes de maneira destrutiva. A aplicação atual deve continuar funcionando enquanto cada módulo é migrado.

## Regra para a próxima etapa

Antes de alterar a UI, os módulos devem continuar sem segredos, sem estado global novo e sem depender de frameworks. A integração com o `index.html` deve ser pequena e reversível.
