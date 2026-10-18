# Documentos e ciência no cadastro

Status: MODELOS EM REVISÃO; validação obrigatória na interface implementada; comprovação protegida no servidor pendente.

## Implementação desta etapa

- Termos: `termos-de-uso.md`, página pública `/#/terms`.
- Aviso: `aviso-de-privacidade.md`, página pública `/#/privacy`.
- A aplicação exibe os próprios arquivos Markdown; não há cópia divergente do texto dentro do componente.
- Duas caixas separadas e inicialmente desmarcadas são exigidas no cadastro: aceite contratual e ciência de privacidade. Entrar em conta existente não cria um aceite retroativo.
- O formulário e o método `AuthContext.signUp` verificam a manifestação. A validação do contexto rejeita valores ausentes, não booleanos e versões antigas antes de chamar Supabase Auth.
- O cadastro encaminha somente os booleanos, versões e hashes SHA-256 dos textos em `options.data.legal_acknowledgment`. Não acrescenta IP, impressão digital do navegador, senha, e-mail ou relógio do dispositivo a esse objeto. E-mail e senha continuam sendo enviados exclusivamente nos campos necessários à autenticação.
- O campo Nome completo é obrigatório na interface de cadastro e validado também no contexto de autenticação. É encaminhado separadamente em `options.data.full_name`, usado no perfil e na saudação, sem integrar a declaração legal ou a telemetria. Contas existentes continuam acessando com e-mail e senha.
- Os hashes são calculados sobre UTF-8 com quebras LF, inclusive a quebra final. Testes detectam divergências entre os identificadores e os documentos exibidos. Não editar uma versão publicada em uso: preservar seu texto e criar nova versão.
- Os documentos também ficam acessíveis no login e em Meu perfil. Abrir um link durante o cadastro usa outra aba, para preservar o formulário.
- Nenhuma tabela, migration, policy, função SQL, configuração de Auth ou ambiente de produção foi alterado. Não há novos logs, eventos analíticos, traces ou atributos de telemetria.

## Limite que precisa ficar explícito

`user_metadata` pode ser alterado pelo próprio titular. Portanto, o registro desta etapa é uma declaração de cadastro, não um histórico de auditoria protegido contra edição. Um cliente externo pode chamar o signup público do Supabase sem passar pela interface e pelo contexto React. A API de negócio não usa esses metadados para conceder permissões. Não apresentar os testes de interface como prova de bloqueio no servidor nem como demonstração de conformidade integral.

## Próxima etapa proposta: registro protegido e exigência no provedor

Esta proposta exige autorização específica para alterações no banco e configuração do Supabase, conforme AGENTS.md, seções 3 e 4. Não há SQL aplicado nem migration criada nesta etapa.

1. Cadastrar no servidor um catálogo de documentos publicados, com tipo, versão, hash, texto arquivado e vigência. A versão de modelo não deve ser ativada para produção.
2. Configurar um mecanismo de validação no fluxo real de criação do usuário, preferencialmente um Auth Hook Before User Created. Ele deve exigir ambos os booleanos e versões/hashes ativos; aceitar somente dados declarativos mínimos. Cobrir cadastros diretos e, se futuramente habilitados, outros provedores de login. Exceções administrativas precisam de fluxo explícito, nunca aceite fabricado.
3. Registrar na mesma operação transacional de criação uma evidência protegida, com `user_id`, versões, hashes, tipo de manifestação e horário gerado pelo servidor. Um trigger de criação poderá copiar a declaração já validada, sem depender de relógio do cliente. Revisar a compatibilidade do hook e do trigger em ambiente isolado antes de ativá-los: falhas podem bloquear novos cadastros.
4. Habilitar RLS na tabela nova; titular consulta somente seus próprios registros; `anon` e `authenticated` não recebem permissão de inserir, atualizar ou excluir evidências. Escrita fica restrita ao mecanismo de registro. Acesso administrativo continua controlado e auditado. Não alterar RLS das tabelas existentes.
5. Não adicionar IP, user-agent, cookies, credenciais, dados financeiros ou clínicos à evidência. Definir fundamento e prazo de retenção, incluindo o tratamento de encerramento da conta, com o responsável jurídico; não presumir retenção ilimitada.
6. Para versões futuras, projetar manifestação autenticada em endpoint próprio e preservação de versões anteriores. Para contas antigas, apresentar aviso claro e fluxo específico, sem presumir aceite com base na continuidade do uso ou no cadastro anterior.

