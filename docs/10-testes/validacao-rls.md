# Validacao de RLS

Status: PARCIALMENTE VALIDADO

Esta pagina registra verificacoes reais de Row Level Security no Supabase.

## Resultado em 2026-09-19

Validacao executada em producao, em modo somente leitura quando aplicavel e com rollback para tentativa de escrita.

| Verificacao | Resultado |
| --- | --- |
| Tabelas publicas com RLS habilitado | OK |
| Tabelas publicas com RLS ativo e sem policy | OK, nenhuma encontrada |
| Usuario dono consegue ler registro proprio em `locations` | OK |
| Outro usuario nao consegue ler o registro do dono em `locations` | OK |
| Outro usuario nao consegue atualizar o registro do dono em `locations` | OK |
| Usuario dono consegue ler registro proprio em `shifts` | OK |
| Outro usuario nao consegue ler o registro do dono em `shifts` | OK |
| Outro usuario nao consegue atualizar o registro do dono em `shifts` | OK |
| Usuario dono consegue ler registro proprio em `receivables` | OK |
| Outro usuario nao consegue ler o registro do dono em `receivables` | OK |
| Outro usuario nao consegue atualizar o registro do dono em `receivables` | OK |
| Usuario dono consegue ler registro proprio em `personal_expenses` | OK |
| Outro usuario nao consegue ler o registro do dono em `personal_expenses` | OK |
| Outro usuario nao consegue atualizar o registro do dono em `personal_expenses` | OK |
| Dono consegue ler `spaces` | OK |
| Usuario nao membro nao consegue ler `spaces` | OK |
| Usuario nao membro nao consegue atualizar `spaces` | OK |
| Dono/membro autorizado consegue ler `expenses` de espaco | OK |
| Usuario nao membro nao consegue ler `expenses` de espaco | OK |
| Usuario nao membro nao consegue atualizar `expenses` de espaco | OK |

## Consultas usadas

Conferir tabelas publicas com RLS:

```sql
select n.nspname as schema,
       c.relname as table,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname = 'public'
order by c.relname;
```

Conferir policies:

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Conferir tabelas com RLS e sem policy:

```sql
select c.relname as table_without_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where c.relkind = 'r'
  and n.nspname = 'public'
  and c.relrowsecurity = true
group by c.oid, c.relname
having count(p.oid) = 0
order by c.relname;
```

## Escopo validado

A validacao pratica confirmou isolamento em:

- `locations`
- `shifts`
- `receivables`
- `personal_expenses`
- `spaces`
- `expenses`

## Escopo ainda pendente

- Testar regras especificas de convite em `space_invitations`.
- Testar mudanca de papeis em `space_members`.
- Testar `expense_splits` e `settlements`.
- Automatizar estes cenarios em suite de teste dedicada.
