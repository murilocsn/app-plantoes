# FinancPlantões

Sistema web multiusuário para profissionais de saúde registrarem plantões (unidade, horário de início, duração e valor). Cada pessoa cria sua própria conta e enxerga **apenas os próprios dados**, acessíveis de qualquer dispositivo, com um banco de dados real por trás.


## Novidades desta versão

**Campo "Profissional" removido do formulário de lançar plantão.**
**Corrigi** a causa raiz da rolagem horizontal: os campos usavam colunas de grade (1fr 1fr) que, por padrão, não encolhem além do conteúdo mínimo — então quando o campo de data/hora nativo do celular pedia mais espaço do que cabia, a página inteira ganhava uma barra de rolagem lateral. Agora as colunas podem encolher de verdade, e adicionei uma trava de segurança (overflow-x:hidden) para impedir que isso aconteça de novo em qualquer situação.
**Modal maior:** aumentei a largura máxima de 460px para 560px (mais espaço em telas grandes) e reduzi a margem externa, aproveitando melhor a tela sem perder o visual compacto

- **Instalável como app** (PWA) — no iPhone via "Adicionar à Tela de Início", no computador via botão "Instalar" do navegador.
- **Lembrete diário por notificação** — avisa no celular, no início do dia, quando há plantão marcado (recurso avançado, com configuração adicional no Supabase — veja seção própria abaixo).
- **Exportar CSV para Imposto de Renda** — na tela Relatório, gera uma planilha do período com data, unidade, CNPJ/CPF da fonte pagadora, horário, valor etc., pronta para o Carnê-Leão ou para repassar ao contador.
- Tema com fundo branco.
- Etiqueta automática de plantão **Diurno** (08:00–19:59) ou **Noturno** (20:00–07:59).
- Células do calendário com tamanho fixo, mesmo em dias com vários plantões.
- Identificação visual de cada unidade por uma cor própria.
- Recorrência de plantão fixo com intervalo personalizado (dias/semanas/meses).
- Meta financeira do período, com barra de progresso.
- Modais mais compactos, sem barra de rolagem.
- Novo nome e logo: **FinancPlantões**. Assinatura do idealizador, Murilo Neder.

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
├── index.html                          # aplicativo (login + interface + lógica)
├── manifest.json                       # torna o app instalável (PWA)
├── service-worker.js                   # permite instalar e receber notificações
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── supabase-schema.sql                 # cria/atualiza as tabelas no Supabase
├── lembretes-supabase/                 # opcional — só se for usar lembretes por notificação
│   ├── send-shift-reminders.ts         # código da Edge Function
│   └── cron-schedule.sql               # agenda o envio diário
└── README.md                            # este arquivo
```

Ao subir para o GitHub, envie **todos** os arquivos acima (inclusive a pasta `icons`), mantendo essa mesma estrutura de pastas — o app depende dos caminhos relativos entre eles.

## Instalar como app (PWA)

**No iPhone:**
1. Abra o link do app no **Safari** (tem que ser o Safari, outros navegadores no iPhone não funcionam para isso).
2. Toque no ícone de compartilhar (o quadrado com uma seta para cima).
3. Toque em **"Adicionar à Tela de Início"**.
4. Pronto — o ícone do FinancPlantões aparece na tela do seu celular como um app normal, abrindo em tela cheia.

**No computador (Chrome ou Edge):**
1. Abra o link do app.
2. Clique no ícone de instalação que aparece no final da barra de endereço (ou no menu ⋮ → "Instalar app…").
3. O app abre numa janela própria, sem as abas do navegador.

Como os dados ficam no Supabase, iPhone, computador e qualquer outro aparelho em que você fizer login mostram sempre os mesmos plantões, atualizados em tempo real.

## Lembrete diário por notificação (recurso avançado)

Esse recurso avisa no celular, todo início de dia, quando há um plantão marcado — mesmo com o app fechado. Ele tem uma configuração adicional porque depende de três peças: uma "chave" de identificação do seu servidor de notificações (VAPID), uma função que dispara o aviso, e um agendamento diário. Nenhuma dessas etapas expõe dados sensíveis, mas exigem alguns cliques a mais no painel do Supabase.

<br>

**Pré-requisito:** o lembrete só pode ser ativado depois que o app estiver **instalado na Tela de Início** (PWA — veja seção acima). Isso é uma regra do próprio iPhone, não do nosso app.

### 1. Gerar as chaves VAPID

No terminal do VS Code (ou em qualquer terminal com Node.js instalado), rode:

```bash
npx web-push generate-vapid-keys
```

Isso mostra duas chaves: uma **Public Key** e uma **Private Key**. Guarde as duas.

### 2. Colar a chave pública no `index.html`

Abra o `index.html`, localize:

```js
const VAPID_PUBLIC_KEY = 'COLE_AQUI_SUA_VAPID_PUBLIC_KEY';
```

e substitua pela Public Key gerada no passo 1. Salve e suba esse arquivo atualizado no GitHub.

### 3. Criar a Edge Function no Supabase

1. No painel do Supabase, vá em **Edge Functions** → **Create a new function**.
2. Nomeie exatamente como `send-shift-reminders`.
3. Apague o código de exemplo e cole todo o conteúdo do arquivo [`lembretes-supabase/send-shift-reminders.ts`](./lembretes-supabase/send-shift-reminders.ts).
4. Clique em **Deploy**.
5. Nas configurações dessa função (aba **Settings** da função), **desative "Enforce JWT Verification"** — isso permite que o agendamento diário chame a função automaticamente.

### 4. Configurar os Secrets da função

Ainda na tela da função (ou em **Edge Functions → Manage secrets**), adicione:

| Nome | Valor |
|---|---|
| `VAPID_PUBLIC_KEY` | a Public Key do passo 1 |
| `VAPID_PRIVATE_KEY` | a Private Key do passo 1 |
| `VAPID_SUBJECT` | `mailto:seuemail@exemplo.com` (um e-mail seu, é exigido pelo protocolo) |

(`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são fornecidos automaticamente pelo Supabase, não precisa configurar.)

