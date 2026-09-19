# Backup e recuperacao

Status: PARCIALMENTE PLANEJADA

## Situacao

Existe um plano de baixo custo documentado, mas ainda falta executar e testar restore.

- [backup-baixo-custo.md](backup-baixo-custo.md)

## Recomendacao

1. Executar backup local com frequencia definida.
2. Copiar os arquivos para local externo.
3. Definir RPO e RTO.
4. Testar restauracao em ambiente separado.
5. Fazer backup antes de migrations.
6. Documentar responsaveis e canais de incidente.

## Plano atual sem custo mensal

Enquanto o projeto nao puder assumir Supabase Pro, usar:

- dump SQL local;
- copia externa em Drive/OneDrive/HD;
- teste mensal de restore;
- exportacao CSV como camada complementar.

Observacao: o dump via Supabase CLI depende de Docker Desktop ou Podman instalado. Se o comando falhar e gerar arquivos vazios, esses arquivos nao devem ser considerados backup.

## Importancia

Por tratar dados financeiros e agenda profissional, backup e recuperacao sao requisitos criticos antes da comercializacao.

Sem backup automatico gerenciado ou PITR, o sistema nao deve ser classificado como plenamente pronto para uso comercial amplo.
