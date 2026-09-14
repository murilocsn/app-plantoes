# Registro de erros e condicoes de teste

## Execucao mais recente

Data da verificacao: 13/09/2026

- E2E Playwright: 18 passaram, 0 falharam.
- Testes unitarios: 57 passaram.
  - API: 20.
  - Web: 12.
  - Shared: 25.
- TypeScript: validacao executada anteriormente com sucesso.

Nenhuma das falhas E2E registradas abaixo e reproduzida atualmente.

## Falhas historicas identificadas

### 1. Checkbox de repeticao sem receber clique no mobile

**Teste afetado:**

`e2e/shift-dates.spec.ts` - cadastro de data e repeticao em formato brasileiro.

**Condicoes para reproduzir:**

- executar o projeto Playwright `mobile`;
- abrir o modal de novo plantao;
- preencher a data;
- chamar `scrollIntoViewIfNeeded()` no checkbox `Repetir plantao`;
- tentar marcar o checkbox.

**Erro observado:**

O Playwright aguardava o clique, mas elementos do formulario, especialmente o select de local, interceptavam os eventos de ponteiro. O teste atingia o timeout de 30 segundos.

**Causa:**

O modal tinha um wrapper `.modal-content` com altura flexivel e scroll interno configurado de forma incompatível com o formulario. Em telas pequenas, o formulario excedia a area visivel e o controle parecia visivel sem estar em uma regiao realmente clicavel.

**Estado atual:** corrigido. O modal voltou a ser o contenedor de rolagem no mobile, e o teste passou na ultima execucao.

### 2. Botao Salvar sem receber clique ao editar um plantao

**Teste afetado:**

`e2e/shift-dates.spec.ts` - edicao de datas existentes e preservacao do seletor de calendario.

**Condicoes para reproduzir:**

- executar o projeto Playwright `mobile`;
- abrir um plantao existente;
- alterar a data pelo seletor de calendario;
- rolar ate o botao `Salvar`;
- tentar salvar.

**Erro observado:**

Campos como `Duracao em horas` ou o proprio formulario interceptavam o clique. Como a requisicao PATCH nunca era enviada, `page.waitForRequest()` tambem atingia timeout.

**Causa:**

Era o mesmo problema de dimensionamento e rolagem do modal mobile. O botao estava no DOM, mas a area clicavel nao era corretamente posicionada.

**Estado atual:** corrigido. O teste passou na ultima execucao.

### 3. Validacao de datas invalidas interrompida pelo clique bloqueado

**Teste afetado:**

`e2e/shift-dates.spec.ts` - datas impossiveis, ano bissexto e repeticao sem data final.

**Condicoes para reproduzir:**

- executar o projeto Playwright `mobile`;
- abrir o modal de novo plantao;
- informar datas como `31/02/2026`, `29/02/2026` ou `08/09/`;
- tentar clicar em `Salvar` para validar a mensagem.

**Erro observado:**

O teste esperava a mensagem `Informe uma data valida`, mas o clique em `Salvar` era bloqueado por campos do formulario e atingia timeout antes da validacao.

**Causa:**

O problema era de interacao e rolagem do modal, nao da regra de validacao das datas.

**Estado atual:** corrigido. O teste passou na ultima execucao.

## Problemas visuais observados fora da suite automatizada

### Alinhamento mobile

**Sintoma:** algumas paginas ficavam estreitas, desalinhadas ou com espaco vazio lateral.

**Condicao:** viewport mobile com regras de largura intrinseca e estilos responsivos parcialmente duplicados entre `styles.css` e `responsive.css`.

**Tratamento aplicado:** o shell mobile foi ajustado para ocupar a largura total da viewport, com `#root`, `.app-frame` e `.workspace` usando largura responsiva e `min-width: 0`.

**Observacao:** esse problema visual nao era coberto pelos testes E2E anteriores por uma assercao de pixels ou largura dos paineis. A suite validava navegacao e interacoes, nao equivalencia visual entre paginas.

### Diferenca entre localhost e GitHub Pages

**Sintoma:** a versao publicada apresentava layout diferente da versao local.

**Causa identificada:** o localhost continha alteracoes nao commitadas, enquanto o GitHub Pages estava publicado a partir de outro commit. Tambem havia diferenca entre os hashes dos assets e possivel cache do Pages/service worker.

**Como verificar:** comparar o commit publicado, os arquivos `index-*.js` e `index-*.css`, a API usada e o viewport do navegador.

## Regras para futuros registros

Para cada nova falha, registrar:

1. nome do teste e projeto do Playwright;
2. viewport e navegador;
3. passos minimos para reproduzir;
4. mensagem de erro completa resumida;
5. causa tecnica confirmada;
6. correcao aplicada;
7. comando usado para confirmar a correcao;
8. resultado final.

## Conclusao

As tres falhas mobile que anteriormente interrompiam os testes de datas nao existem mais na execucao atual. O registro acima preserva as condicoes e os motivos para evitar que o diagnostico seja perdido caso o problema volte a aparecer.
