# Backup de baixo custo

Status: PARCIALMENTE IMPLEMENTADA

Ultimo teste manual conhecido:

- `2026-09-21 15:36`: backup ZIP gerado em `G:\Meu Drive\Backups-FinancPlantoes`.
- `2026-09-21 15:49`: backup ZIP gerado usando credencial local criptografada.
- `2026-09-21 15:55`: tarefa `FinancPlantoes Backup` configurada para rodar a cada 6 horas.

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
| Dump SQL local | R$ 0 | A cada 6 horas ou antes de mudancas | Copia tecnica do banco. |
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

Scripts relacionados:

```powershell
.\scripts\configure-backup-secret.ps1
.\scripts\install-backup-task.ps1
```

Requisitos locais:

- Opcao recomendada no Windows: cliente PostgreSQL com `pg_dump`.
- O script tenta encontrar automaticamente `pg_dump.exe` em `C:\Program Files\PostgreSQL`.
- Alternativa: Supabase CLI disponivel via `supabase` ou `npx.cmd supabase`.
- Se usar Supabase CLI: Docker Desktop ou Podman instalado, disponivel no `PATH` e em execucao.

O script pode ser executado sem gravar a senha em arquivo. Se `SUPABASE_DB_URL` nao estiver definida e nao houver configuracao automatica, ele pergunta a senha do banco no terminal e monta a URL de conexao em memoria.

Forma recomendada:

```powershell
.\scripts\backup-supabase.ps1
```

Para automacao, salve a credencial criptografada pelo Windows:

```powershell
.\scripts\configure-backup-secret.ps1
```

Esse comando salva a configuracao em:

```text
%APPDATA%\FinancPlantoes\backup-config.json
```

A senha fica criptografada com DPAPI do Windows e deve funcionar somente para o mesmo usuario do Windows que salvou a credencial. Esse arquivo nao deve ser versionado no Git.

Opcionalmente, ele aceita a variavel de ambiente:

```powershell
$env:SUPABASE_DB_URL="postgresql://..."
```

Nunca salve essa URL em arquivo versionado.

Em redes sem IPv6, a connection string direta `db.<project-ref>.supabase.co:5432` pode falhar com timeout. Nesse caso, use a connection string do Supabase **Session Pooler**, disponivel no botao `Connect` do projeto. Ela costuma usar host parecido com:

```text
aws-0-us-east-1.pooler.supabase.com
```

Nao documente a senha nem publique prints com a URL completa.

Por padrao, se o Google Drive estiver montado em `G:\Meu Drive`, o script usa:

```text
G:\Meu Drive\Backups-FinancPlantoes
```

Tambem e possivel definir manualmente:

```powershell
$env:BACKUP_OUTPUT_DIR="G:\Meu Drive\Backups-FinancPlantoes"
```

O script gera um arquivo compactado:

```text
financplantoes-backup-AAAAmmdd-HHmmss.zip
```

Dentro do ZIP ficam:

- `schema.sql`
- `data.sql`
- `manifest.json`

O `manifest.json` registra data, tamanho dos arquivos e hash SHA256 para conferencia.

A pasta `backups/` local continua ignorada pelo Git.

Se aparecer erro informando que `pg_dump` nao foi encontrado e o Docker tambem nao esta disponivel, instale o cliente do PostgreSQL ou habilite o Docker.

Se aparecer erro como `docker: command not found`, o backup nao foi gerado pela rota do Supabase CLI. Instale Docker Desktop/Podman ou use a rota recomendada com `pg_dump`.

Se aparecer erro de conexao com `dockerDesktopLinuxEngine`, o Docker Desktop esta instalado, mas nao esta rodando. Abra o Docker Desktop, aguarde ficar ativo e rode o script novamente.

Se o Docker Desktop exibir `Virtualization support not detected`, a virtualizacao do computador esta desativada ou indisponivel. Nesse caso, use a rota com `pg_dump` local para nao depender de Docker.

Arquivos com `0 bytes` nao sao backups validos e devem ser descartados.

## Rotina a cada 6 horas sem custo

1. Confirmar que o Google Drive para computador esta aberto e sincronizando.
2. Rodar `.\scripts\configure-backup-secret.ps1` uma vez para salvar a credencial local criptografada.
3. Rodar `.\scripts\backup-supabase.ps1` para validar manualmente.
4. Se estiver usando a rota do Supabase CLI, confirmar que o Docker Desktop esta aberto e ativo.
5. Verificar se o ZIP apareceu em `G:\Meu Drive\Backups-FinancPlantoes`.
6. Aguardar o Google Drive indicar sincronizacao concluida.

Para agendamento automatico, usar o Agendador de Tarefas do Windows para executar o script a cada 6 horas.

O repositorio possui um script para criar a tarefa:

```powershell
.\scripts\install-backup-task.ps1
```

Ele cria/atualiza a tarefa `FinancPlantoes Backup`, com primeira execucao em cerca de 5 minutos e repeticao a cada 6 horas.

O script remove automaticamente arquivos `financplantoes-backup-*.zip` mais antigos que 14 dias, salvo se outro valor for passado:

```powershell
.\scripts\backup-supabase.ps1 -RetentionDays 30
```

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
