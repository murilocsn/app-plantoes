# Lighthouse — dashboard e Plantões (01/11/2026)

## Escopo e método

Investigação dos relatórios enviados para o dashboard (`#/`) e Plantões
(`#/shifts`), sobre a versão integrada à `main` em `94ff82d`.

Comparação local do build de produção, com gzip, Lighthouse 13.6.0, perfil
móvel de 390 × 844 e simulação padrão de rede/CPU. Autenticação e respostas
da API foram simuladas com 14 plantões e pagamentos de demonstração. Portanto,
os tempos não medem a API do Render, o Supabase ou contas reais.

O axe-core 4.14.0 também verificou as duas telas em 390 e 1280 pixels, nos
temas claro e escuro: oito combinações. As ferramentas ficaram isoladas em
`node_modules/.cache/lighthouse-tools`, sem novas dependências do aplicativo.

## Causas e correções

- `ShiftCrudModals` importava o formulário e suas dependências mesmo fechado.
  Agora o formulário carrega na primeira abertura. O modal mostra um estado
  de carregamento anunciado e continua permitindo fechar durante a espera.
- A formatação monetária criava uma instância de `Intl.NumberFormat` por
  chamada. A instância agora é reutilizada nas linhas e nos resumos.
- Dias de outro mês usavam opacidade de 0,48, causando contraste de 3,05:1.
  Agora se distinguem pelo fundo, preservando a cor legível dos números.
- O selo Pago tinha contraste de 2,72:1. Seu texto passou a branco.
- Legendas sobre marcadores personalizados agora escolhem preto ou branco
  conforme a luminância do fundo, preservando as cores escolhidas pelo usuário.
- Os nomes acessíveis do calendário e dos links da marca foram alinhados ao
  texto visível, eliminando os apontamentos de nome/rótulo encontrados pelo axe.

## Resultados locais

| Métrica | Dashboard antes | Dashboard depois | Plantões antes | Plantões depois |
| --- | ---: | ---: | ---: | ---: |
| JavaScript transferido | 187,9 KiB | 156,4 KiB | 190,8 KiB | 160,2 KiB |
| Trabalho na thread principal | 2.177 ms | 1.676 ms | 2.354 ms | 1.547 ms |
| Tempo total de bloqueio (TBT) | 635 ms | 309 ms | 746 ms | 273 ms |
| Desempenho Lighthouse | 84 | 91 | 81 | 95 |
| Acessibilidade Lighthouse | 95 | 100 | 96 | 100 |
| Auditoria de contraste | Reprovada | Aprovada | Reprovada | Aprovada |

São execuções pontuais, sujeitas à variação da máquina e do laboratório.
O LCP do dashboard foi 0,79 s antes e variou de 0,77 a 2,55 s nas duas rodadas
posteriores. Na rodada final, o candidato identificado foi o título
“Plantoes por unidade”. Não há conclusão de melhora de LCP do dashboard.
Em Plantões, o LCP medido passou de 2,23 para 0,78 s. Nenhuma dessas medições
substitui uma comparação autenticada de usuários reais em produção.

As oito verificações finais do axe não apresentaram violações das regras
WCAG A/AA selecionadas. Isso descreve o escopo automatizado dessas telas,
não uma certificação de acessibilidade completa do aplicativo.

## Alertas que permanecem

Requisições públicas ao HTML e ao JavaScript publicado no GitHub Pages
confirmaram `Cache-Control: max-age=600`. O servidor local reproduziu esse
cabeçalho. O aplicativo não configura os cabeçalhos HTTP do Pages; aumentar
essa validade depende da camada de hospedagem/CDN. Não foi criado cache de
respostas financeiras nem alterado o service worker.

O Lighthouse ainda aponta aproximadamente 73 KiB de JavaScript não utilizado
no arquivo inicial. A melhoria desta atualização é reduzir o código baixado
antes da interação; o alerta do arquivo inicial continua. A folha de estilos
inicial também continua bloqueando a renderização. Não foram removidas
validações, estilos ou funcionalidades para ocultar esses avisos.

## Verificação funcional

- 79 testes unitários do frontend aprovados, incluindo sete casos novos para
  o contraste dos marcadores.
- Typecheck dos workspaces, lint e build de produção do frontend aprovados.
- 42 cenários relevantes de navegador verificados entre desktop, Chromium
  móvel e Safari móvel. A primeira execução identificou um seletor ambíguo
  no teste novo de desktop; após restringi-lo à lista de plantões, os três
  cenários desse teste passaram. Os outros 41 cenários já haviam passado.
- O teste novo confirma que agenda e lista não solicitam o formulário antes
  da interação, permitem fechar durante o carregamento e reabrem o formulário.
- Conferência visual dos temas e tamanhos de tela com dados simulados.

Relatórios JSON/HTML, capturas e logs locais estão em
`node_modules/.cache/lighthouse-audit`, fora da distribuição do aplicativo.
Não houve alterações em autenticação, API, banco de dados ou políticas.

## Referências

- [React: carregamento adiado com lazy e Suspense](https://react.dev/reference/react/lazy)
- [WCAG: contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Chrome: validade de cache](https://developer.chrome.com/docs/performance/insights/cache)