Validação necessária nessa próxima etapa: signup sem manifestação ou com versão antiga deve ser rejeitado pelo próprio provedor; cadastro válido deve gerar exatamente um registro; usuário não pode editar/apagar o histórico; uma conta não lê o registro de outra; falha de persistência não produz conta parcialmente registrada; versões anteriores permanecem consultáveis; encerramento segue a retenção aprovada. Testar com contas sintéticas em ambiente isolado antes de qualquer publicação.

## Antes de publicar os modelos

Responsável e canal público de privacidade foram informados pelo titular do projeto e incorporados aos modelos. Foi confirmada a gratuidade nesta primeira fase, sem cobrança futura automática. A revisão atual dos documentos é `2026-10-17-modelo.2`, com novos hashes correspondentes aos textos exibidos.

Concluir identificação e endereço aplicáveis, contato de suporte e avaliação sobre encarregado. Confirmar público e capacidade contratual; se o serviço passar a alcançar crianças ou adolescentes, realizar avaliação específica antes de habilitá-lo para esse público.

Confirmar inventário dos dados, países e regiões efetivos dos fornecedores, contratos e mecanismos de transferência internacional. Estabelecer tabela de retenção e expiração de backups, processo de exclusão e resposta a titulares e procedimento de incidentes. O modelo não cria essas rotinas por si só.

Avaliar o enquadramento do serviço no art. 15 do Marco Civil: a guarda de registros para provedores enquadrados tem finalidade e requisitos próprios e não é substituída por métricas HTTP. Não implementar coleta extra de IP como parte deste aceite.

Solicitar revisão jurídica dos textos e da operação. A documentação é um modelo baseado nas fontes abaixo e no código analisado; não garante atendimento a todas as normas, decisões ou situações concretas. Depois da revisão, remover os campos de modelo, atribuir nova versão final e novos hashes e preservar a versão anterior. Manter o aviso de revisão no cadastro enquanto os textos forem modelos.

## Referências oficiais consultadas em 17/10/2026

- [LGPD — Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm): princípios, fundamentos, informação, direitos e segurança. Ciência do Aviso não substitui base legal.
- [Direitos dos titulares — ANPD](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares): atendimento e formas de exercício dos direitos.
- [Marco Civil da Internet — Lei 12.965/2014](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm): privacidade, transparência e enquadramento da guarda de registros.
- [Código de Defesa do Consumidor — Lei 8.078/1990](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm): informação e preservação dos direitos obrigatórios, quando aplicável. Não foram inseridas exclusões gerais de responsabilidade ou renúncias.
- [Segurança da informação para agentes de pequeno porte — ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/anonimizado___guia_orientat-_seg_da_inf_p_atpp.pdf): controles e medidas operacionais; o porte não foi presumido para obter dispensas.
- [Cookies e proteção de dados pessoais — ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais): transparência e escolhas específicas sobre tecnologias opcionais.
- [Transferência internacional — ANPD e Resolução 19/2024](https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados): avaliação de mecanismos e garantias; não presumir que o aceite do usuário regulariza contratos de fornecedores.
- [Comunicação de incidente — ANPD e Resolução 15/2024](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis): avaliar risco ou dano relevante e as comunicações nos prazos e condições aplicáveis.
- [Signup e metadados — Supabase](https://supabase.com/docs/reference/javascript/auth-signup) e [gestão de usuários](https://supabase.com/docs/guides/auth/managing-user-data): comportamento do cadastro e cuidado com mecanismos que podem bloquear novas contas.

## Validação local sem contas reais

Executar `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`. Executar a suíte Playwright com `E2E_REAL_AUTH=false` e `VITE_API_BASE_URL=/api`. Os testes de cadastro interceptam o provedor para validar interface e payload; não comprovam envio de e-mail, persistência real ou exigência no servidor. Não criar contas, enviar e-mails ou alterar senhas reais para testar os modelos.

Abrir `http://localhost:5173/#/login`, selecionar Criar conta e verificar os links e as duas caixas desmarcadas. A leitura deve funcionar sem login, em telas estreitas e no Safari. Login e edição de perfil de contas existentes devem continuar funcionando.
