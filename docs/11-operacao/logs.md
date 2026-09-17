# Logs

Status: PARCIALMENTE IMPLEMENTADA

## Logs identificados

O backend usa `morgan`, o que registra requisicoes HTTP.

## Boas praticas

- Nao registrar tokens, senhas ou valores de `.env`.
- Evitar dados financeiros detalhados em logs.
- Registrar erros com codigo, contexto minimo e request id quando possivel.
- Definir prazo de retencao de logs.

## Pendencia

Nao foi identificado padrao estruturado de logs ou correlacao de requisicoes.
