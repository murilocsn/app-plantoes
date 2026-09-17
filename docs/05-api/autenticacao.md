# Autenticacao da API

Status: IMPLEMENTADA

A API usa tokens do Supabase Auth no header HTTP:

```http
Authorization: Bearer <access_token>
```

## Fluxo

1. O usuario autentica no frontend com Supabase.
2. O frontend envia o token para a API.
3. `requireAuth` valida o token com Supabase.
4. A API popula `req.user`.
5. Rotas protegidas usam `user.id` para filtrar dados.

## Erros principais

| Codigo | Quando ocorre |
| --- | --- |
| `AUTH_REQUIRED` | Header ausente ou sessao nao encontrada. |
| `AUTH_INVALID` | Token invalido, expirado ou rejeitado pelo Supabase. |

## Atencao

Tokens e chaves reais nunca devem aparecer em documentacao, prints, commits ou logs publicos.
