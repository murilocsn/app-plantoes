# Tratamento de segredos

Status: PARCIALMENTE IMPLEMENTADA

## Regra

Nenhum segredo real deve ser commitado, documentado ou exibido em conversas/logs.

## Segredos esperados

- Supabase service role.
- Supabase publishable key quando aplicavel.
- VAPID private key.
- Cron secret.
- Deploy hooks.
- URLs de banco ou tokens de plataforma.

## Boas praticas

1. Usar `.env` apenas localmente.
2. Manter `.env*` no `.gitignore`.
3. Usar painel seguro de Render/Supabase para producao.
4. Rotacionar qualquer chave que possa ter sido exposta.
5. Documentar nomes das variaveis, nunca os valores.
