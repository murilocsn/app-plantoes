# Testes SQL de compartilhamento

Execute somente em um PostgreSQL temporário, vazio e isolado. O fixture cria
uma versão mínima de auth.users/auth.uid e os papéis anon/authenticated para
testar as permissões reais do Postgres. Ele falha se o schema auth já existir.
Não execute o fixture ou estes testes no Supabase de produção.

Verificado com PostgreSQL 18 no Windows; a migration usa recursos compatíveis
com o PostgreSQL 17 do projeto Supabase. Não depende de Docker ou novas libs.

## Preparação local

Com os executáveis do PostgreSQL no PATH, crie um cluster de teste:

```powershell
$expensePgData = Join-Path (Get-Location).Path 'node_modules/.cache/financ-validation/expense-sharing-postgres/data'
initdb -D $expensePgData -U expense_test_admin --auth=trust -E UTF8 --locale=C
pg_ctl -D $expensePgData -l "$expensePgData/test.log" -o '-h 127.0.0.1 -p 55426' -w start
```

O modo trust é exclusivo desse cluster local sem dados reais, vinculado apenas
ao loopback. Não altere o método de autenticação de instalações existentes.

## Migration e permissões

```powershell
psql -h 127.0.0.1 -p 55426 -U expense_test_admin -d postgres -v ON_ERROR_STOP=1 -f database/tests/expense_sharing_fixture.sql -f database/migrations/20261018170810_expense_sharing_cards.sql -f database/tests/expense_sharing.sql
```

Na mesma instalação, execuções seguintes precisam apenas de expense_sharing.sql.
Se algum assert falhar, psql encerra com erro. Os usuários fictícios e gastos
criados pelo teste são revertidos por rollback. As tabelas da migration ficam
no cluster local para permitir inspeção e os testes concorrentes.

## Concorrência

```powershell
$env:EXPENSE_TEST_PSQL = 'C:/Program Files/PostgreSQL/18/bin/psql.exe'
node database/tests/expense_sharing_concurrency.mjs
```

O script verifica o diretório exato do cluster antes de escrever, executa
reservas simultâneas e a corrida entre aceitar/cancelar, e remove somente seus
próprios usuários fictícios ao terminar.

## Advisors e encerramento

```powershell
npm exec --yes --package=supabase -- supabase db advisors --db-url 'postgresql://expense_test_admin@127.0.0.1:55426/postgres?sslmode=disable' --type security --level warn --fail-on error
pg_ctl -D $expensePgData -w stop
```

O sslmode=disable é exclusivo da conexão de teste por loopback. A aplicação
continua usando a configuração segura existente do Supabase.

## Locais com várias despesas

A reformulação usa um cluster temporário diferente, na porta 55428. Não execute
o fixture em um banco existente: ele cria `auth` e falha se o schema já existir.

```powershell
$expenseLocationData = Join-Path (Get-Location).Path 'node_modules/.cache/expense-reform/postgres/data'
initdb -D $expenseLocationData -U expense_reform_test --auth=trust -E UTF8 --locale=C
pg_ctl -D $expenseLocationData -l "$expenseLocationData/../test.log" -o '-h 127.0.0.1 -p 55428' -w start
psql -X -h 127.0.0.1 -p 55428 -U expense_reform_test -d postgres -v ON_ERROR_STOP=1 -f database/tests/expense_locations_fixture.sql -f database/migrations/20261018170810_expense_sharing_cards.sql -f database/tests/expense_sharing.sql -f database/migrations/20261019021850_expense_location_cards.sql -f database/tests/expense_sharing.sql -f database/tests/expense_locations.sql
node database/tests/expense_locations_concurrency.mjs
pg_ctl -D $expenseLocationData -w stop
```

A suíte anterior roda antes e depois da migration nova. Os testes novos cobrem
locais pessoais/compartilhados, vínculo obrigatório, proteção contra vínculos
entre usuários, convites duplicados/próprios, aceite/recusa/cancelamento, RLS,
nomes dos participantes sem e-mails de terceiros, centavos e totais por período.
O script concorrente valida duplicidade e a corrida entre aceite e cadastro de
despesa. Ele verifica o diretório exato do cluster antes de executar operações.
Os testes SQL usam rollback; o script remove somente seus usuários fictícios.

## Autoria dos lançamentos

Depois do fixture e das duas migrations de locais, execute somente no cluster
temporário em loopback:

```powershell
psql -X -h 127.0.0.1 -p 55428 -U expense_reform_test -d postgres -v ON_ERROR_STOP=1 -f database/tests/expense_authors_fixture.sql -f database/migrations/20261019180927_expense_authors.sql -f database/tests/expense_sharing.sql -f database/tests/expense_locations.sql -f database/tests/expense_authors.sql
```

O fixture de autoria acrescenta um modelo mínimo de `profiles`, com RLS, ao
ambiente de teste. Ele falha se essa tabela já existir; não deve ser executado
no Supabase de produção. A suíte verifica autor proprietário/convidado, nome
do perfil, registros históricos sem atribuição indevida, isolamento entre
usuários, bloqueio de alteração direta do autor e preservação da despesa quando
a conta do autor é removida. Os dados fictícios são revertidos por rollback.
