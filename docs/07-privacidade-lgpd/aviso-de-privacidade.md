# Aviso de Privacidade

MODELO EM REVISÃO — versão 2026-10-17-modelo.2. Este texto descreve o código analisado e contém campos pendentes. A identificação complementar, o atendimento, a retenção e os contratos dos fornecedores precisam ser confirmados antes de publicação. Não é uma certificação de conformidade com a LGPD.

## 1. Quem responde pelo tratamento

Controlador: Murilo Chaves Silva Neder. Identificação e endereço: [IDENTIFICAÇÃO LEGAL E ENDEREÇO APLICÁVEIS]. Canal público para direitos e privacidade: muriloneder39@gmail.com. Encarregado, se designado: [IDENTIFICAÇÃO E CONTATO OU CANAL DO RESPONSÁVEL CONFORME ENQUADRAMENTO].

O controlador define as finalidades do tratamento e deve avaliar as obrigações legais aplicáveis à operação. A contratação de fornecedores de tecnologia não transfere essas responsabilidades ao usuário.

## 2. Informações utilizadas pelo aplicativo

- Conta: identificador do usuário, e-mail, nome de exibição quando informado, dados necessários à autenticação e sessão e manifestações declaradas no cadastro com as versões dos documentos.
- Rotina profissional: datas, horários, duração, locais, marcadores, descrições e observações dos plantões cadastrados.
- Organização financeira: valores previstos, recebimentos, vencimentos, situação de pagamento e despesas inseridos pelo usuário. Esses registros podem revelar aspectos da sua vida financeira e exigem proteção, ainda que não sejam automaticamente dados sensíveis na definição legal da LGPD.
- Compartilhamento: informações de espaços, membros e despesas que o usuário registrar nas funções disponíveis.
- Lembretes opcionais: inscrição no serviço de notificações, endpoint e chaves técnicas de entrega, além dos dados do plantão necessários ao lembrete, quando a funcionalidade estiver ativada.
- Operação técnica: métricas HTTP limitadas a método, template de rota autorizado, status, duração e condição técnica de interrupção, além da identificação do serviço e do ambiente de execução.

O aplicativo não solicita dados de pacientes e não deve ser usado para armazená-los. Não insira dados clínicos identificáveis, documentos pessoais de terceiros, senhas de outros serviços, números completos de cartões ou credenciais bancárias nos campos livres. A senha de acesso é enviada ao Supabase Auth para autenticação; o aplicativo não a inclui em métricas nem a armazena em seus registros de negócio.

## 3. Finalidades e bases legais

Como proposta para revisão do controlador, o tratamento necessário à criação da conta, autenticação, organização dos registros e entrega das funcionalidades solicitadas fundamenta-se na execução do serviço contratado, conforme o art. 7º, V, da LGPD. Obrigações legais específicas e exercício regular de direitos podem justificar a conservação limitada de determinados registros, nos termos do art. 7º, II e VI.

Métricas técnicas são minimizadas para acompanhar disponibilidade e corrigir falhas. Se a operação de segurança envolver dados pessoais e utilizar legítimo interesse, o controlador deverá documentar necessidade, balanceamento e salvaguardas antes de adotar essa base. A permissão do navegador para notificações é opcional e não autoriza outras finalidades.

O aceite contratual e a ciência deste Aviso não constituem consentimento abrangente. Qualquer finalidade opcional que dependa de consentimento deverá ter escolha específica, separada e revogável. Não há, nesta implementação, adesão automática a publicidade, venda de dados ou treinamento de modelos de IA.

## 4. Fornecedores e compartilhamento

O frontend é disponibilizado no GitHub Pages. O Supabase fornece autenticação, banco de dados e, quando utilizada, execução de lembretes. A API é executada no Render. O Grafana Cloud recebe as métricas HTTP configuradas no backend. Os serviços de push do navegador participam da entrega de notificações opcionais.

Nas métricas do aplicativo não são enviados tokens, cookies, IPs, URLs completas, query strings, corpos de requisição ou resposta, nome, e-mail, identificador de usuário ou dados clínicos e financeiros. A fase atual não envia traces nem logs remotos pelo OpenTelemetry. Logs locais da API também usam apenas os atributos HTTP autorizados e a duração.

Essa limitação da instrumentação não significa ausência de tratamento técnico pelos fornecedores de hospedagem e autenticação. Eles podem processar endereço IP e registros próprios de segurança e acesso ao atender conexões. Suas configurações, contratos, acesso administrativo e retenção precisam ser verificados pelo controlador. O aplicativo não adiciona coleta de IP para a ciência dos documentos.

