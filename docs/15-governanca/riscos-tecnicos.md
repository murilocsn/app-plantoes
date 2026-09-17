# Riscos tecnicos

Status: PARCIALMENTE IMPLEMENTADA

| Risco | Severidade | Status | Mitigacao |
| --- | --- | --- | --- |
| Backup nao formalizado | ALTA | NAO CONFIRMADA | Criar runbook e testar restore. |
| RLS nao auditado em producao | ALTA | NAO CONFIRMADA | Revisar Supabase real. |
| Publicacao mobile incompleta | MEDIA | PARCIALMENTE IMPLEMENTADA | Finalizar builds assinados. |
| Lembretes push dependem de cron/segredos | MEDIA | PARCIALMENTE IMPLEMENTADA | Monitorar Edge Function. |
| Fluxos compartilhados parciais | MEDIA | PARCIALMENTE IMPLEMENTADA | Completar regras de permissao. |
| Legacy no repositorio | BAIXA | LEGACY | Manter isolado e nao evoluir sem plano. |
