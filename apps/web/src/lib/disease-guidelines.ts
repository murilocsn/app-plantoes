export type GuidelineSource = {
  label: string;
  organization: string;
  url: string;
};

export type DiseaseGuideline = {
  id: string;
  title: string;
  category: "Urgencia" | "Infecciosas" | "Cronicas" | "Pediatria" | "Saude publica";
  summary: string;
  checkpoints: string[];
  searchTerms: string[];
  sources: GuidelineSource[];
};

const pcdtUrl =
  "https://www.gov.br/conitec/pt-br/assuntos/avaliacao-de-tecnologias-em-saude/protocolos-clinicos-e-diretrizes-terapeuticas/pcdt";
const whoGuidelinesUrl = "https://www.who.int/publications/who-guidelines";
const niceConditionsUrl = "https://www.nice.org.uk/guidance/conditions-and-diseases";
const cdcClinicalUrl = "https://www.cdc.gov/clinical-guidance/";
const pahoDocumentsUrl = "https://www.paho.org/en/technical-documents";
const guidelinesPtUrl = "https://guidelines.pt/guidelines/";

function pubmedQuery(term: string) {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term)}`;
}

export const diseaseGuidelines: DiseaseGuideline[] = [
  {
    id: "sepse",
    title: "Sepse e choque septico",
    category: "Urgencia",
    summary:
      "Referencia rapida para localizar diretrizes de reconhecimento precoce, estratificacao de gravidade e manejo inicial conforme protocolo local.",
    checkpoints: [
      "Sinais de choque, disfuncao organica e necessidade de atendimento imediato.",
      "Coleta de culturas, antimicrobiano, fluidos e reavaliacao devem seguir protocolo institucional.",
      "Verificar populacoes especiais: gestantes, criancas, imunossuprimidos e idosos.",
    ],
    searchTerms: ["sepse", "choque septico", "sepsis", "emergencia"],
    sources: [
      { label: "WHO guidelines", organization: "World Health Organization", url: whoGuidelinesUrl },
      {
        label: "NICE sepsis search",
        organization: "NICE",
        url: "https://www.nice.org.uk/search?q=sepsis",
      },
      {
        label: "Revisoes no PubMed",
        organization: "National Library of Medicine",
        url: pubmedQuery("sepsis guideline systematic review"),
      },
    ],
  },
  {
    id: "dengue",
    title: "Dengue, chikungunya, zika e febre amarela",
    category: "Infecciosas",
    summary:
      "Fontes para classificacao de risco, sinais de alarme, hidratacao, vigilancia e notificacao de arboviroses.",
    checkpoints: [
      "Identificar sinais de alarme e criterios de encaminhamento.",
      "Evitar condutas contraindicadas e revisar risco de sangramento.",
      "Conferir boletins e orientacoes locais de vigilancia epidemiologica.",
    ],
    searchTerms: ["dengue", "arbovirose", "chikungunya", "zika", "febre amarela"],
    sources: [
      { label: "PAHO technical documents", organization: "PAHO/WHO", url: pahoDocumentsUrl },
      {
        label: "WHO dengue topic",
        organization: "World Health Organization",
        url: "https://www.who.int/health-topics/dengue-and-severe-dengue",
      },
      { label: "PCDT e protocolos SUS", organization: "Ministerio da Saude", url: pcdtUrl },
    ],
  },
  {
    id: "pneumonia",
    title: "Pneumonia e infeccoes respiratorias",
    category: "Infecciosas",
    summary:
      "Direciona para avaliacao de gravidade, criterios de internacao, microbiologia provavel e uso racional de antimicrobianos.",
    checkpoints: [
      "Estratificar gravidade, saturacao, comorbidades e risco de deterioracao.",
      "Conferir guideline local de antibiotico e resistencia antimicrobiana.",
      "Separar adulto, pediatria, gestante e imunossuprimido.",
    ],
    searchTerms: ["pneumonia", "infeccao respiratoria", "antibiotico", "dispneia"],
    sources: [
      { label: "CDC clinical guidance", organization: "CDC", url: cdcClinicalUrl },
      { label: "WHO guidelines", organization: "World Health Organization", url: whoGuidelinesUrl },
      {
        label: "PubMed pneumonia guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery("pneumonia guideline antimicrobial stewardship"),
      },
    ],
  },
  {
    id: "tuberculose",
    title: "Tuberculose",
    category: "Infecciosas",
    summary:
      "Fontes para diagnostico, notificacao, tratamento, acompanhamento, resistencia e rastreio de contatos.",
    checkpoints: [
      "Checar criterio diagnostico, baciloscopia, TRM-TB, cultura e teste de sensibilidade.",
      "Notificacao, rastreio de contatos e adesao sao parte da conduta.",
      "Diferenciar TB sensivel, resistente, latente, HIV e populacoes vulneraveis.",
    ],
    searchTerms: ["tuberculose", "tb", "hiv", "resistencia"],
    sources: [
      { label: "PCDT e protocolos SUS", organization: "Ministerio da Saude", url: pcdtUrl },
      {
        label: "WHO TB publications",
        organization: "World Health Organization",
        url: "https://www.who.int/teams/global-tuberculosis-programme/tb-reports",
      },
      {
        label: "PubMed tuberculosis guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery("tuberculosis clinical practice guideline"),
      },
    ],
  },
  {
    id: "diabetes",
    title: "Diabetes mellitus",
    category: "Cronicas",
    summary:
      "Guidelines para diagnostico, metas, hipoglicemia, complicacoes, risco cardiovascular e acompanhamento longitudinal.",
    checkpoints: [
      "Individualizar metas por idade, comorbidades, risco de hipoglicemia e fragilidade.",
      "Checar rastreio de rim, retina, pes diabeticos e risco cardiovascular.",
      "Distinguir acompanhamento ambulatorial de descompensacao aguda.",
    ],
    searchTerms: ["diabetes", "hipoglicemia", "cetoacidose", "metas glicemicas"],
    sources: [
      { label: "PCDT e protocolos SUS", organization: "Ministerio da Saude", url: pcdtUrl },
      {
        label: "NICE diabetes guidance",
        organization: "NICE",
        url: `${niceConditionsUrl}/diabetes-and-other-endocrinal--nutritional-and-metabolic-conditions/diabetes`,
      },
      { label: "WHO guidelines", organization: "World Health Organization", url: whoGuidelinesUrl },
    ],
  },
  {
    id: "hipertensao",
    title: "Hipertensao arterial",
    category: "Cronicas",
    summary:
      "Fontes para confirmacao diagnostica, risco cardiovascular, tratamento, seguimento e crise hipertensiva.",
    checkpoints: [
      "Diferenciar urgencia, emergencia hipertensiva e acompanhamento ambulatorial.",
      "Confirmar medidas, lesao de orgao-alvo e risco cardiovascular global.",
      "Ajustar conduta a idade, gestacao, DRC, diabetes e comorbidades.",
    ],
    searchTerms: ["hipertensao", "pressao alta", "emergencia hipertensiva"],
    sources: [
      {
        label: "WHO hypertension guideline",
        organization: "World Health Organization",
        url: "https://www.who.int/publications/i/item/9789240033986",
      },
      { label: "PCDT e protocolos SUS", organization: "Ministerio da Saude", url: pcdtUrl },
      {
        label: "NICE hypertension search",
        organization: "NICE",
        url: "https://www.nice.org.uk/search?q=hypertension",
      },
    ],
  },
  {
    id: "asma-dpoc",
    title: "Asma e DPOC",
    category: "Cronicas",
    summary:
      "Consulta rapida para exacerbacoes, controle de sintomas, inaladores, oxigenoterapia e criterios de gravidade.",
    checkpoints: [
      "Separar crise/exacerbacao de controle ambulatorial.",
      "Avaliar saturacao, esforco respiratorio, resposta ao broncodilatador e sinais de falencia.",
      "Revisar tecnica inalatoria, gatilhos e plano de acao.",
    ],
    searchTerms: ["asma", "dpoc", "exacerbacao", "sibilancia"],
    sources: [
      {
        label: "NICE respiratory guidance",
        organization: "NICE",
        url: `${niceConditionsUrl}/respiratory-conditions`,
      },
      { label: "CDC clinical guidance", organization: "CDC", url: cdcClinicalUrl },
      {
        label: "PubMed asthma COPD guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery("asthma COPD guideline exacerbation"),
      },
    ],
  },
  {
    id: "avc",
    title: "AVC e AIT",
    category: "Urgencia",
    summary:
      "Fontes para reconhecimento, janela terapeutica, imagem, encaminhamento e prevencao secundaria.",
    checkpoints: [
      "Tempo de inicio dos sintomas e escala neurologica mudam a conduta.",
      "Ativar linha de cuidado local para imagem e terapia tempo-dependente.",
      "Checar criterios de exclusao, anticoagulantes e glicemia capilar.",
    ],
    searchTerms: ["avc", "ait", "deficit neurologico", "trombolise"],
    sources: [
      {
        label: "NICE stroke guidance",
        organization: "NICE",
        url: `${niceConditionsUrl}/cardiovascular-conditions/stroke-and-transient-ischaemic-attack`,
      },
      { label: "WHO guidelines", organization: "World Health Organization", url: whoGuidelinesUrl },
      {
        label: "PubMed stroke guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery("stroke guideline acute management"),
      },
    ],
  },
  {
    id: "dor-toracica",
    title: "Dor toracica e sindrome coronariana aguda",
    category: "Urgencia",
    summary:
      "Direciona para estratificacao de risco, ECG, biomarcadores, sinais de instabilidade e fluxo de emergencia.",
    checkpoints: [
      "ECG precoce, instabilidade e tempo de sintomas definem prioridade.",
      "Diferenciar causas cardiacas, respiratorias, vasculares e gastrointestinais.",
      "Seguir linha de cuidado local para SCA e dor toracica.",
    ],
    searchTerms: ["dor toracica", "iam", "sindrome coronariana", "ecg"],
    sources: [
      {
        label: "NICE chest pain search",
        organization: "NICE",
        url: "https://www.nice.org.uk/search?q=chest%20pain",
      },
      { label: "PCDT e protocolos SUS", organization: "Ministerio da Saude", url: pcdtUrl },
      {
        label: "PubMed ACS guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery("acute coronary syndrome guideline chest pain"),
      },
    ],
  },
  {
    id: "pediatria-febre",
    title: "Febre e sinais de perigo em pediatria",
    category: "Pediatria",
    summary:
      "Fontes para triagem, sinais de alarme, desidratacao, infeccoes comuns e encaminhamento pediatrico.",
    checkpoints: [
      "Idade, estado geral, perfusao, hidratacao e sinais respiratorios mudam o risco.",
      "Lactentes pequenos e imunossuprimidos precisam de limiar menor para avaliacao presencial.",
      "Usar protocolo pediatrico local e estrategia IMCI/AIDPI quando aplicavel.",
    ],
    searchTerms: ["febre", "pediatria", "crianca", "sinais de perigo", "aidpi"],
    sources: [
      {
        label: "WHO IMCI",
        organization: "World Health Organization",
        url: "https://www.who.int/teams/maternal-newborn-child-adolescent-health-and-ageing/child-health/integrated-management-of-childhood-illness",
      },
      {
        label: "NICE child fever search",
        organization: "NICE",
        url: "https://www.nice.org.uk/search?q=fever%20child",
      },
      { label: "PCDT e protocolos SUS", organization: "Ministerio da Saude", url: pcdtUrl },
    ],
  },
  {
    id: "hiv-ist",
    title: "HIV, ISTs e hepatites virais",
    category: "Saude publica",
    summary:
      "Base para rastreio, profilaxia, tratamento, notificacao, coinfeccoes e aconselhamento.",
    checkpoints: [
      "Definir se a situacao envolve exposicao recente, profilaxia, rastreio ou tratamento.",
      "Checar janela imunologica, testagem combinada e notificacao quando aplicavel.",
      "Revisar interacoes, gestacao, coinfeccoes e adesao.",
    ],
    searchTerms: ["hiv", "ist", "hepatite", "prep", "pep"],
    sources: [
      { label: "PCDT e protocolos SUS", organization: "Ministerio da Saude", url: pcdtUrl },
      {
        label: "WHO HIV guidelines",
        organization: "World Health Organization",
        url: "https://www.who.int/teams/global-hiv-hepatitis-and-stis-programmes/hiv/treatment",
      },
      { label: "CDC clinical guidance", organization: "CDC", url: cdcClinicalUrl },
    ],
  },
  {
    id: "cirrose",
    title: "Cirrose, hepatopatia cronica e hipertensao portal",
    category: "Cronicas",
    summary:
      "Fontes para avaliacao de cirrose, etiologias, compensacao/descompensacao, rastreio de complicacoes e encaminhamento especializado.",
    checkpoints: [
      "Diferenciar cirrose compensada de descompensada: ascite, sangramento varicoso, encefalopatia, ictericia ou infeccao.",
      "Revisar etiologia provavel: hepatites virais, alcool, esteatose/metabolica, autoimune, medicamentosa e outras causas.",
      "Checar rastreio de carcinoma hepatocelular, varizes esofagicas, vacinas, funcao renal, coagulopatia e criterios de encaminhamento.",
    ],
    searchTerms: [
      "cirrose",
      "cirrhosis",
      "hepatopatia cronica",
      "fibrose hepatica",
      "hipertensao portal",
      "ascite",
      "encefalopatia hepatica",
      "varizes esofagicas",
      "carcinoma hepatocelular",
      "hepatite b",
      "hepatite c",
    ],
    sources: [
      {
        label: "NICE cirrhosis NG50",
        organization: "NICE",
        url: "https://www.nice.org.uk/guidance/ng50/chapter/Recommendations",
      },
      { label: "PCDT e protocolos SUS", organization: "Ministerio da Saude", url: pcdtUrl },
      {
        label: "WHO hepatitis topic",
        organization: "World Health Organization",
        url: "https://www.who.int/health-topics/hepatitis",
      },
      {
        label: "CDC viral hepatitis overview",
        organization: "CDC",
        url: "https://www.cdc.gov/hepatitis/hcp/clinical-overview/index.html",
      },
      {
        label: "PubMed cirrhosis guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery(
          "cirrhosis clinical practice guideline portal hypertension ascites encephalopathy",
        ),
      },
    ],
  },
  {
    id: "insuficiencia-cardiaca",
    title: "Insuficiencia cardiaca",
    category: "Cronicas",
    summary:
      "Fontes para diagnostico, sinais de congestao, descompensacao, ajuste terapeutico, seguimento e encaminhamento.",
    checkpoints: [
      "Diferenciar estabilidade ambulatorial de descompensacao aguda com congestao, hipoxemia ou choque.",
      "Revisar fracao de ejecao, funcao renal, potassio, pressao arterial, adesao e gatilhos de descompensacao.",
      "Checar indicacao de terapia modificadora de prognostico, vacinacao, reabilitacao e seguimento especializado.",
    ],
    searchTerms: [
      "insuficiencia cardiaca",
      "heart failure",
      "ic",
      "congestao",
      "edema",
      "dispneia",
    ],
    sources: [
      {
        label: "NICE heart failure guidance",
        organization: "NICE",
        url: "https://www.nice.org.uk/guidance/ng106",
      },
      { label: "WHO guidelines", organization: "World Health Organization", url: whoGuidelinesUrl },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
      {
        label: "PubMed heart failure guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery("heart failure clinical practice guideline"),
      },
    ],
  },
  {
    id: "doenca-renal-cronica",
    title: "Doenca renal cronica e injuria renal aguda",
    category: "Cronicas",
    summary:
      "Fontes para estratificacao por eTFG/albuminuria, injuria renal aguda, ajuste de medicamentos e criterios de encaminhamento.",
    checkpoints: [
      "Separar DRC estavel de injuria renal aguda, hipercalemia, acidose, sobrecarga volêmica ou uremia.",
      "Revisar medicamentos nefrotoxicos, dose por funcao renal, diabetes, hipertensao e albuminuria.",
      "Checar criterios de urgencia dialitica e necessidade de nefrologia.",
    ],
    searchTerms: [
      "doenca renal cronica",
      "drc",
      "injuria renal aguda",
      "ira",
      "rim",
      "renal",
      "hipercalemia",
    ],
    sources: [
      {
        label: "NICE chronic kidney disease",
        organization: "NICE",
        url: "https://www.nice.org.uk/guidance/ng203",
      },
      {
        label: "NICE acute kidney injury",
        organization: "NICE",
        url: "https://www.nice.org.uk/guidance/ng148",
      },
      { label: "PCDT e protocolos SUS", organization: "Ministerio da Saude", url: pcdtUrl },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
    ],
  },
  {
    id: "itu-pielonefrite",
    title: "Infeccao urinaria, pielonefrite e prostatite",
    category: "Infecciosas",
    summary:
      "Fontes para diferenciar cistite, pielonefrite, infeccao complicada, gestacao, homem e risco de sepse.",
    checkpoints: [
      "Checar febre, dor lombar, vomitos, gestacao, obstrucao, imunossupressao e sinais de sepse.",
      "Revisar cultura, resistencia local, alergias e antibiotico previo.",
      "Diferenciar cistite simples de pielonefrite, prostatite e infeccao associada a cateter.",
    ],
    searchTerms: ["itu", "infeccao urinaria", "pielonefrite", "prostatite", "disuria", "urosepsis"],
    sources: [
      {
        label: "NICE urinary tract infection",
        organization: "NICE",
        url: "https://www.nice.org.uk/search?q=urinary%20tract%20infection",
      },
      { label: "CDC clinical guidance", organization: "CDC", url: cdcClinicalUrl },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
      {
        label: "PubMed UTI guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery("urinary tract infection pyelonephritis guideline"),
      },
    ],
  },
  {
    id: "meningite",
    title: "Meningite e encefalite",
    category: "Urgencia",
    summary:
      "Fontes para reconhecimento rapido, isolamento, coleta de exames, antimicrobiano empirico e notificacao.",
    checkpoints: [
      "Febre, rigidez de nuca, alteracao do sensoria, petequias, convulsao ou imunossupressao exigem urgencia.",
      "Nao atrasar tratamento quando houver suspeita clinica grave; seguir fluxo institucional.",
      "Checar necessidade de isolamento, profilaxia de contatos e notificacao.",
    ],
    searchTerms: [
      "meningite",
      "meningitis",
      "encefalite",
      "encephalitis",
      "rigidez de nuca",
      "liquor",
    ],
    sources: [
      {
        label: "NICE meningitis guidance",
        organization: "NICE",
        url: "https://www.nice.org.uk/guidance/ng240",
      },
      {
        label: "CDC meningitis guidance",
        organization: "CDC",
        url: "https://www.cdc.gov/meningitis/hcp/clinical-guidance/index.html",
      },
      { label: "WHO guidelines", organization: "World Health Organization", url: whoGuidelinesUrl },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
    ],
  },
  {
    id: "tromboembolismo-venoso",
    title: "Tromboembolismo venoso, TVP e embolia pulmonar",
    category: "Urgencia",
    summary:
      "Fontes para probabilidade pre-teste, exames, anticoagulacao, risco de sangramento e criterios de gravidade.",
    checkpoints: [
      "Avaliar instabilidade hemodinamica, hipoxemia, dor toracica, sincope e sinais de TVP.",
      "Usar escore/protocolo local para D-dimero, imagem e anticoagulacao.",
      "Checar contraindicações, gestacao, cancer, funcao renal e risco de sangramento.",
    ],
    searchTerms: [
      "tep",
      "embolia pulmonar",
      "tvp",
      "trombose venosa",
      "tromboembolismo",
      "d-dimero",
    ],
    sources: [
      {
        label: "NICE venous thromboembolic diseases",
        organization: "NICE",
        url: "https://www.nice.org.uk/guidance/ng158",
      },
      {
        label: "PubMed VTE guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery("venous thromboembolism pulmonary embolism guideline"),
      },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
    ],
  },
  {
    id: "pancreatite",
    title: "Pancreatite aguda",
    category: "Urgencia",
    summary:
      "Fontes para diagnostico, estratificacao de gravidade, fluidos, analgesia, etiologia biliar/alcoolica e complicacoes.",
    checkpoints: [
      "Confirmar criterio clinico, enzimas e/ou imagem conforme protocolo.",
      "Avaliar sinais de gravidade: choque, hipoxemia, injuria renal, SIRS persistente e necrose.",
      "Pesquisar etiologia biliar, alcool, triglicerideos, medicamentos e necessidade de cirurgia/endoscopia.",
    ],
    searchTerms: ["pancreatite", "pancreatitis", "dor abdominal", "amilase", "lipase"],
    sources: [
      {
        label: "NICE pancreatitis guidance",
        organization: "NICE",
        url: "https://www.nice.org.uk/guidance/ng104",
      },
      {
        label: "PubMed acute pancreatitis guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery("acute pancreatitis guideline"),
      },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
    ],
  },
  {
    id: "abdome-agudo",
    title: "Abdome agudo, apendicite e colecistite",
    category: "Urgencia",
    summary:
      "Fontes para avaliacao de dor abdominal, sinais de peritonite, imagem, analgesia, antibiotico e indicacao cirurgica.",
    checkpoints: [
      "Checar instabilidade, peritonite, obstrucao, sangramento, gravidez e imunossupressao.",
      "Diferenciar causas biliares, apendiculares, pancreáticas, vasculares, ginecologicas e urinarias.",
      "Seguir fluxo local para imagem, cirurgia, analgesia, hidratacao e antibiotico quando indicado.",
    ],
    searchTerms: ["abdome agudo", "apendicite", "colecistite", "dor abdominal", "peritonite"],
    sources: [
      {
        label: "NICE abdominal pain search",
        organization: "NICE",
        url: "https://www.nice.org.uk/search?q=abdominal%20pain",
      },
      {
        label: "PubMed acute abdomen guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery("acute abdomen appendicitis cholecystitis guideline"),
      },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
    ],
  },
  {
    id: "diarreia-desidratacao",
    title: "Diarreia aguda e desidratacao",
    category: "Infecciosas",
    summary:
      "Fontes para avaliacao de gravidade, hidratacao, sinais de alarme, coprocultura e uso criterioso de antibioticos.",
    checkpoints: [
      "Avaliar desidratacao, sangue nas fezes, febre alta, dor intensa, idade extrema e imunossupressao.",
      "Priorizar hidratacao oral/venosa conforme gravidade e risco.",
      "Revisar indicacao de exames, isolamento, notificacao e antibiotico.",
    ],
    searchTerms: ["diarreia", "desidratacao", "gastroenterite", "vomitos", "soro de reidratacao"],
    sources: [
      {
        label: "WHO diarrhoeal disease",
        organization: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease",
      },
      { label: "CDC clinical guidance", organization: "CDC", url: cdcClinicalUrl },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
    ],
  },
  {
    id: "covid-influenza",
    title: "COVID-19, influenza e sindromes gripais",
    category: "Infecciosas",
    summary:
      "Fontes para testagem, isolamento, risco de gravidade, antiviral, vacinacao e vigilancia respiratoria.",
    checkpoints: [
      "Avaliar saturacao, dispneia, grupos de risco, gestacao, imunossupressao e tempo de sintomas.",
      "Conferir recomendacoes locais vigentes para testagem, isolamento e notificacao.",
      "Revisar criterios para antiviral e sinais de agravamento.",
    ],
    searchTerms: ["covid", "influenza", "gripe", "sindrome gripal", "sars-cov-2", "vacinacao"],
    sources: [
      {
        label: "WHO COVID-19",
        organization: "World Health Organization",
        url: "https://www.who.int/health-topics/coronavirus",
      },
      {
        label: "CDC flu guidance",
        organization: "CDC",
        url: "https://www.cdc.gov/flu/hcp/index.htm",
      },
      { label: "PAHO technical documents", organization: "PAHO/WHO", url: pahoDocumentsUrl },
    ],
  },
  {
    id: "celulite-erisipela",
    title: "Celulite, erisipela e infeccoes de pele",
    category: "Infecciosas",
    summary:
      "Fontes para gravidade, sinais necrotizantes, antibioticoterapia, controle de foco e criterios de internacao.",
    checkpoints: [
      "Procurar sinais de fasciite necrotizante, sepse, imunossupressao, mordedura, diabetes e isquemia.",
      "Definir se e purulenta, nao purulenta, abscesso ou infeccao complicada.",
      "Checar necessidade de drenagem, cultura, cobertura antimicrobiana e revisao precoce.",
    ],
    searchTerms: ["celulite", "erisipela", "abscesso", "infeccao de pele", "fasciite"],
    sources: [
      {
        label: "NICE cellulitis search",
        organization: "NICE",
        url: "https://www.nice.org.uk/search?q=cellulitis",
      },
      { label: "CDC clinical guidance", organization: "CDC", url: cdcClinicalUrl },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
    ],
  },
  {
    id: "epilepsia-convulsao",
    title: "Crise convulsiva e epilepsia",
    category: "Urgencia",
    summary:
      "Fontes para primeira crise, status epilepticus, causas reversiveis, seguranca e seguimento neurologico.",
    checkpoints: [
      "Crise prolongada, repetida, trauma, gestacao, febre, intoxicacao ou deficit focal exigem urgencia.",
      "Checar glicemia, eletrolitos, intoxicacoes, infeccao, abstinencia e medicacoes.",
      "Diferenciar primeira crise, epilepsia conhecida e pseudo-crise conforme avaliacao clinica.",
    ],
    searchTerms: ["convulsao", "crise convulsiva", "epilepsia", "status epilepticus", "seizure"],
    sources: [
      {
        label: "NICE epilepsy guidance",
        organization: "NICE",
        url: "https://www.nice.org.uk/guidance/ng217",
      },
      {
        label: "WHO epilepsy",
        organization: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/epilepsy",
      },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
    ],
  },
  {
    id: "cefaleia",
    title: "Cefaleia, migranea e sinais de alarme",
    category: "Urgencia",
    summary:
      "Fontes para diferenciar cefaleia primaria, sinais de alarme, indicacao de imagem e manejo inicial.",
    checkpoints: [
      "Pesquisar inicio explosivo, deficit neurologico, febre, papiledema, cancer, imunossupressao, gestacao e trauma.",
      "Diferenciar migranea, tensional, cefaleia em salvas e causas secundarias.",
      "Revisar risco de abuso de analgesicos e plano de seguimento.",
    ],
    searchTerms: ["cefaleia", "dor de cabeca", "migranea", "enxaqueca", "sinais de alarme"],
    sources: [
      {
        label: "NICE headache guidance",
        organization: "NICE",
        url: "https://www.nice.org.uk/guidance/cg150",
      },
      {
        label: "PubMed headache guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery("headache migraine guideline red flags"),
      },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
    ],
  },
  {
    id: "lombalgia",
    title: "Lombalgia e radiculopatia",
    category: "Cronicas",
    summary: "Fontes para sinais de alarme, analgesia, retorno funcional, imagem e encaminhamento.",
    checkpoints: [
      "Pesquisar deficit neurologico progressivo, anestesia em sela, retencao urinaria, febre, cancer, trauma e perda ponderal.",
      "Evitar imagem sem sinal de alarme conforme protocolo.",
      "Priorizar retorno funcional, orientacao e revisao se piora ou persistencia.",
    ],
    searchTerms: ["lombalgia", "dor lombar", "ciatalgia", "radiculopatia", "coluna"],
    sources: [
      {
        label: "NICE low back pain",
        organization: "NICE",
        url: "https://www.nice.org.uk/guidance/ng59",
      },
      {
        label: "PubMed low back pain guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery("low back pain guideline red flags"),
      },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
    ],
  },
  {
    id: "anemia",
    title: "Anemia e deficiencias nutricionais",
    category: "Cronicas",
    summary:
      "Fontes para classificacao, investigacao etiologica, sinais de gravidade, reposicao e encaminhamento.",
    checkpoints: [
      "Classificar por VCM, reticulocitos, ferro/ferritina, B12/folato, sangramento e inflamacao.",
      "Avaliar instabilidade, sintomas cardiovasculares, gestacao, doenca renal e neoplasia.",
      "Investigar causa antes de tratar de forma isolada quando houver recorrencia ou gravidade.",
    ],
    searchTerms: ["anemia", "ferro", "ferritina", "b12", "folato", "hemoglobina"],
    sources: [
      {
        label: "NICE anaemia search",
        organization: "NICE",
        url: "https://www.nice.org.uk/search?q=anaemia",
      },
      {
        label: "WHO anaemia",
        organization: "World Health Organization",
        url: "https://www.who.int/health-topics/anaemia",
      },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
    ],
  },
  {
    id: "tireoide",
    title: "Hipotireoidismo e hipertireoidismo",
    category: "Cronicas",
    summary:
      "Fontes para interpretacao de TSH/T4, sintomas, ajuste terapeutico, gestacao e criterios de urgencia.",
    checkpoints: [
      "Distinguir alteracao subclinica, franca, gestacional e induzida por medicamentos.",
      "Checar sinais de tempestade tireotoxica ou coma mixedematoso em quadros graves.",
      "Revisar interacoes, adesao, tempo de reavaliacao laboratorial e populacoes especiais.",
    ],
    searchTerms: ["tireoide", "hipotireoidismo", "hipertireoidismo", "tsh", "t4", "tireotoxicose"],
    sources: [
      {
        label: "NICE thyroid disease",
        organization: "NICE",
        url: "https://www.nice.org.uk/guidance/ng145",
      },
      {
        label: "PubMed thyroid guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery("thyroid disease clinical practice guideline"),
      },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
    ],
  },
  {
    id: "pre-eclampsia",
    title: "Hipertensao na gestacao e pre-eclampsia",
    category: "Urgencia",
    summary:
      "Fontes para risco materno-fetal, sinais de gravidade, exames, sulfato de magnesio e encaminhamento obstetrico.",
    checkpoints: [
      "PA elevada na gestacao com sintomas neurologicos, dor epigastrica, plaquetopenia ou disfuncao organica exige urgencia.",
      "Checar idade gestacional, proteinuria, exames maternos, vitalidade fetal e fluxo obstetrico local.",
      "Nao atrasar transferencia quando houver criterio de gravidade.",
    ],
    searchTerms: [
      "pre-eclampsia",
      "eclampsia",
      "hipertensao gestacional",
      "gestacao",
      "gravidez",
      "hellp",
    ],
    sources: [
      {
        label: "NICE hypertension in pregnancy",
        organization: "NICE",
        url: "https://www.nice.org.uk/guidance/ng133",
      },
      {
        label: "WHO maternal health",
        organization: "World Health Organization",
        url: "https://www.who.int/health-topics/maternal-health",
      },
      { label: "Guidelines.pt", organization: "Guidelines.pt", url: guidelinesPtUrl },
    ],
  },
  {
    id: "saude-mental",
    title: "Saude mental e risco suicida",
    category: "Saude publica",
    summary:
      "Fontes para avaliacao de risco, crise, manejo inicial, rede de apoio e encaminhamento seguro.",
    checkpoints: [
      "Risco suicida, psicose, intoxicacao ou agitacao grave exigem avaliacao imediata.",
      "Checar rede de apoio, plano de seguranca e fluxo local de crise.",
      "Evitar orientacao isolada quando houver risco atual ou acesso a meios letais.",
    ],
    searchTerms: ["saude mental", "suicidio", "crise", "depressao", "ansiedade"],
    sources: [
      {
        label: "WHO mhGAP",
        organization: "World Health Organization",
        url: "https://www.who.int/publications/i/item/9789240084278",
      },
      {
        label: "NICE mental health guidance",
        organization: "NICE",
        url: `${niceConditionsUrl}/mental-health-behavioural-and-neurodevelopmental-conditions`,
      },
      { label: "PCDT e protocolos SUS", organization: "Ministerio da Saude", url: pcdtUrl },
    ],
  },
];

export const guidelineCategories = [
  "Todos",
  "Urgencia",
  "Infecciosas",
  "Cronicas",
  "Pediatria",
  "Saude publica",
] as const;
