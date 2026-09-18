# Monitoramento

Status: PARCIALMENTE IMPLEMENTADA

## Itens existentes

- Health check `/health`.
- Logs HTTP com `morgan` no backend.
- Render pode fornecer logs e status do servico.

## Itens recomendados

- Alertas de indisponibilidade.
- Monitoramento de erros 5xx.
- Alertas de falha em Edge Function.
- Monitoramento de entregas push.
- Painel de uptime.
- Rotina de auditoria de dependencias.

## Lembretes push

O runbook operacional dos alertas de plantao fica em:

- [lembretes-push.md](lembretes-push.md)
