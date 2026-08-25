# Arquitetura do FinancPlantões — Foundation v1

## Objetivo

Esta branch inicia a reorganização estrutural sem substituir a aplicação atual de uma vez. A `main` continua sendo a referência de produção.

## Estado atual

```text
index.html
  ├── HTML
  ├── CSS
  ├── JavaScript
  ├── Supabase Auth
  ├── operações de plantões
  └── navegação/relatórios

Supabase
  ├── locations
  ├── shifts
  └── settings
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
  finance.js        # pagamentos e indicadores financeiros
  reports.js        # relatórios
  notifications.js  # notificações
```

O frontend continuará sendo estático e compatível com GitHub Pages. Não há necessidade de migrar para React/Next.js nesta etapa.

## Modelo de dados alvo

```text
User (Supabase Auth)
   │
   ├── locations
   │
   ├── shifts ────────── payments
   │
   ├── recurrences ─────┘
   │
   └── settings
```

### Novas entidades desta etapa

- `recurrences`: representa a regra de recorrência, em vez de guardar toda a regra apenas nos plantões gerados.
- `payments`: separa o fato de um plantão existir do fato de ele ter sido pago.

## Segurança

Todas as novas tabelas usam RLS e validam `auth.uid() = user_id` em leitura e escrita. Nenhuma credencial privada deve ser colocada no frontend.

## Migração incremental

1. Criar e revisar o modelo no SQL.
2. Aplicar a migration no projeto Supabase.
3. Validar RLS com duas contas diferentes.
4. Criar camada de acesso JavaScript.
5. Migrar operações existentes uma área por vez.
6. Remover código duplicado somente depois dos testes.

## Regra de compatibilidade

Durante a transição, não alterar `shifts`, `locations` ou `settings` existentes de maneira destrutiva. A aplicação atual deve continuar funcionando enquanto cada módulo é migrado.
