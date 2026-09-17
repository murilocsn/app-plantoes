# Instalacao local

Status: IMPLEMENTADA

## Passos

```bash
npm install
npm run dev
```

## Execucao separada

```bash
npm run dev -w @financplantoes/api
npm run dev -w @financplantoes/web
```

## URLs comuns

- Frontend: `http://localhost:5173`
- API: `http://localhost:3333`
- Health: `http://localhost:3333/health`

## Observacao

As variaveis de ambiente precisam estar configuradas antes de testar login, Supabase, API protegida e push.