Informações também podem ser disponibilizadas aos participantes que tenham acesso autorizado às funções de compartilhamento utilizadas, ou a autoridades quando houver obrigação legal válida. Pedidos de autoridades devem ser avaliados e limitados ao necessário.

## 5. Localização e transferência internacional

Os fornecedores podem executar atividades fora do Brasil. [CONFIRMAR PAÍSES, REGIÕES, DESTINATÁRIOS E MECANISMOS DE TRANSFERÊNCIA DE CADA FORNECEDOR ANTES DA PUBLICAÇÃO]. Não foi verificada nesta etapa a região efetivamente contratada nem a incorporação de cláusulas específicas aos contratos.

O controlador deve verificar as bases e os mecanismos exigidos para cada transferência internacional, inclusive a regulamentação da ANPD. Marcar a ciência deste Aviso não substitui essa verificação nem representa consentimento específico para toda transferência.

## 6. Armazenamento no dispositivo e notificações

O navegador mantém a sessão de autenticação no armazenamento local para permitir o acesso, além de preferências como tema e cores do calendário. A aplicação usa service worker para receber notificações quando ativadas. Evite manter sessões em dispositivos compartilhados e saia da conta ao terminar o uso nesses dispositivos.

Na implementação analisada não foi adicionado rastreador publicitário ou ferramenta de gravação de sessões. Tecnologias opcionais futuras que dependam de consentimento deverão oferecer controles próprios antes de sua ativação.

## 7. Conservação e exclusão

Os dados de rotina são usados enquanto necessários ao serviço e ao atendimento dos direitos do usuário. O controlador deverá definir e aplicar uma tabela de retenção por finalidade, incluindo conta inativa, notificações, manifestações no cadastro, logs dos fornecedores e backups. Não há nesta alteração uma rotina nova de exclusão automática.

[DEFINIR ANTES DA PUBLICAÇÃO: CRITÉRIOS E PRAZOS DE RETENÇÃO POR CATEGORIA, PRAZO OPERACIONAL DE ENCERRAMENTO E CICLO DE EXPIRAÇÃO DOS BACKUPS]. A retenção excepcional deverá ter fundamento e acesso restrito. Registros conservados exclusivamente por obrigação legal ou defesa de direitos não devem continuar disponíveis para finalidades incompatíveis.

Quando aplicável ao enquadramento do serviço, a guarda de registros de acesso prevista no Marco Civil da Internet deve ser analisada separadamente. Não se confunde com métricas e não foi implementada por este aceite. O modelo não determina coleta adicional de IP.

## 8. Seus direitos e como solicitar

Pelo canal de privacidade, o titular pode solicitar confirmação e acesso, correção, informação sobre compartilhamentos e consentimento, anonimização, bloqueio ou eliminação quando cabíveis, portabilidade conforme a regulamentação e revogação de consentimentos específicos. Também pode apresentar oposição nas hipóteses legais e solicitar revisão de decisões exclusivamente automatizadas que afetem seus interesses, quando existentes.

Nome, e-mail e senha podem ser alterados em Meu perfil. As demais solicitações, inclusive encerramento da conta e cópia integral, precisam de atendimento pelo responsável; sair da conta ou exportar um relatório CSV não realiza essas operações automaticamente. Poderá ser necessária verificação proporcional da identidade, sem solicitar a senha nem documentos excessivos.

A confirmação e o acesso simplificado devem ser atendidos imediatamente; a declaração completa de acesso observa o prazo legal de até 15 dias, ressalvadas regras específicas aplicáveis. Outros pedidos serão tratados conforme a natureza e os prazos legalmente pertinentes. O titular pode recorrer à ANPD e, quando cabível, aos órgãos de defesa do consumidor.

## 9. Proteção e incidentes

O código utiliza autenticação Supabase, validação de entradas e acesso ao banco no contexto do usuário, preservando as políticas RLS existentes. A existência desses controles não elimina riscos e não equivale a auditoria integral dos ambientes de produção. O responsável deve controlar acessos administrativos, proteger segredos, manter dependências e verificar backups e configurações dos fornecedores.

Em caso de incidente com risco ou dano relevante, o controlador deve avaliar e realizar as comunicações exigíveis à ANPD e aos titulares conforme a legislação e o regulamento vigente, além de registrar e tratar o ocorrido. Suspeitas podem ser encaminhadas ao canal de privacidade sem anexar senhas ou dados clínicos.

## 10. Atualizações e versões

Mudanças relevantes deverão ser informadas com destaque e versão identificada. Novas finalidades não são autorizadas automaticamente pela ciência dada no cadastro. As versões substituídas devem permanecer disponíveis para consulta. Os metadados de ciência utilizados nesta fase são editáveis pelo usuário; seu uso como evidência protegida exige controles adicionais no servidor, ainda não implementados.
