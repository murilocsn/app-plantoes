# Codigos de erro

Status: PARCIALMENTE IMPLEMENTADA

## Erros identificados

| Codigo | HTTP | Origem | Descricao |
| --- | --- | --- | --- |
| `AUTH_REQUIRED` | 401 | Middleware auth | Token ausente ou sessao nao encontrada. |
| `AUTH_INVALID` | 401 | Middleware auth | Token invalido. |
| `NOT_FOUND` | 404 | Rotas | Registro nao encontrado. |
| `VALIDATION_ERROR` | 400 | Validacao | Entrada invalida. |
| `CONFLICT` | 409 | Regras de plantao | Conflito de horario. |

## Padrao

A API tende a retornar objetos JSON com campo de erro. O contrato completo deve ser estabilizado em testes e OpenAPI antes de integracao publica.
