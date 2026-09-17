# Deploy do frontend

Status: PARCIALMENTE IMPLEMENTADA

## Build

```bash
npm run build -w @financplantoes/web
```

## Configuracoes relevantes

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL`
- `VITE_VAPID_PUBLIC_KEY`

## Observacoes

O `vite.config.ts` indica base de producao `/app-plantoes/`, o que sugere publicacao sob subcaminho. Conferir se a hospedagem final usa essa mesma base.
