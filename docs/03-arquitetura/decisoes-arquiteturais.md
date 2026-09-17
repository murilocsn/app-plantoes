# Decisoes arquiteturais

Status: IMPLEMENTADA

| Decisao | Status | Justificativa | Impacto |
| --- | --- | --- | --- |
| Monorepo com npm workspaces | IMPLEMENTADA | Facilita manter web, API e shared juntos. | Build e testes podem ser coordenados na raiz. |
| React + Vite | IMPLEMENTADA | Stack leve para SPA. | Frontend estatico simples de publicar. |
| Express para API | IMPLEMENTADA | API REST direta e conhecida. | Menor complexidade operacional. |
| Supabase Auth/Postgres | IMPLEMENTADA | Entrega autenticacao e banco gerenciado. | Exige boa gestao de RLS e segredos. |
| Zod no shared | IMPLEMENTADA | Evita divergencia de contratos. | Valida entrada e tipos em tempo de desenvolvimento. |
| Capacitor para mobile | PARCIALMENTE IMPLEMENTADA | Reaproveita app web para Android/iOS. | Publicacao exige etapas nativas e lojas. |
| Edge Function para lembretes | PARCIALMENTE IMPLEMENTADA | Aproxima tarefa agendada do banco/Supabase. | Exige segredos VAPID e cron confiavel. |
