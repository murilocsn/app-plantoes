# Manual do administrador

Status: PARCIALMENTE IMPLEMENTADA

## Responsabilidades

- Manter variaveis de ambiente seguras.
- Monitorar API e banco.
- Aplicar migrations com backup.
- Controlar deploys.
- Revisar logs sem expor dados sensiveis.
- Gerenciar publicacao mobile quando aplicavel.

## Checklist operacional

1. Verificar `/health`.
2. Conferir Supabase Auth e banco.
3. Confirmar `WEB_ORIGIN` correto.
4. Conferir Edge Function de lembretes.
5. Rodar testes antes de release.
6. Registrar mudancas relevantes no changelog.

## Limitacao

Nao foi identificado painel administrativo interno formal para administradores globais.
