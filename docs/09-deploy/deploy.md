# Deploy

Status: PARCIALMENTE IMPLEMENTADA

## Visao geral

| Parte | Status | Evidencia |
| --- | --- | --- |
| Backend Render | IMPLEMENTADA | `render.yaml` |
| Frontend estatico | PARCIALMENTE IMPLEMENTADA | Vite com base de producao em `vite.config.ts` |
| Banco Supabase | IMPLEMENTADA | Migrations SQL |
| Edge Function | PARCIALMENTE IMPLEMENTADA | Codigo em `supabase/functions` |
| Android/iOS | PARCIALMENTE IMPLEMENTADA | Projetos Capacitor criados |

## Ordem recomendada

1. Aplicar migrations em staging.
2. Configurar env vars do backend.
3. Publicar API.
4. Configurar env vars/build do frontend.
5. Testar login e principais fluxos.
6. Configurar Edge Function e cron.
7. Preparar builds mobile.

## Lembretes push

Para publicacao dos alertas de plantao, validar tambem:

- `VITE_VAPID_PUBLIC_KEY` no frontend publicado.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, `WEB_APP_URL` e `REMINDER_WINDOW_MINUTES` nos Secrets da Edge Function.
- `shift_reminders_cron_secret` no Supabase Vault com o mesmo valor de `CRON_SECRET`.
- Cron `financplantoes-lembrete-diario` rodando a cada 5 minutos com header `x-cron-secret`.

Runbook: [../11-operacao/lembretes-push.md](../11-operacao/lembretes-push.md)
