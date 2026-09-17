# Variaveis de ambiente

Status: IMPLEMENTADA

Nao registrar valores reais neste arquivo.

| Variavel | Uso | Ambiente |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | URL Supabase no frontend | Web |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave publica Supabase | Web |
| `VITE_API_BASE_URL` | URL da API usada pelo frontend | Web |
| `VITE_VAPID_PUBLIC_KEY` | Chave publica push | Web |
| `API_TARGET` | Proxy Vite para API | Desenvolvimento |
| `WEB_PORT` | Porta do Vite | Desenvolvimento |
| `API_PORT` | Porta local da API | API |
| `PORT` | Porta usada pela hospedagem | API |
| `SUPABASE_URL` | URL Supabase no servidor | API/Edge |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publica no servidor | API |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privada servidor | Edge/API se necessario |
| `WEB_ORIGIN` | Origem permitida no CORS | API |
| `VAPID_PUBLIC_KEY` | Chave publica push | Edge/API |
| `VAPID_PRIVATE_KEY` | Chave privada push | Edge/API |
| `VAPID_SUBJECT` | Identidade do emissor push | Edge/API |
| `CRON_SECRET` | Protecao da chamada agendada | Edge |
| `WEB_APP_URL` | URL publica do app | Edge |
| `REMINDER_WINDOW_MINUTES` | Janela de lembrete | Edge |
