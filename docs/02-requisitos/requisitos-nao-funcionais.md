# Requisitos nao funcionais

## RNF-001 - Seguranca de autenticacao

Endpoints sob `/api` exigem bearer token Supabase. Evidencia: `apps/api/src/middleware/auth.ts`. Status: IMPLEMENTADA.

## RNF-002 - Isolamento por usuario

Rotas filtram por `request.auth.user.id` e migrations definem RLS. Status: PARCIALMENTE IMPLEMENTADA, pois a aplicacao real das migrations em producao deve ser validada.

## RNF-003 - Responsividade

Estilos responsivos e testes Playwright mobile existem. Evidencia: `responsive.css`, `playwright.config.ts`. Status: IMPLEMENTADA.

## RNF-004 - Observabilidade

Ha logs HTTP via `morgan` e health check. Nao ha APM/alertas confirmados. Status: PARCIALMENTE IMPLEMENTADA.

## RNF-005 - Portabilidade mobile

Capacitor Android/iOS existe. Publicacao em loja nao confirmada. Status: PARCIALMENTE IMPLEMENTADA.

## RNF-006 - Backup

Nao foi identificada estrategia de backup automatizado no repositorio. Status: NAO CONFIRMADA.
