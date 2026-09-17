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
