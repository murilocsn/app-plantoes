# Autenticacao e autorizacao

Status: IMPLEMENTADA

## Autenticacao

O login e feito com Supabase Auth. A API recebe o token JWT e valida a sessao antes de permitir acesso a `/api`.

## Autorizacao

A autorizacao no backend usa o `user.id` autenticado para filtrar dados. No banco, policies RLS complementam o isolamento quando aplicadas.

## Pontos pendentes

| Ponto | Status | Recomendacao |
| --- | --- | --- |
| Teste de acesso cruzado entre usuarios | NAO CONFIRMADA | Criar testes automatizados. |
| Revisao das policies em producao | NAO CONFIRMADA | Auditar Supabase real. |
| Perfil administrador global | NAO CONFIRMADA | Documentar se existir regra operacional fora do codigo. |
