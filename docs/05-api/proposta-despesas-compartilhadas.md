# Proposta: despesas compartilhadas por card

Status: implementação e migration preparadas, com testes locais. Supabase de
produção não alterado. O usuário autorizou preparação e testes em 18/10/2026.

## Requisitos confirmados

- A aba Espaços sai da navegação. Links antigos levam a Despesas.
- Despesas pessoais e registros antigos são preservados.
- Cada nova despesa compartilhada tem seu próprio card, com descrição, data,
  categoria, valor total e a parte atribuída ao usuário conectado.
- Quem criou a despesa define o valor individual de cada convidado.
- O convite usa o e-mail exato de uma conta cadastrada e confirmada no app.
- O popup pede e-mail, confirmação do e-mail e valor da participação antes de enviar.
- Os convites são recebidos e aceitos ou recusados dentro do app. Não há envio
  de e-mail externo neste fluxo.
- Apenas o criador convida ou cancela convites. Um convite pendente não atribui
  despesa ao destinatário até ele aceitar.

## Diagnóstico

Inspeção somente de leitura realizada em 18/10/2026 no projeto plantoes-app.
Existem expenses, expense_splits e space_invitations. Seus acessos e convites
são vinculados ao Espaço inteiro, não a uma única despesa. Não há funções
para enviar e aceitar convites de despesas por e-mail. As regras em produção
também diferem da migration 002 versionada no repositório.

Reutilizar um convite de Espaço para esta interface poderia disponibilizar
outras despesas do mesmo Espaço. A proposta evita mudar essas permissões
existentes e isola o novo compartilhamento por card.

## Migration preparada — aplicação em produção depende de autorização

1. Criar shared_expense_cards: proprietário, descrição, valor total, data,
   categoria e observações; identificadores e datas de criação.
2. Criar shared_expense_invitations: card, criador do convite, destinatário,
   e-mail informado, valor individual e estado pendente/aceito/recusado/cancelado.
3. Habilitar RLS nas duas tabelas. A leitura dos cards fica restrita ao criador
   e aos destinatários que aceitaram. Um convite pode ser lido somente por
   seu criador e destinatário.
4. Criar operações transacionais autenticadas para criar card, enviar convite,
   responder e cancelar. A busca por e-mail exato acontece no servidor/banco,
   sem disponibilizar uma lista de contas, credenciais ou chaves administrativas.
5. Restringir escrita direta nas novas tabelas; as operações validam identidade,
   propriedade, estado do convite e os valores dentro da mesma transação.

Não remover ou alterar registros, tabelas e policies antigas. Não desativar RLS.
A criação da migration foi autorizada. Sua aplicação em produção ainda não foi
autorizada. Arquivo: `database/migrations/20261018170810_expense_sharing_cards.sql`.

## Interface e API

Em Despesas, use Compartilhar para criar um card e Convidar pessoa para abrir
o popup. Informe e confirme o e-mail, defina o valor individual e envie. O botão
Convites abre os recebidos, inclusive quando a data da despesa estiver fora do
mês exibido. O criador acompanha e cancela convites pendentes no próprio card.
Um convite aceito não pode ser cancelado unilateralmente para alterar os gastos
do participante.

Operações autenticadas adicionadas:

- `POST /api/expenses/cards`
- `POST /api/expenses/cards/:id/invitations`
- `POST /api/expenses/invitations/:id/respond`, com accepted ou declined.
- `POST /api/expenses/invitations/:id/cancel`

O bootstrap inclui expenseSharing com cards e convites do usuário. sharedExpenses
inclui a parte individual dos novos cards, identificada por sharing_card_id.
O GET de despesas, o resumo mensal e o CSV usam essa mesma parte individual.
Os valores e as permissões são validados novamente no banco, sem depender da UI.

Se a migration estiver ausente, o compartilhamento fica explicitamente
indisponível na interface e as despesas pessoais continuam funcionando. Erros
reais de permissão ou banco geram erro; não são convertidos em listas vazias.

## Ordem de ativação

1. Revisar a migration e obter autorização explícita para aplicar em produção.
2. Aplicar a migration no Supabase e verificar RLS/grants/advisors.
3. Publicar a API com as novas operações.
4. Publicar o frontend e verificar o fluxo com contas de teste autorizadas.

Não são necessárias novas chaves administrativas, serviço de e-mail ou
dependências de runtime. A CLI foi usada temporariamente para gerar a migration.
Nenhum commit, push, deploy ou alteração de dados reais foi realizado nesta etapa.

## Valores e totalização

Os cálculos usam centavos. Valores negativos e convites cuja soma ultrapasse
o total são rejeitados. Convites pendentes reservam valor para impedir excesso,
mas só o aceite atribui a participação ao destinatário. A parte do criador é
o total menos as partes aceitas; recusa ou cancelamento libera a reserva.
O aceite não representa pagamento ou transferência bancária.

Nos resumos mensais, relatórios e CSV, entra apenas a parte daquele usuário,
pela data da despesa. O valor integral aparece no card para explicar a divisão.
Registros antigos mantêm o tratamento atual e não são migrados automaticamente.

## Verificações previstas

- Criar card e convidar por popup; confirmar e-mails iguais.
- Aceitar, recusar e cancelar; impedir respostas duplicadas ou de terceiros.
- Impedir acesso de outro usuário antes do aceite e a cards diferentes.
- Validar centavos, limite do total e convites concorrentes.
- Conferir parte individual nos totais mensais e na exportação.
- Conferir carregamento, erro, vazio, teclado e telas de 320 px.
- Executar testes de API, cálculos, navegação, lint, TypeScript e build.

Os testes SQL em `database/tests` usam PostgreSQL local isolado e usuários
fictícios. Foram verificados isolamento antes/depois do aceite, escrita direta
bloqueada, precisão dos valores e concorrência. Advisors de segurança locais:
nenhum problema encontrado. Esse resultado não substitui a checagem do Supabase
de produção depois de uma aplicação autorizada.

Referências técnicas: [funções e privilégios](https://supabase.com/docs/guides/database/functions),
[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
