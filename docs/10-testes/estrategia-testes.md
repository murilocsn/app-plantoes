# Estrategia de testes

Status: IMPLEMENTADA

## Camadas

| Camada | Ferramenta | Status |
| --- | --- | --- |
| Unidade | Vitest | IMPLEMENTADA |
| Integracao API | Vitest/Supertest ou chamadas internas | IMPLEMENTADA |
| E2E | Playwright | IMPLEMENTADA |
| Mobile nativo | Android/iOS tooling | PARCIALMENTE IMPLEMENTADA |
| Seguranca/RLS | Nao identificado dedicado | NAO CONFIRMADA |

## Recomendacao

Manter testes unitarios para regras de calendario/plantao e ampliar testes de acesso multiusuario antes da comercializacao.
