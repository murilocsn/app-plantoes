# Troubleshooting

Status: IMPLEMENTADA

| Sintoma | Causa provavel | Acao |
| --- | --- | --- |
| `AUTH_REQUIRED` | Token ausente/expirado | Fazer login novamente e conferir API base URL. |
| Falha na comunicacao com API | API fora do ar ou URL errada | Testar `/health` e `VITE_API_BASE_URL`. |
| CORS bloqueado | `WEB_ORIGIN` incorreto | Ajustar variavel no backend. |
| Dados nao aparecem | RLS ou token invalido | Conferir usuario, Supabase e policies. |
| Push nao envia | VAPID/cron ausente | Conferir segredos e Edge Function. |
| Build Android falha | JDK/Android SDK | Abrir Android Studio e instalar SDK/JDK correto. |
