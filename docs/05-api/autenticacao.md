# Autenticacao da API

Status: IMPLEMENTADA

A API usa tokens do Supabase Auth no header HTTP:

```http
Authorization: Bearer <access_token>
```

## Fluxo

1. O usuario autentica no frontend com Supabase.
2. O frontend envia o token para a API.
3. `requireAuth` valida o token com Supabase.
4. A API popula `req.user`.
5. Rotas protegidas usam `user.id` para filtrar dados.

## Erros principais

| Codigo | Quando ocorre |
| --- | --- |
| `AUTH_REQUIRED` | Header ausente ou sessao nao encontrada. |
| `AUTH_INVALID` | Token invalido, expirado ou rejeitado pelo Supabase. |

## Atencao

Tokens e chaves reais nunca devem aparecer em documentacao, prints, commits ou logs publicos.

## Perfil do usuario

No cadastro pela interface, **Nome completo** e obrigatorio, com 2 a 80 caracteres
apos remover espacos das extremidades. O formulario e o metodo `AuthContext.signUp`
validam o campo antes de enviar ao Supabase. Reutiliza a validacao de nome do perfil;
nao verifica identidade civil nem exige documento pessoal. O nome e enviado somente
como `options.data.full_name`, separado de `legal_acknowledgment`, e aparece completo
em Meu perfil. A saudacao continua usando apenas o primeiro nome. Nao e enviado a
telemetria ou logs. O login de contas
existentes continua solicitando apenas e-mail e senha.

A rota autenticada `/#/profile`, disponivel em **Meu perfil** no menu lateral
e no menu mobile, usa o mesmo cliente Supabase Auth da aplicacao.

- Nome: atualiza somente `user_metadata.full_name`, utilizado na saudacao.
  Esse campo serve para apresentacao, nunca para autorizacao ou policies de RLS.
- E-mail: solicita a alteracao via `auth.updateUser`. O e-mail exibido permanece
  o efetivo retornado pelo Supabase; uma solicitacao pendente nao e tratada como
  alteracao confirmada. As confirmacoes seguem as configuracoes existentes do Auth.
- Senha: valida senha atual, nova senha e confirmacao. Antes de atualizar, verifica
  a senha atual com `signInWithPassword` da propria conta. Isso renova a sessao pelo
  fluxo normal do cliente e funciona mesmo quando a exigencia opcional de senha
  atual no provedor estiver desabilitada. Uma identidade diferente interrompe a
  operacao. A confirmacao da nova senha nunca e enviada ao servidor.

As senhas sao limpas do formulario apos sucesso ou erro de envio. Nao sao
armazenadas em storage, registradas em logs ou enviadas para a telemetria.
Nao ha novas tabelas, migrations, chaves administrativas ou endpoints da API.

Para os links de confirmacao de e-mail, a URL publica do frontend precisa estar
autorizada em **Supabase Auth > URL Configuration**. A aplicacao usa sua origem
e o caminho base do Vite, incluindo `/app-plantoes/` na publicacao atual. Autorizar
o localhost separadamente para desenvolvimento, sem trocar a URL de producao.
O envio de e-mails depende da configuracao de e-mail do projeto Supabase.

Os testes de alteracao de nome, e-mail e senha interceptam as chamadas Auth e usam
dados sinteticos. Eles nao alteram credenciais reais nem enviam e-mails reais.
Validar a entrega e a confirmacao com uma conta dedicada antes da liberacao publica.
