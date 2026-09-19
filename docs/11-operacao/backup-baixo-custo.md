# Backup de baixo custo

Status: PLANEJADA

Este documento descreve uma estrategia sem mensalidade obrigatoria para reduzir o risco de perda de dados enquanto o projeto ainda nao pode assumir o custo do Supabase Pro.

## Aviso importante

Esta estrategia melhora a seguranca, mas nao substitui backups automaticos gerenciados nem PITR.

Sem plano pago, o risco nunca fica zero. O objetivo aqui e reduzir o risco com disciplina operacional:

- exportar o banco com frequencia;
- guardar copia fora do Supabase;
- testar restauracao;
- evitar alteracoes destrutivas sem backup recente.

## Estrategia recomendada agora

| Camada | Custo | Frequencia | Objetivo |
| --- | --- | --- | --- |
| Exportacao CSV pelo app | R$ 0 | Semanal | Copia simples para o usuario/administrador. |
| Dump SQL local | R$ 0 | Diario ou antes de mudancas | Copia tecnica do banco. |
| Copia externa | R$ 0 | A cada dump | Guardar fora do computador e fora do Supabase. |
| Teste de restore | R$ 0 | Mensal | Confirmar que o backup realmente recupera dados. |

## Onde guardar

Opcoes sem custo mensal:

- Google Drive.
- OneDrive.
- HD externo.
- Pendrive dedicado.
- Pasta criptografada local.

Regra minima: manter pelo menos 3 copias recentes:

- backup de hoje;
- backup de ontem;
- backup da semana anterior.

## Script local

O repositorio possui um script de apoio:

```powershell
.\scripts\backup-supabase.ps1
```

Requisitos locais:

- Supabase CLI disponivel via `supabase` ou `npx.cmd supabase`.
- Docker Desktop ou Podman instalado e disponivel no `PATH`.

Ele exige a variavel de ambiente:

```powershell
$env:SUPABASE_DB_URL="postgresql://..."
```

Nunca salve essa URL em arquivo versionado.

O script gera:

```text
backups/schema-AAAAmmdd-HHmmss.sql
backups/data-AAAAmmdd-HHmmss.sql
```

A pasta `backups/` esta ignorada pelo Git.

Se aparecer erro como `docker: command not found`, o backup nao foi gerado. Instale Docker Desktop ou Podman antes de rodar novamente.

Arquivos com `0 bytes` nao sao backups validos e devem ser descartados.

## Rotina diaria sem custo

1. Definir `SUPABASE_DB_URL` apenas no terminal local.
2. Rodar `.\scripts\backup-supabase.ps1`.
3. Copiar os arquivos gerados para Google Drive/OneDrive/HD externo.
4. Verificar se os arquivos foram enviados/sincronizados.
5. Manter historico minimo de 7 dias, se houver espaco.

## Antes de qualquer mudanca importante

Antes de migrations, alteracoes em RLS, Edge Functions ou deploy relevante:

1. Rodar backup.
2. Copiar backup para local externo.
3. Confirmar que o arquivo existe.
4. So entao executar a mudanca.

## Restore

O restore deve ser testado em ambiente separado, nunca diretamente em producao sem plano.

Procedimento recomendado:

1. Criar projeto Supabase temporario ou ambiente local.
2. Restaurar schema.
3. Restaurar dados.
4. Conferir tabelas criticas:
   - `locations`
   - `shifts`
   - `receivables`
   - `personal_expenses`
   - `spaces`
   - `expenses`
5. Registrar data do teste.

## Limites desta estrategia

| Risco | Impacto |
| --- | --- |
| Esquecer de rodar backup | Dados recentes podem ser perdidos. |
| Computador desligado | Rotina local nao roda. |
| Backup corrompido nao testado | Falsa sensacao de seguranca. |
| Sem PITR | Pode perder tudo entre o ultimo backup e o erro. |

## Quando subir para plano pago

Migrar para Supabase Pro assim que houver usuarios reais constantes ou dados que nao possam ser recriados manualmente.

Gatilhos para upgrade:

- mais de 3 usuarios reais;
- uso diario;
- dados financeiros importantes;
- impossibilidade de refazer anotacoes perdidas;
- necessidade de suporte/backup gerenciado.
