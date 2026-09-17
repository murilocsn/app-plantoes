# Documentacao do FinancPlantoes

Indice profissional da documentacao do produto FinancPlantoes, organizada para desenvolvimento, operacao, due diligence tecnica e avaliacao comercial.

## Indice

- [01 Produto](01-produto/visao-geral.md)
- [02 Requisitos](02-requisitos/requisitos-funcionais.md)
- [03 Arquitetura](03-arquitetura/arquitetura-geral.md)
- [04 Banco de dados](04-banco-de-dados/modelo-dados.md)
- [05 API](05-api/api.md)
- [06 Seguranca](06-seguranca/seguranca.md)
- [07 Privacidade e LGPD](07-privacidade-lgpd/lgpd.md)
- [08 Instalacao](08-instalacao/requisitos-ambiente.md)
- [09 Deploy](09-deploy/deploy.md)
- [10 Testes](10-testes/estrategia-testes.md)
- [11 Operacao](11-operacao/monitoramento.md)
- [12 Manual do usuario](12-manual-usuario/manual-usuario.md)
- [13 Manual do administrador](13-manual-administrador/manual-administrador.md)
- [14 Comercial](14-comercial/resumo-executivo.md)
- [15 Governanca](15-governanca/dependencias.md)
- [16 Roadmap](16-roadmap/roadmap.md)
- [CHANGELOG](CHANGELOG.md)

## Guia do Desenvolvedor

### Arquitetura

- Frontend React/Vite: `apps/web`.
- API Express/Node: `apps/api`.
- Schemas e tipos compartilhados: `packages/shared`.
- Banco e Auth: Supabase/Postgres/Auth.
- Migrations: `database/migrations`.
- Edge Function de lembretes: `supabase/functions/send-shift-reminders`.
- Mobile: Capacitor em `apps/web/android` e `apps/web/ios`.

### Comandos

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

### Fluxo local

1. Configurar `.env`, `apps/api/.env` e/ou `apps/web/.env` com valores reais somente localmente.
2. Rodar `npm run dev` na raiz.
3. Acessar `http://localhost:5173`.
4. Health da API: `http://localhost:3333/health`.

### Documentos essenciais

- Variaveis: [08-instalacao/variaveis-ambiente.md](08-instalacao/variaveis-ambiente.md)
- Endpoints: [05-api/endpoints.md](05-api/endpoints.md)
- Banco/RLS: [04-banco-de-dados/seguranca-rls.md](04-banco-de-dados/seguranca-rls.md)
- Riscos: [15-governanca/riscos-tecnicos.md](15-governanca/riscos-tecnicos.md)
- Due diligence: [14-comercial/checklist-due-diligence.md](14-comercial/checklist-due-diligence.md)
