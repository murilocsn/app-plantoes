# Testes de seguranca

Status: NAO CONFIRMADA

## Testes recomendados

- Usuario A nao acessa dados do usuario B.
- Token ausente retorna 401.
- Token invalido retorna 401.
- Usuario sem permissao nao altera espaco compartilhado.
- Campos invalidos retornam erro de validacao.
- Rotas publicas nao expõem dados sensiveis.
- Logs nao imprimem tokens ou segredos.

## Situacao atual

Foram identificados controles de seguranca, mas nao uma suite dedicada completa de testes de seguranca.