### 5. Agendar o envio diário

No **SQL Editor**, cole e rode o conteúdo do arquivo [`lembretes-supabase/cron-schedule.sql`](./lembretes-supabase/cron-schedule.sql). Por padrão está configurado para rodar **7h da manhã (horário de São Paulo)** — para mudar o horário, edite o número indicado nos comentários do próprio arquivo.

### 6. Ativar no app

Abra o app (já instalado na Tela de Início), toque em **"Ativar lembretes"** na barra lateral e aceite a permissão de notificação quando o iPhone perguntar. Pronto.

## Facilitar o Imposto de Renda

Na tela **Relatório**, o botão **"Exportar CSV"** baixa uma planilha do período selecionado (mês ou intervalo) com: data, unidade (fonte pagadora), CNPJ/CPF da unidade (se você preencheu ao cadastrar o local), horário, se foi diurno/noturno, duração, valor recebido e o total do período.

Isso não envia nada automaticamente à Receita Federal, mas consolida exatamente as informações usadas para preencher:
- O **Carnê-Leão** mensal (rendimentos recebidos de pessoa física/jurídica sem vínculo empregatício).
- A **Declaração Anual de Imposto de Renda**.
- Ou para simplesmente repassar ao seu contador.

Dica: preencha o campo "CNPJ ou CPF da fonte pagadora" ao cadastrar cada local — ele é exigido no Carnê-Leão e já sai pronto na planilha exportada.

## Testar localmente antes de publicar

Não é obrigatório, mas dá para abrir o `index.html` direto no navegador (duplo clique) depois de configurar a URL e a chave do Supabase no passo 4, sem precisar publicar no GitHub Pages primeiro.
