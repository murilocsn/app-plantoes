# AGENTS.md — Regras de trabalho do app-plantoes

## 1. Objetivo

Este arquivo define as regras que qualquer agente de IA deve seguir ao trabalhar neste repositório.

O objetivo é evoluir o sistema com segurança, preservando funcionalidades existentes e evitando alterações desnecessárias.

---

## 2. Regra principal

Antes de modificar qualquer arquivo:

1. Entenda a solicitação.
2. Analise a estrutura relacionada à tarefa.
3. Localize os arquivos envolvidos.
4. Verifique dependências e integrações.
5. Explique o que pretende alterar quando a mudança for significativa.
6. Faça a menor alteração necessária.
7. Execute os testes e verificações disponíveis.
8. Analise possíveis efeitos colaterais.
9. Informe exatamente quais arquivos foram alterados.

Nunca altere arquivos sem necessidade.

---

## 3. Proteção do projeto

Nunca:

- apagar arquivos sem justificativa;
- substituir grandes partes do projeto sem necessidade;
- reescrever a arquitetura inteira para resolver um problema pequeno;
- remover funcionalidades existentes sem autorização;
- alterar configurações críticas sem explicar o motivo;
- alterar o banco de dados sem autorização explícita;
- alterar políticas de segurança do Supabase sem autorização;
- expor credenciais, tokens, senhas ou chaves de API.

Arquivos `.env` e `.env.*` devem ser tratados como informações privadas.

Nunca reproduzir seus valores no chat, logs ou arquivos de documentação.

---

## 4. Supabase

O projeto utiliza Supabase.

Antes de modificar qualquer integração com Supabase:

1. Identificar onde a integração é utilizada.
2. Entender a autenticação atual.
3. Verificar como as consultas são realizadas.
4. Verificar as políticas de segurança relacionadas.
5. Evitar alterações destrutivas.

Não modificar tabelas, migrations, policies, funções ou configurações de produção sem autorização explícita.

---

## 5. Arquitetura

O projeto possui uma estrutura organizada em aplicações e pacotes.

Antes de criar um novo arquivo ou componente:

1. Verifique se já existe uma implementação equivalente.
2. Verifique se existe código compartilhado em `packages`.
3. Respeite a separação entre frontend e backend.
4. Evite duplicação de lógica.

Não mover arquivos entre `apps`, `packages` ou `legacy` sem necessidade.

---

## 6. Frontend

O frontend está localizado principalmente em:

`apps/web`

Ao modificar a interface:

- preservar responsividade;
- preservar acessibilidade;
- preservar funcionalidades existentes;
- reutilizar componentes existentes quando possível;
- evitar duplicação;
- verificar estados de carregamento;
- verificar estados de erro;
- verificar estados vazios;
- verificar comportamento em desktop e mobile.

---

## 7. Backend

O backend está localizado principalmente em:

`apps/api`

Ao modificar o backend:

- respeitar a arquitetura existente;
- reutilizar middleware existente;
- preservar tratamento de erros;
- validar entradas;
- não expor informações sensíveis;
- verificar autenticação e autorização;
- manter respostas consistentes.

---

## 8. Legacy

Existe uma pasta:

`legacy`

O código dentro dela deve ser tratado como legado.

Não modificar arquivos de `legacy` apenas para "organizar" o projeto.

Antes de alterar código legado:

1. verificar se ele ainda é utilizado;
2. identificar suas dependências;
3. explicar por que a alteração é necessária.

Não migrar código legado automaticamente.

---

## 9. Dependências

Antes de instalar uma nova dependência:

1. verificar se o projeto já possui uma solução equivalente;
2. verificar se a dependência é realmente necessária;
3. considerar o impacto no projeto;
4. explicar a necessidade.

Não instalar pacotes desnecessários.

---

## 10. Testes

Depois de uma alteração:

1. executar os testes relacionados;
2. executar lint quando disponível;
3. executar typecheck quando disponível;
4. executar build quando necessário.

Se algum teste falhar:

- identificar a causa;
- corrigir somente o necessário;
- executar novamente.

Nunca esconder erros apenas para fazer o teste passar.

---

## 11. Git

Antes de mudanças importantes:

- verificar o estado atual do Git;
- evitar sobrescrever alterações existentes do usuário;
- não executar `git reset --hard` sem autorização;
- não apagar branches;
- não fazer force push;
- não reescrever histórico.

Preferir mudanças pequenas e verificáveis.

---

## 12. Processo de desenvolvimento

Para tarefas pequenas:

Entender → Alterar → Testar → Explicar.

Para tarefas grandes:

Analisar → Planejar → Apresentar plano → Implementar por etapas → Testar → Revisar → Explicar.

Não implementar uma tarefa grande inteira de uma vez sem necessidade.

---

## 13. Antes de concluir uma tarefa

Verificar:

- funcionalidades afetadas;
- erros de TypeScript;
- erros de lint;
- testes;
- build;
- possíveis regressões;
- arquivos modificados;
- arquivos criados;
- arquivos removidos.

Ao finalizar, informar:

### Resumo

O que foi feito.

### Arquivos alterados

Lista dos arquivos modificados.

### Testes

Quais comandos foram executados e seus resultados.

### Observações

Qualquer problema ou risco identificado.

---

## 14. Regra de segurança

Quando houver dúvida sobre uma alteração potencialmente destrutiva, parar e pedir confirmação.

É preferível perguntar antes de destruir ou modificar algo importante.

---

## 15. Regra de contexto

O arquivo `project-context.txt` é apenas uma representação do projeto para análise.

Nunca editar `project-context.txt` para alterar o sistema.

As alterações devem ser feitas nos arquivos originais do repositório.

---

## 16. Prioridade

As prioridades são:

1. Segurança.
2. Preservação das funcionalidades existentes.
3. Correção.
4. Testabilidade.
5. Clareza.
6. Manutenibilidade.
7. Performance.
8. Novas funcionalidades.

Não sacrificar segurança ou estabilidade para implementar uma funcionalidade rapidamente.