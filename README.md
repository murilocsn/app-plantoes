# Controle de Plantões

Sistema web multiusuário para profissionais de saúde registrarem plantões (local, horário de início, duração e valor). Cada pessoa cria sua própria conta e enxerga **apenas os próprios dados**, acessíveis de qualquer dispositivo, com um banco de dados real por trás.

**Fluxo do app:** inicialização → tela de login/cadastro → ambiente individual do usuário → dados gravados online (Supabase), acessíveis de qualquer lugar em que a pessoa fizer login.

É um aplicativo **estático** (um único `index.html`), hospedado gratuitamente no GitHub Pages, com banco de dados e autenticação no [Supabase](https://supabase.com) (gratuito para esse volume de uso).

## Por que essa combinação (hospedagem gratuita)

- **Supabase** — banco de dados (PostgreSQL) + sistema de login pronto (Supabase Auth), plano gratuito.
- **GitHub Pages** — hospedagem do site, gratuita e sem limite de usuários finais.

Nenhuma das duas exige cartão de crédito no plano gratuito usado aqui.

## O que só você pode fazer (exige suas credenciais pessoais)

Como criar contas em serviços externos exige e-mail, senha e confirmação pessoal, esses cliques precisam ser feitos por você. Toda a parte técnica (código, autenticação, isolamento de dados por usuário) já está pronta nos arquivos deste repositório — é só seguir os passos abaixo. Se travar em algum, me chame que eu ajudo a resolver.

### 1. Criar o projeto no Supabase

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e clique em **New project**.
2. Escolha um nome e uma senha para o banco (guarde em local seguro) e aguarde o projeto ficar com status **Active** (leva 1-2 minutos).

### 2. Criar as tabelas (com isolamento por usuário)

1. No menu lateral, abra **SQL Editor** → **New query**.
2. Copie **todo** o conteúdo do arquivo [`supabase-schema.sql`](./supabase-schema.sql), cole no editor e clique em **RUN**.
   Isso cria as tabelas `locations` e `shifts` já com uma coluna `user_id` e regras de segurança (RLS) que garantem que cada conta só vê seus próprios registros.

> Rodando pela primeira vez: o script cria tudo do zero, sem problema.
> Se você já tinha rodado uma versão anterior deste script (sem login), apague as tabelas antigas antes (`drop table shifts; drop table locations;`) e rode este script novamente — assim elas são recriadas já com o campo de usuário.

### 3. Pegar a URL e a chave do projeto

No menu lateral, abra **Project Settings** → **API** e copie:
- **Project URL** (ex.: `https://xxxxxxxx.supabase.co`)
- **anon public key** (chave longa, geralmente começando com `eyJ...`)

⚠️ Use sempre a chave **anon public** — nunca a `service_role` (essa é secreta).

### 4. Configurar o `index.html`

Abra o `index.html` e substitua:

```js
const SUPABASE_URL = 'COLE_AQUI_A_URL_DO_SEU_PROJETO_SUPABASE';
const SUPABASE_ANON_KEY = 'COLE_AQUI_A_ANON_KEY_DO_SEU_PROJETO_SUPABASE';
```

pelos valores copiados no passo anterior, e salve.

### 5. (Opcional) Simplificar a confirmação de e-mail

Por padrão, o Supabase exige que a pessoa confirme o e-mail antes do primeiro login (um link é enviado automaticamente). Se preferir liberar login imediato ao criar conta (útil em testes internos com poucas pessoas):

**Authentication** → **Providers** → **Email** → desmarque **Confirm email**.

### 6. Subir para o GitHub

```bash
git init
git add .
git commit -m "Controle de plantões multiusuário"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

(Ou, sem linha de comando: crie o repositório em github.com e use "Add file → Upload files" pela própria interface do site.)

### 7. Publicar com GitHub Pages

1. No repositório, vá em **Settings** → **Pages**.
2. Em **Source**, selecione a branch `main` e a pasta `/ (root)`.
3. Clique em **Save**. Em instantes o GitHub mostra o link público, algo como:
   `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`
4. Compartilhe esse link com a equipe — cada pessoa cria sua própria conta ao acessar.

## Como funciona no dia a dia

- Ao abrir o link, a pessoa vê a tela de **Entrar / Criar conta**.
- Depois de logada, só enxerga (e só consegue editar) os **próprios** locais e plantões — os dados de outras contas ficam completamente isolados, mesmo estando no mesmo banco de dados.
- Mudanças feitas em um dispositivo aparecem automaticamente nos outros dispositivos em que a mesma pessoa estiver logada (sincronização em tempo real).
- O botão **Sair**, no menu lateral, encerra a sessão naquele dispositivo.
- O indicador **"Sincronizado"** mostra se a conexão com o banco está funcionando.

## Segurança

- O isolamento entre usuários é garantido no próprio banco de dados (Row Level Security do Postgres), não apenas na tela — mesmo que alguém tente manipular o app, o banco recusa acesso a dados de outra conta.
- Senhas são gerenciadas inteiramente pelo Supabase Auth (nunca ficam no seu código ou no GitHub).
- O plano gratuito do Supabase é adequado para uso de uma equipe pequena/média; se o número de usuários ou o volume de dados crescer muito, pode ser necessário migrar para um plano pago.

## Estrutura do repositório

```
.
├── index.html              # aplicativo (login + interface + lógica)
├── supabase-schema.sql     # script para criar tabelas, login e isolamento por usuário
└── README.md                # este arquivo
```

## Testar localmente antes de publicar

Não é obrigatório, mas dá para abrir o `index.html` direto no navegador (duplo clique) depois de configurar a URL e a chave do Supabase no passo 4, sem precisar publicar no GitHub Pages primeiro.
