# Testes de seguranca

Status: PARCIALMENTE VALIDADO

## Testes recomendados

- Usuario A nao acessa dados do usuario B.
- Token ausente retorna 401.
- Token invalido retorna 401.
- Usuario sem permissao nao altera espaco compartilhado.
- Campos invalidos retornam erro de validacao.
- Rotas publicas nao expõem dados sensiveis.
- Logs nao imprimem tokens ou segredos.

## Situacao atual

Foram identificados controles de seguranca e foram executados testes praticos de RLS em `locations`, `shifts`, `receivables`, `personal_expenses`, `spaces` e `expenses`.

Resultado:

- Usuario dono conseguiu ler o proprio registro.
- Outro usuario nao conseguiu ler o registro do dono.
- Outro usuario nao conseguiu atualizar o registro do dono.
- Usuario nao membro de espaco nao conseguiu ler ou atualizar registros protegidos de espaco.

Registro detalhado: [validacao-rls.md](validacao-rls.md)

Ainda falta uma suite dedicada automatizada cobrindo convites, membros, rateios, acertos e demais fluxos compartilhados.
