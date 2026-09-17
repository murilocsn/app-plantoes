# Deploy do banco de dados

Status: PARCIALMENTE IMPLEMENTADA

## Fonte

As alteracoes estruturais estao em `database/migrations`.

## Processo recomendado

1. Criar backup ou snapshot.
2. Aplicar migrations em ambiente de teste.
3. Validar login, plantoes, financeiro, espacos e push.
4. Aplicar em producao em janela controlada.
5. Registrar versao aplicada.

## Pendencias

- Runbook oficial de rollback.
- Confirmacao automatizada de RLS.
- Checklist de backup antes de cada migration.
