# Riscos de seguranca

Status: PARCIALMENTE IMPLEMENTADA

| Risco | Severidade | Status | Mitigacao recomendada |
| --- | --- | --- | --- |
| Segredos expostos em repositorio ou prints | ALTA | PARCIALMENTE IMPLEMENTADA | Manter `.env*` fora do Git, rotacionar chaves suspeitas. |
| RLS divergente em producao | ALTA | NAO CONFIRMADA | Auditar policies diretamente no Supabase. |
| Ausencia de rate limit | MEDIA | NAO CONFIRMADA | Adicionar limitacao por IP/usuario na API publica. |
| Monitoramento insuficiente | MEDIA | PARCIALMENTE IMPLEMENTADA | Configurar alertas de erro e disponibilidade. |
| Dependencias vulneraveis | MEDIA | NAO CONFIRMADA | Rodar auditoria periodica. |
| Fluxos compartilhados parciais | MEDIA | PARCIALMENTE IMPLEMENTADA | Completar regras de membros, convites e permissoes. |
