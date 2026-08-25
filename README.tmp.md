# FinancPlantões — documentação de arquitetura

> Documento auxiliar criado durante a reorganização do projeto. O README principal será atualizado na próxima alteração com o SHA atual do arquivo.

## Estado

O projeto está em desenvolvimento ativo. A autenticação usa Supabase Auth e os dados são protegidos por Row Level Security (RLS), com `auth.uid() = user_id`.

## Arquitetura em evolução

```text
index.html
  └── migração incremental

js/
  core/
    supabase.js
    auth.js
    router.js
  shifts.js
  locations.js
  finance.js
  reports.js
  notifications.js
```

## Próximas etapas

1. Integrar o router ao fluxo principal do `index.html`.
2. Extrair operações de plantões, locais, relatórios e notificações.
3. Criar as entidades `payments` e `recurrences`.
4. Adicionar testes de autenticação, RLS e regressão.
5. Revisar a experiência mobile/PWA.

Este arquivo é temporário e deve ser removido depois da atualização do README principal.