# Deploy do backend

Status: IMPLEMENTADA

O backend esta preparado para Render via `render.yaml`.

## Render

| Campo | Valor identificado |
| --- | --- |
| Servico | `financplantoes-api` |
| Runtime | Node |
| Plano | Free |
| Regiao | Ohio |
| Build | `npm ci && npm run build -w @financplantoes/api` |
| Start | `npm run start -w @financplantoes/api` |
| Health | `/health` |

## Variaveis esperadas

- `NODE_VERSION`
- `NODE_ENV`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `WEB_ORIGIN`

## Validacao

Testar `GET /health` depois do deploy.
