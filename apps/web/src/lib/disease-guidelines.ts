export type GuidelineSource = {
  label: string;
  organization: string;
  url: string;
};

export type Cid10Code = {
  code: string;
  label: string;
};

export type ClinicalGuidelineDetails = {
  cid10: Cid10Code[];
  conduct: string[];
  medications: string[];
};

type BaseDiseaseGuideline = {
  id: string;
  title: string;
  category: "Urgencia" | "Infecciosas" | "Cronicas" | "Pediatria" | "Saude publica";
  summary: string;
  checkpoints: string[];
  searchTerms: string[];
  sources: GuidelineSource[];
};

export type DiseaseGuideline = BaseDiseaseGuideline & ClinicalGuidelineDetails;

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

const baseDiseaseGuidelines: BaseDiseaseGuideline[] = [
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

const clinicalDetailsById = {
  sepse: {
    cid10: [
      { code: "A41.9", label: "Septicemia nao especificada" },
      { code: "R57.2", label: "Choque septico" },
    ],
    conduct: [
      "Reconhecer disfuncao organica, hipotensao, hipoperfusao, lactato elevado ou rebaixamento.",
      "Acionar protocolo institucional, monitorizacao, acesso venoso, exames, culturas e reavaliacao seriada.",
      "Controlar foco infeccioso e encaminhar para sala vermelha/UTI quando houver instabilidade.",
    ],
    medications: [
      "Antimicrobiano empirico precoce conforme foco provavel, alergias, resistencia local e funcao renal.",
      "Cristaloide e vasopressor conforme resposta hemodinamica e protocolo local.",
      "Antitermico, analgesia e suporte de oxigenio conforme necessidade clinica.",
    ],
  },
  dengue: {
    cid10: [
      { code: "A90", label: "Dengue classico" },
      { code: "A91", label: "Dengue hemorragico" },
      { code: "A92.0", label: "Febre chikungunya" },
      { code: "A95.9", label: "Febre amarela nao especificada" },
    ],
    conduct: [
      "Classificar risco, sinais de alarme, sangramento, choque, gestacao, extremos de idade e comorbidades.",
      "Solicitar hemograma/plaquetas e vigilancia conforme fase da doenca e protocolo epidemiologico local.",
      "Notificar quando indicado e orientar retorno imediato se houver piora, dor abdominal, vomitos ou sangramento.",
    ],
    medications: [
      "Hidratacao oral ou venosa conforme classificacao de risco.",
      "Paracetamol ou dipirona conforme protocolo e contraindicacoes.",
      "Evitar AAS, anti-inflamatorios e anticoagulantes sem indicacao formal pelo risco de sangramento.",
    ],
  },
  pneumonia: {
    cid10: [
      { code: "J18.9", label: "Pneumonia nao especificada" },
      { code: "J15.9", label: "Pneumonia bacteriana nao especificada" },
      { code: "J12.9", label: "Pneumonia viral nao especificada" },
    ],
    conduct: [
      "Avaliar saturacao, frequencia respiratoria, pressao arterial, confusao, idade e comorbidades.",
      "Definir local de cuidado: ambulatorio, observacao, internacao ou terapia intensiva.",
      "Solicitar imagem e exames conforme gravidade, risco de complicacao e disponibilidade.",
    ],
    medications: [
      "Antibiotico empirico conforme gravidade, idade, comorbidades, alergias e resistencia local.",
      "Oxigenio, broncodilatador se broncoespasmo, analgesico/antitermico e hidratacao quando indicados.",
      "Antiviral quando houver suspeita forte/confirmacao e criterio clinico-epidemiologico.",
    ],
  },
  tuberculose: {
    cid10: [
      { code: "A15.0", label: "Tuberculose pulmonar confirmada" },
      { code: "A16.9", label: "Tuberculose respiratoria nao especificada" },
      { code: "A19.9", label: "Tuberculose miliar nao especificada" },
    ],
    conduct: [
      "Investigar tosse prolongada, sintomas constitucionais, contato, vulnerabilidade social e HIV.",
      "Coletar baciloscopia, teste rapido molecular, cultura e teste de sensibilidade conforme fluxo local.",
      "Notificar, rastrear contatos e acompanhar adesao/tratamento diretamente observado quando indicado.",
    ],
    medications: [
      "Esquema RHZE/RH ou alternativa conforme PCDT, peso, idade, gestacao, resistencia e funcao hepatica.",
      "Piridoxina quando indicada e manejo de eventos adversos.",
      "Terapia antirretroviral e profilaxias conforme coinfeccao HIV e protocolo especializado.",
    ],
  },
  diabetes: {
    cid10: [
      { code: "E10.9", label: "Diabetes mellitus tipo 1 sem complicacoes" },
      { code: "E11.9", label: "Diabetes mellitus tipo 2 sem complicacoes" },
      { code: "E14.9", label: "Diabetes mellitus nao especificado" },
    ],
    conduct: [
      "Diferenciar seguimento ambulatorial de hipoglicemia, cetoacidose ou estado hiperosmolar.",
      "Individualizar metas por idade, fragilidade, risco cardiovascular, rim, retina e pe diabetico.",
      "Revisar educacao, automonitorizacao, alimentacao, atividade fisica e adesao.",
    ],
    medications: [
      "Metformina, insulinoterapia e outras classes conforme PCDT/protocolo, funcao renal e perfil do paciente.",
      "SGLT2/GLP-1 ou alternativas quando disponiveis e indicadas por risco cardiovascular/renal.",
      "Glicose, glucagon ou insulinoterapia venosa/subcutanea conforme emergencia metabolica.",
    ],
  },
  hipertensao: {
    cid10: [
      { code: "I10", label: "Hipertensao essencial" },
      { code: "I11.9", label: "Doenca cardiaca hipertensiva sem insuficiencia cardiaca" },
    ],
    conduct: [
      "Confirmar medida adequada, historico, risco cardiovascular e lesao de orgao-alvo.",
      "Diferenciar controle ambulatorial de urgencia/emergencia hipertensiva.",
      "Investigar causas secundarias quando houver resistencia, inicio precoce ou sinais sugestivos.",
    ],
    medications: [
      "IECA/BRA, diuretico tiazidico, bloqueador de canal de calcio ou combinacoes conforme perfil.",
      "Medicacao endovenosa e reducao controlada da pressao apenas em emergencia hipertensiva.",
      "Evitar quedas bruscas de pressao sem lesao aguda de orgao-alvo.",
    ],
  },
  "asma-dpoc": {
    cid10: [
      { code: "J45.9", label: "Asma nao especificada" },
      { code: "J46", label: "Estado de mal asmatico" },
      { code: "J44.1", label: "DPOC com exacerbacao aguda" },
    ],
    conduct: [
      "Avaliar fala, uso de musculatura acessoria, saturacao, pico de fluxo quando disponivel e resposta inicial.",
      "Diferenciar crise leve/moderada de insuficiencia respiratoria iminente.",
      "Revisar tecnica inalatoria, gatilhos, plano de acao e necessidade de seguimento.",
    ],
    medications: [
      "Broncodilatador inalatorio de resgate conforme protocolo e gravidade.",
      "Corticoide sistemico em exacerbacao moderada/grave quando indicado.",
      "Oxigenio titulado, anticolinergico inalatorio e antibiotico apenas se criterio de infeccao/exacerbacao de DPOC.",
    ],
  },
  avc: {
    cid10: [
      { code: "I63.9", label: "Infarto cerebral nao especificado" },
      { code: "I64", label: "AVC nao especificado" },
      { code: "G45.9", label: "AIT nao especificado" },
    ],
    conduct: [
      "Registrar hora de inicio ou ultima vez bem, escala neurologica e glicemia capilar.",
      "Acionar linha de AVC, priorizar neuroimagem e avaliar criterios para terapia tempo-dependente.",
      "Monitorar via aerea, pressao, temperatura, degluticao e risco de complicacoes.",
    ],
    medications: [
      "Trombolitico/terapia de reperfusao somente se elegivel e em servico habilitado.",
      "Antiagregante, anticoagulacao ou estatina conforme subtipo, imagem e protocolo.",
      "Controle de glicemia, temperatura e pressao conforme alvo definido pela linha de cuidado.",
    ],
  },
  "dor-toracica": {
    cid10: [
      { code: "I20.0", label: "Angina instavel" },
      { code: "I21.9", label: "Infarto agudo do miocardio nao especificado" },
      { code: "R07.4", label: "Dor toracica nao especificada" },
    ],
    conduct: [
      "ECG imediato, sinais vitais, tempo de dor, fatores de risco e sinais de instabilidade.",
      "Estratificar risco, repetir ECG/troponina e descartar causas fatais nao coronarianas.",
      "Ativar fluxo de SCA/reperfusao se supra de ST ou instabilidade.",
    ],
    medications: [
      "AAS e segundo antiagregante conforme suspeita/risco e protocolo de SCA.",
      "Anticoagulante, nitrato, analgesia e estatina conforme indicacao e contraindicoes.",
      "Oxigenio apenas se hipoxemia ou desconforto respiratorio relevante.",
    ],
  },
  "pediatria-febre": {
    cid10: [
      { code: "R50.9", label: "Febre nao especificada" },
      { code: "E86", label: "Deplecao de volume" },
      { code: "B34.9", label: "Infeccao viral nao especificada" },
    ],
    conduct: [
      "Avaliar idade, estado geral, perfusao, hidratacao, respiracao, nivel de consciencia e sinais meningeos.",
      "Lactentes pequenos, imunossuprimidos e criancas toxemiadas exigem baixo limiar para avaliacao urgente.",
      "Usar protocolo pediatrico/AIDPI e orientar retorno por sinais de perigo.",
    ],
    medications: [
      "Antitermico/analgesico conforme idade, peso e contraindicacoes.",
      "Soro de reidratacao oral ou hidratacao venosa conforme desidratacao.",
      "Antibiotico apenas quando houver foco bacteriano, sepse suspeita ou criterio do protocolo.",
    ],
  },
  "hiv-ist": {
    cid10: [
      { code: "B20", label: "HIV resultando em doencas infecciosas e parasitarias" },
      { code: "B24", label: "Doenca pelo HIV nao especificada" },
      { code: "A53.9", label: "Sifilis nao especificada" },
      { code: "A54.9", label: "Infeccao gonococica nao especificada" },
    ],
    conduct: [
      "Definir se e rastreio, exposicao recente, sintomas, tratamento, gestacao ou coinfeccao.",
      "Solicitar testagem apropriada, avaliar janela imunologica, notificar quando indicado e rastrear parcerias.",
      "Encaminhar para fluxo especializado em HIV, hepatites, gestacao ou falha terapeutica.",
    ],
    medications: [
      "PEP/PrEP e TARV conforme PCDT, tempo de exposicao, testes e interacoes.",
      "Penicilina benzatina ou alternativas para sifilis conforme estagio e alergia.",
      "Ceftriaxona/doxiciclina/azitromicina ou esquema local para IST conforme agente suspeito.",
    ],
  },
  cirrose: {
    cid10: [
      { code: "K74.6", label: "Outras cirroses e as nao especificadas" },
      { code: "K70.3", label: "Cirrose hepatica alcoolica" },
      { code: "I85", label: "Varizes esofagicas" },
    ],
    conduct: [
      "Diferenciar cirrose compensada de ascite, sangramento, encefalopatia, ictericia ou infeccao.",
      "Investigar etiologia, funcao renal, sodio, coagulacao, infeccao e risco de carcinoma hepatocelular.",
      "Encaminhar descompensacao, sangramento digestivo, peritonite bacteriana espontanea ou falencia hepatica.",
    ],
    medications: [
      "Diureticos para ascite apenas com monitorizacao de rim, sodio e potassio.",
      "Lactulose/rifaximina conforme encefalopatia e protocolo.",
      "Antibiotico, albumina, vasoativo e endoscopia conforme suspeita de PBE ou sangramento varicoso.",
    ],
  },
  "insuficiencia-cardiaca": {
    cid10: [
      { code: "I50.9", label: "Insuficiencia cardiaca nao especificada" },
      { code: "I50.0", label: "Insuficiencia cardiaca congestiva" },
      { code: "I11.0", label: "Doenca cardiaca hipertensiva com insuficiencia cardiaca" },
    ],
    conduct: [
      "Avaliar congestao, hipoperfusao, saturacao, PA, ritmo, funcao renal e gatilho de descompensacao.",
      "Diferenciar perfil quente/frio e seco/umido para definir local de cuidado.",
      "Revisar terapia de base, adesao, sal, peso, vacinas e seguimento cardiologico.",
    ],
    medications: [
      "Diuretico de alca para congestao, com monitorizacao renal/eletrolitica.",
      "IECA/BRA/ARNI, beta-bloqueador, antagonista mineralocorticoide e SGLT2 conforme indicacao e tolerancia.",
      "Vasodilatador, inotropico ou vasopressor apenas conforme perfil hemodinamico e ambiente monitorado.",
    ],
  },
  "doenca-renal-cronica": {
    cid10: [
      { code: "N18.9", label: "Doenca renal cronica nao especificada" },
      { code: "N17.9", label: "Insuficiencia renal aguda nao especificada" },
      { code: "E87.5", label: "Hiperpotassemia" },
    ],
    conduct: [
      "Separar DRC estavel de injuria renal aguda, obstrucao, hipercalemia, acidose ou sobrecarga.",
      "Revisar medicamentos nefrotoxicos, dose por funcao renal, diurese e albuminuria.",
      "Encaminhar urgencia dialitica: hipercalemia grave, edema pulmonar, acidose, uremia ou intoxicacao dializavel.",
    ],
    medications: [
      "Ajuste de doses pela funcao renal e suspensao de nefrotoxicos quando indicado.",
      "Medidas para hipercalemia conforme ECG/gravidade: calcio, insulina-glicose, beta-agonista e remocao de potassio.",
      "Controle pressor, glicemico, anemia e disturbo mineral conforme nefrologia/protocolo.",
    ],
  },
  "itu-pielonefrite": {
    cid10: [
      { code: "N39.0", label: "Infeccao do trato urinario, local nao especificado" },
      { code: "N10", label: "Nefrite tubulo-intersticial aguda" },
      { code: "N41.0", label: "Prostatite aguda" },
    ],
    conduct: [
      "Diferenciar cistite simples de pielonefrite, prostatite, gestacao, obstrucao ou sepse.",
      "Coletar urina/cultura quando indicado e avaliar resistencia local, alergias e antibiotico previo.",
      "Internar/encaminhar se instabilidade, vomitos, gestacao complicada, obstrucao ou falha terapeutica.",
    ],
    medications: [
      "Antibiotico empirico conforme local, gravidade, cultura, funcao renal e gestacao.",
      "Analgesia, antitermico, hidratacao e antiemetico conforme necessidade.",
      "Evitar nitrofurantoina/fosfomicina para pielonefrite por baixa concentracao tecidual renal.",
    ],
  },
  meningite: {
    cid10: [
      { code: "G00.9", label: "Meningite bacteriana nao especificada" },
      { code: "A87.9", label: "Meningite viral nao especificada" },
      { code: "G04.9", label: "Encefalite, mielite e encefalomielite nao especificadas" },
    ],
    conduct: [
      "Tratar como urgencia se febre, rigidez de nuca, alteracao mental, petequias, convulsao ou sepse.",
      "Nao atrasar antibiotico/antiviral empirico quando houver suspeita grave.",
      "Coletar hemoculturas, liquor/imagem conforme seguranca, isolamento, notificacao e profilaxia de contatos.",
    ],
    medications: [
      "Ceftriaxona/cefotaxima associada ou nao a vancomicina/ampicilina conforme idade e risco.",
      "Dexametasona quando indicada antes ou junto ao antibiotico inicial.",
      "Aciclovir se suspeita de encefalite herpetica ou meningite viral grave selecionada.",
    ],
  },
  "tromboembolismo-venoso": {
    cid10: [
      { code: "I26.9", label: "Embolia pulmonar sem cor pulmonale agudo" },
      { code: "I80.2", label: "Trombose/flebite de vasos profundos dos membros inferiores" },
      { code: "I82.9", label: "Embolia e trombose venosas nao especificadas" },
    ],
    conduct: [
      "Avaliar instabilidade, hipoxemia, dor toracica, sincope, sinais de TVP e risco de sangramento.",
      "Usar probabilidade pre-teste para orientar D-dimero, ultrassom ou angioTC.",
      "Estratificar gravidade e encaminhar TEP de alto risco para ambiente monitorado.",
    ],
    medications: [
      "Anticoagulacao com heparina, HBPM, fondaparinux ou DOAC conforme cenario e contraindicacoes.",
      "Trombolise ou intervencao apenas em alto risco/instabilidade e protocolo especializado.",
      "Analgesia e suporte de oxigenio conforme sintomas e saturacao.",
    ],
  },
  pancreatite: {
    cid10: [{ code: "K85.9", label: "Pancreatite aguda nao especificada" }],
    conduct: [
      "Confirmar por dor tipica, lipase/amilase e/ou imagem conforme criterio clinico.",
      "Estratificar gravidade: choque, hipoxemia, SIRS persistente, injuria renal ou necrose.",
      "Pesquisar etiologia biliar, alcool, triglicerideos, medicamentos e necessidade de CPRE/cirurgia.",
    ],
    medications: [
      "Analgesia adequada, antiemetico e hidratacao conforme volemia e comorbidades.",
      "Antibiotico apenas em infeccao comprovada/suspeita especifica, nao de rotina em pancreatite esteril.",
      "Insulina/plasmaferese ou medidas especificas quando hipertrigliceridemia grave conforme protocolo.",
    ],
  },
  "abdome-agudo": {
    cid10: [
      { code: "K35.9", label: "Apendicite aguda nao especificada" },
      { code: "K81.0", label: "Colecistite aguda" },
      { code: "K65.9", label: "Peritonite nao especificada" },
    ],
    conduct: [
      "Pesquisar instabilidade, peritonite, obstrucao, sangramento, gravidez, sepse e imunossupressao.",
      "Solicitar exames/imagem conforme hipotese e acionar cirurgia quando houver sinal de abdomen cirurgico.",
      "Manter jejum, acesso venoso, monitorizacao e reavaliacao seriada se suspeita grave.",
    ],
    medications: [
      "Analgesia e antiemetico sem atrasar diagnostico.",
      "Antibiotico de amplo espectro conforme foco intra-abdominal, sepse ou indicacao cirurgica.",
      "Cristaloide e correcao de disturbios hidroeletroliticos conforme necessidade.",
    ],
  },
  "diarreia-desidratacao": {
    cid10: [
      { code: "A09", label: "Diarreia e gastroenterite de origem infecciosa presumivel" },
      { code: "E86", label: "Deplecao de volume" },
    ],
    conduct: [
      "Avaliar desidratacao, sangue, febre alta, dor intensa, imunossupressao, surto e viagem.",
      "Priorizar reidratacao e definir necessidade de exame de fezes ou isolamento.",
      "Encaminhar se choque, letargia, falha de hidratacao oral, lactente pequeno ou comorbidade grave.",
    ],
    medications: [
      "Soro de reidratacao oral ou hidratacao venosa conforme gravidade.",
      "Ondansetrona/antiemetico conforme protocolo para permitir hidratacao.",
      "Antibiotico apenas em criterios especificos; evitar antidiarreico em disenteria ou suspeita invasiva.",
    ],
  },
  "covid-influenza": {
    cid10: [
      { code: "U07.1", label: "COVID-19, virus identificado" },
      {
        code: "J10.1",
        label: "Influenza com outras manifestacoes respiratorias, virus identificado",
      },
      {
        code: "J11.1",
        label: "Influenza com outras manifestacoes respiratorias, virus nao identificado",
      },
    ],
    conduct: [
      "Avaliar saturacao, dispneia, tempo de sintomas, grupos de risco, gestacao e imunossupressao.",
      "Indicar testagem, isolamento, notificacao e retorno conforme norma vigente.",
      "Encaminhar hipoxemia, desconforto respiratorio, deterioracao ou risco elevado.",
    ],
    medications: [
      "Antiviral para influenza quando indicado pelo tempo de sintomas e grupo de risco.",
      "Antiviral para COVID-19 apenas conforme disponibilidade, interacoes e criterio atualizado.",
      "Antitermico, analgesia, hidratacao e oxigenio se hipoxemia; evitar antibiotico sem suspeita bacteriana.",
    ],
  },
  "celulite-erisipela": {
    cid10: [
      { code: "L03.9", label: "Celulite nao especificada" },
      { code: "A46", label: "Erisipela" },
      { code: "L02.9", label: "Abscesso cutaneo nao especificado" },
      { code: "M72.6", label: "Fasciite necrotizante" },
    ],
    conduct: [
      "Procurar sepse, dor desproporcional, bolhas, necrose, diabetes, isquemia ou imunossupressao.",
      "Diferenciar celulite nao purulenta, abscesso, mordedura, ferida infectada e fasciite.",
      "Marcar bordas, reavaliar resposta e drenar abscesso quando indicado.",
    ],
    medications: [
      "Antibiotico contra estreptococos/estafilococos conforme purulencia, gravidade e MRSA local.",
      "Analgesia, elevacao do membro e cuidado local da porta de entrada.",
      "Cobertura ampla e cirurgia urgente se suspeita de infeccao necrotizante.",
    ],
  },
  "epilepsia-convulsao": {
    cid10: [
      { code: "G40.9", label: "Epilepsia nao especificada" },
      { code: "G41.9", label: "Estado de mal epileptico nao especificado" },
      { code: "R56.8", label: "Outras convulsoes e as nao especificadas" },
    ],
    conduct: [
      "Proteger via aerea, lateralizar, medir glicemia e cronometrar a crise.",
      "Investigar trauma, febre, intoxicacao, abstinencia, gestacao, infeccao e disturbios metabolicos.",
      "Encaminhar primeira crise, estado de mal, deficit focal, gestacao ou recuperacao incompleta.",
    ],
    medications: [
      "Benzodiazepinico para crise prolongada conforme via disponivel e protocolo.",
      "Anticonvulsivante de segunda linha conforme estado de mal e contraindicacoes.",
      "Tiamina/glicose, correcao eletrolitica ou tratamento etiologico quando indicado.",
    ],
  },
  cefaleia: {
    cid10: [
      { code: "R51", label: "Cefaleia" },
      { code: "G43.9", label: "Migranea nao especificada" },
      { code: "G44.0", label: "Sindrome de cefaleia em salvas" },
    ],
    conduct: [
      "Pesquisar red flags: thunderclap, deficit focal, febre, papiledema, gestacao, cancer, trauma ou imunossupressao.",
      "Diferenciar cefaleia primaria de causas secundarias e indicar imagem/puncao conforme risco.",
      "Avaliar abuso de analgesicos e plano de prevencao/seguimento.",
    ],
    medications: [
      "Analgesico/anti-inflamatorio e antiemetico conforme perfil e contraindicoes.",
      "Triptano para migranea selecionada sem contraindicacao cardiovascular.",
      "Oxigenio/triptano para cefaleia em salvas conforme diagnostico e protocolo.",
    ],
  },
  lombalgia: {
    cid10: [
      { code: "M54.5", label: "Dor lombar baixa" },
      { code: "M54.3", label: "Ciatalgia" },
      { code: "M54.1", label: "Radiculopatia" },
    ],
    conduct: [
      "Pesquisar red flags: cauda equina, deficit progressivo, febre, cancer, trauma ou perda ponderal.",
      "Evitar imagem sem sinal de alarme; orientar retorno funcional e sinais de reavaliacao.",
      "Encaminhar deficit neurologico, suspeita infecciosa/neoplasica ou dor refrataria importante.",
    ],
    medications: [
      "Analgesico simples ou anti-inflamatorio por curto prazo conforme risco gastrointestinal, renal e cardiovascular.",
      "Relaxante muscular apenas em casos selecionados e curto prazo.",
      "Evitar opioide de rotina; considerar fisioterapia e medidas nao farmacologicas.",
    ],
  },
  anemia: {
    cid10: [
      { code: "D50.9", label: "Anemia por deficiencia de ferro nao especificada" },
      { code: "D51.9", label: "Anemia por deficiencia de vitamina B12 nao especificada" },
      { code: "D64.9", label: "Anemia nao especificada" },
    ],
    conduct: [
      "Classificar por VCM, reticulocitos, ferritina/ferro, B12/folato, sangramento e inflamacao.",
      "Avaliar instabilidade, sintomas cardiovasculares, gestacao, DRC, neoplasia ou sangramento ativo.",
      "Investigar causa antes de reposicao isolada em anemia recorrente, grave ou sem explicacao.",
    ],
    medications: [
      "Reposicao de ferro oral ou venosa conforme gravidade, tolerancia, absorcao e urgencia.",
      "Vitamina B12/folato quando deficiencia confirmada ou fortemente suspeita.",
      "Transfusao apenas conforme sintomas, instabilidade, sangramento ou limiares/protocolo local.",
    ],
  },
  tireoide: {
    cid10: [
      { code: "E03.9", label: "Hipotireoidismo nao especificado" },
      { code: "E05.9", label: "Tireotoxicose nao especificada" },
      { code: "E05.5", label: "Crise tireotoxica" },
    ],
    conduct: [
      "Interpretar TSH/T4 livre com contexto clinico, gestacao, idade e medicamentos.",
      "Reconhecer tempestade tireotoxica ou coma mixedematoso como emergencia.",
      "Reavaliar laboratorio no intervalo adequado e investigar causa quando indicado.",
    ],
    medications: [
      "Levotiroxina para hipotireoidismo conforme idade, risco cardiaco e gestacao.",
      "Betabloqueador e antitireoidiano conforme hipertireoidismo, gravidade e contraindicacoes.",
      "Corticoide, iodo e suporte intensivo apenas em crise tireotoxica conforme protocolo.",
    ],
  },
  "pre-eclampsia": {
    cid10: [
      { code: "O13", label: "Hipertensao gestacional" },
      { code: "O14.9", label: "Pre-eclampsia nao especificada" },
      { code: "O15.9", label: "Eclampsia nao especificada quanto ao periodo" },
    ],
    conduct: [
      "Avaliar PA, idade gestacional, cefaleia, escotomas, dor epigastrica, dispneia, proteinuria e exames.",
      "Identificar criterios de gravidade e acionar obstetricia/transferencia quando necessario.",
      "Monitorar mae e feto, planejar parto conforme gravidade e idade gestacional.",
    ],
    medications: [
      "Sulfato de magnesio para prevencao/tratamento de eclampsia conforme criterio.",
      "Anti-hipertensivo seguro na gestacao conforme PA, gravidade e protocolo.",
      "Corticoide antenatal quando indicado por idade gestacional e risco de parto pre-termo.",
    ],
  },
  "saude-mental": {
    cid10: [
      { code: "F32.9", label: "Episodio depressivo nao especificado" },
      { code: "F41.9", label: "Transtorno ansioso nao especificado" },
      { code: "F29", label: "Psicose nao organica nao especificada" },
      { code: "X60-X84", label: "Lesoes autoprovocadas intencionalmente" },
    ],
    conduct: [
      "Avaliar risco suicida, psicose, intoxicacao, agitacao, violencia, rede de apoio e acesso a meios letais.",
      "Construir plano de seguranca e acionar emergencia/rede de crise se risco atual.",
      "Encaminhar para seguimento em saude mental e envolver familia/rede quando seguro.",
    ],
    medications: [
      "Benzodiazepinico ou antipsicotico para agitacao grave apenas com monitorizacao e protocolo.",
      "Antidepressivo/ansiolitico de manutencao deve considerar diagnostico, risco suicida, bipolaridade e seguimento.",
      "Evitar alta sem plano de seguranca quando houver risco atual ou suporte insuficiente.",
    ],
  },
} satisfies Record<string, ClinicalGuidelineDetails>;

function attachClinicalDetails(guideline: BaseDiseaseGuideline): DiseaseGuideline {
  const details = clinicalDetailsById[guideline.id as keyof typeof clinicalDetailsById];

  if (!details) {
    throw new Error(`Missing clinical details for guideline ${guideline.id}`);
  }

  return { ...guideline, ...details };
}

export const diseaseGuidelines: DiseaseGuideline[] =
  baseDiseaseGuidelines.map(attachClinicalDetails);

export const guidelineCategories = [
  "Todos",
  "Urgencia",
  "Infecciosas",
  "Cronicas",
  "Pediatria",
  "Saude publica",
] as const;
