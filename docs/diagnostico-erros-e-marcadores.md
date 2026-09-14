# Diagnostico de erros e marcadores dos plantoes

## Status atual

- E2E completo: 18 de 18 testes passaram.
- Testes unitarios: 57 passaram (20 API, 12 web e 25 shared).
- Typecheck: passou em API, web e shared.
- O build do frontend foi validado anteriormente com sucesso.

## Erros encontrados e motivos

### 1. Testes E2E mobile falhando no modal

**Sintoma:** os testes nao conseguiam clicar em `Repetir plantao` ou `Salvar`. O Playwright informava que campos como `select[name=location_id]`, `input[name=value]` e o formulario interceptavam o clique.

**Causa:** o formulario do plantao foi colocado dentro de `.modal-content`, mas o CSS mobile mantinha uma combinacao incorreta de `height: 0`, `overflow` e flexbox. O formulario ficava maior que a area visivel e o scroll nao levava o controle para uma regiao realmente clicavel.

**Correcao:** o modal voltou a ser o unico contenedor rolavel em telas pequenas. O conteudo interno deixou de impor um scroll independente. Com isso, `scrollIntoViewIfNeeded()` consegue posicionar corretamente os controles.

**Resultado:** os quatro testes do fluxo de datas mobile passaram, e a suite completa passou com 18/18.

### 2. Erro potencial ao usar os marcadores antes da migration

**Sintoma esperado:** a API pode retornar erro do Supabase dizendo que `marker_color` ou `marker_label` nao existem na tabela `shifts`.

**Causa:** as rotas de dashboard e plantao ja incluem essas colunas nos selects e nas operacoes de insert/update, mas elas so existem depois da aplicacao da migration `database/migrations/004_shift_markers.sql`.

**Acao necessaria:** aplicar a migration no banco utilizado pelo ambiente antes de publicar o frontend/API.

A migration e segura para dados existentes porque usa `add column if not exists` e permite valores nulos.

### 3. Validacao de resposta e validacao de entrada nao estao totalmente uniformes

**Observacao:** `shiftInputSchema` valida `marker_color` como hexadecimal de seis digitos e limita `marker_label` a 80 caracteres. Ja `shiftSchema`, usado para representar dados retornados, aceita os dois campos como texto nullable sem aplicar as mesmas regras.

**Risco:** dados antigos ou dados inseridos por outro cliente podem chegar ao frontend com cor invalida ou legenda acima do limite. A constraint do banco protege a persistencia da cor e da legenda, mas a tipagem/validacao compartilhada fica menos consistente.

**Recomendacao:** reutilizar os schemas de marcador tambem em `shiftSchema`, mantendo a mesma regra entre entrada, resposta e banco.

### 4. Compatibilidade com dados antigos

**Comportamento atual:** plantao sem `marker_color` usa uma cor calculada a partir da legenda ou do local. Portanto, registros antigos continuam visiveis sem exigir preenchimento imediato.

**Ponto de atencao:** essa cor de fallback e calculada no frontend e nao representa uma cor persistida. Para padronizar definitivamente os dados existentes, sera necessario um backfill opcional depois da migration.

### 5. Cor e legenda agora pertencem ao plantao

**Decisao aplicada:** a cor e a legenda foram movidas do conceito de unidade/local para os campos do proprio plantao:

- `marker_color`
- `marker_label`

Isso permite que dois plantoes da mesma unidade tenham cores ou significados diferentes, como `UTI`, `extra`, `pediatria` ou outro criterio definido pelo usuario.

A selecao ocorre no formulario do plantao, com paleta pronta e cor personalizada. O calendario usa a cor persistida de cada plantao.

## Arquivos relacionados

- `database/migrations/004_shift_markers.sql`: adiciona e protege as colunas dos marcadores.
- `apps/api/src/routes/shifts.ts`: persiste os marcadores ao criar e editar.
- `apps/api/src/routes/dashboard.ts`: retorna os marcadores no dashboard.
- `packages/shared/src/schemas.ts`: valida os campos de entrada.
- `apps/web/src/components/forms/ShiftForm.tsx`: permite escolher cor e legenda.
- `apps/web/src/components/CalendarMonth.tsx`: exibe a cor e a legenda do plantao.
- `apps/web/src/responsive.css`: corrige a rolagem do modal em telas pequenas.

## Conclusao

Os erros que derrubavam os testes E2E foram corrigidos e a suite esta verde. Antes de usar os marcadores em ambiente conectado ao Supabase, a migration 004 deve ser aplicada. Depois disso, recomenda-se uniformizar a validacao de `shiftSchema` para reduzir a possibilidade de dados inconsistentes vindos de clientes antigos ou integracoes externas.
