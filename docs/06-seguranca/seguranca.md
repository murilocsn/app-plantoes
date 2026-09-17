# Seguranca

Status: PARCIALMENTE IMPLEMENTADA

## Controles identificados

| Controle | Status | Evidencia |
| --- | --- | --- |
| Autenticacao via Supabase | IMPLEMENTADA | `AuthContext.tsx`, `middleware/auth.ts` |
| API protegida por bearer token | IMPLEMENTADA | Prefixo `/api` em `app.ts` |
| Validacao de entrada | IMPLEMENTADA | Zod e validacoes nas rotas |
| RLS em migrations | PARCIALMENTE IMPLEMENTADA | SQL em `database/migrations` |
| Headers de seguranca | IMPLEMENTADA | `helmet` no backend |
| CORS configuravel | IMPLEMENTADA | `WEB_ORIGIN` |
| Segredos por ambiente | PARCIALMENTE IMPLEMENTADA | Uso de env vars; valores reais nao auditados |

## Riscos principais

- Validar que nenhuma chave privada esteja versionada.
- Confirmar RLS ativo no Supabase real.
- Criar testes de autorizacao entre usuarios.
- Formalizar backup, rollback e resposta a incidentes.
