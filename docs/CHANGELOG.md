# Changelog

Todas as mudancas relevantes de documentacao, arquitetura e produto devem ser registradas aqui.

## 2026-09-18

### Adicionado

- Botao `Enviar teste` no controle de lembretes push para validar notificacao diretamente no aparelho.
- Runbook operacional de lembretes push em `docs/11-operacao/lembretes-push.md`.

### Alterado

- Cron de lembretes documentado de forma tecnica para execucao a cada 5 minutos com header `x-cron-secret`.
- Troubleshooting e deploy atualizados com as validacoes de VAPID, Vault, Edge Function e cron.
- `.env.example` ajustado para usar placeholders em vez de valores reais/publicaveis.

## 2026-09-17

### Adicionado

- Estrutura profissional de documentacao em `docs`.
- Documentacao de produto, requisitos, arquitetura, banco, API, seguranca, LGPD, instalacao, deploy, testes, operacao, manuais, comercial, governanca e roadmap.
- Contrato inicial OpenAPI em `docs/05-api/openapi.yaml`.

### Observacoes

- Documentacao criada a partir do codigo-fonte e arquivos existentes no repositorio.
- Pontos nao confirmados foram marcados explicitamente como `NAO CONFIRMADA`, `PARCIALMENTE IMPLEMENTADA`, `PLANEJADA` ou `LEGACY`.
