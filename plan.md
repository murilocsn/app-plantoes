Você é um arquiteto de software.

Analise o repositório completo anexado e produza um plano de implementação em Markdown para esta tarefa:

Título: Implementar a funcionalidade "Plans" do Copilot (backend + frontend + migrations + testes)
Contexto / objetivo: adicionar um recurso "Plans" (planos/assinaturas) ao módulo features/copilot/plans para que usuários possam consultar, criar, atualizar e remover planos, e para que o frontend React possa listar planos, mostrar detalhes, permitir criação/edição por administradores e consumir a nova API Express. Deve respeitar a arquitetura existente (Express API + React frontend), usar padrões e tipos atuais do projeto, fornecer migrações do banco de dados e cobertura de testes automatizados.
Escopo funcional mínimo:
Backend (Express):
Endpoints REST para planos:
GET /api/copilot/plans — lista paginada de planos.
GET /api/copilot/plans/:id — detalhes de um plano.
POST /api/copilot/plans — criar plano (admin).
PUT /api/copilot/plans/:id — atualizar plano (admin).
DELETE /api/copilot/plans/:id — remover plano (admin).
Validação de entrada e respostas padronizadas.
Autorização: apenas usuários com role=admin podem criar/editar/deletar.
Mapeamento entre modelos DB e DTOs/response types.
Banco de dados:
Nova tabela plans com colunas: id (uuid), name (string), slug (string, único), description (text), price_cents (integer), currency (string), billing_interval (enum: monthly/annual), features (jsonb array), active (boolean), created_at, updated_at.
Índices em slug e active.
Migration up/down compatível (rollback).
Frontend (React):
Página /copilot/plans para listar planos (pública).
Componente PlanCard para exibir resumo.
Página/Modal de detalhes de plano /copilot/plans/:slug.
Painel admin (rota protegida) para criar/editar/remover planos.
Integração com a API: chamadas fetch/axios com tratamento de erros e loaders.
Tipos TypeScript para Plan e API responses.
Testes:
Backend: testes unitários para validação e autorização, testes de integração para os endpoints (in-memory DB ou test db).
Frontend: testes unitários do componente PlanCard e testes de integração/cypress para fluxo principal (listar, abrir detalhe).
Documentação e scripts:
Documentar endpoints em README ou Swagger/OpenAPI se existir padrão no repo.
Scripts de migração rodáveis (npm/yarn scripts ou CLI já usado no projeto).
Restrições / pressupostos:
Reutilizar ORM/DB layer existente (não propor novas tecnologias). Se o projeto usa knex/TypeORM/Prisma/Sequelize, usar a mesma.
Reutilizar sistema de autenticação/autorização existente (JWT/session/roles).
Manter compatibilidade com formatos de API e tipos existentes (respostas paginadas, headers, códigos HTTP).
Critérios de aceitação (objetivos):
Endpoints backend documentados e passando testes automatizados.
Migração criada que aplica e reverte cleanly (up/down).
Frontend exibe lista de planos e página de detalhe corretamente em dev com dados reais da API.
Admin consegue criar e editar planos via UI; mudanças persistem no banco.
Linters/formatters do repositório passam; pipeline CI verde.
Checklist de riscos mitigados (autorização, validação, rollbacks).
Entregáveis:
Código backend (rotas, controladores, modelos, validações, testes).
Migration SQL/JS (up/down).
Código frontend (páginas, componentes, hooks, tipos, testes).
Documentação curta no README/features/copilot/plans/README.md.
Plano de migração + rollback e comandos para validação.
Tempo estimado (orientativo): 2–4 dias de trabalho (depende do tamanho do projeto e infra de testes).
Observações para CLINE:
Ao implementar, sempre checar o padrão de rotas e a camada de serviços existente (ex.: controllers -> services -> repositories).
Reutilizar middleware de autorização existente para roles.
Usar as factories/fixtures já existentes para testes; não criar novo framework de testes.
Antes de abrir PR, rodar o script de checagem local (lint/test/build) do repositório.
O que eu já fiz aqui: produzi uma descrição de tarefa detalhada e pronta para o agente CLINE usar como entrada. Próximo passo que eu executarei assim que você enviar o repositório (ou confirmar o owner/repo/link):

Vou ler a árvore do repositório e cumprir os requisitos da inspeção (README, package.json, top-level dirs, arquivos representativos).
Vou gerar o plano de implementação em Markdown que você pediu (arquivos a alterar, funções/componentes/rotas/tipos, mudanças DB, compatibilidade frontend-API, riscos, migração/rollback, testes, critérios de conclusão) com referências precisas a arquivos e símbolos no repositório.
Se desejar, eu também posso criar um rascunho de PR com as mudanças mínimas de infraestrutura (migração vazia + tipos) para acelerar revisões.

Não escreva a implementação completa. Crie um plano preciso e executável, incluindo:

- arquivos que precisam ser alterados;
- funções, componentes, rotas e tipos envolvidos;
- mudanças no banco de dados;
- compatibilidade entre o frontend React e a API Express;
- riscos e possíveis regressões;
- estratégia de migração ou rollback;
- testes e comandos de validação;
- critérios objetivos de conclusão.

Considere a arquitetura existente e não proponha tecnologias novas sem justificar.
O plano deve ser suficientemente detalhado para outro agente executar sem precisar redescobrir o projeto.