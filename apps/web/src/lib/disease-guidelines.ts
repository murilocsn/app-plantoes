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
      { label: "NICE sepsis search", organization: "NICE", url: "https://www.nice.org.uk/search?q=sepsis" },
      { label: "Revisoes no PubMed", organization: "National Library of Medicine", url: pubmedQuery("sepsis guideline systematic review") },
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
      { label: "WHO dengue topic", organization: "World Health Organization", url: "https://www.who.int/health-topics/dengue-and-severe-dengue" },
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
      { label: "PubMed pneumonia guidelines", organization: "National Library of Medicine", url: pubmedQuery("pneumonia guideline antimicrobial stewardship") },
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
      { label: "WHO TB publications", organization: "World Health Organization", url: "https://www.who.int/teams/global-tuberculosis-programme/tb-reports" },
      { label: "PubMed tuberculosis guidelines", organization: "National Library of Medicine", url: pubmedQuery("tuberculosis clinical practice guideline") },
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
      { label: "NICE diabetes guidance", organization: "NICE", url: `${niceConditionsUrl}/diabetes-and-other-endocrinal--nutritional-and-metabolic-conditions/diabetes` },
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
      { label: "WHO hypertension guideline", organization: "World Health Organization", url: "https://www.who.int/publications/i/item/9789240033986" },
      { label: "PCDT e protocolos SUS", organization: "Ministerio da Saude", url: pcdtUrl },
      { label: "NICE hypertension search", organization: "NICE", url: "https://www.nice.org.uk/search?q=hypertension" },
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
      { label: "NICE respiratory guidance", organization: "NICE", url: `${niceConditionsUrl}/respiratory-conditions` },
      { label: "CDC clinical guidance", organization: "CDC", url: cdcClinicalUrl },
      { label: "PubMed asthma COPD guidelines", organization: "National Library of Medicine", url: pubmedQuery("asthma COPD guideline exacerbation") },
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
      { label: "NICE stroke guidance", organization: "NICE", url: `${niceConditionsUrl}/cardiovascular-conditions/stroke-and-transient-ischaemic-attack` },
      { label: "WHO guidelines", organization: "World Health Organization", url: whoGuidelinesUrl },
      { label: "PubMed stroke guidelines", organization: "National Library of Medicine", url: pubmedQuery("stroke guideline acute management") },
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
      { label: "NICE chest pain search", organization: "NICE", url: "https://www.nice.org.uk/search?q=chest%20pain" },
      { label: "PCDT e protocolos SUS", organization: "Ministerio da Saude", url: pcdtUrl },
      { label: "PubMed ACS guidelines", organization: "National Library of Medicine", url: pubmedQuery("acute coronary syndrome guideline chest pain") },
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
      { label: "WHO IMCI", organization: "World Health Organization", url: "https://www.who.int/teams/maternal-newborn-child-adolescent-health-and-ageing/child-health/integrated-management-of-childhood-illness" },
      { label: "NICE child fever search", organization: "NICE", url: "https://www.nice.org.uk/search?q=fever%20child" },
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
      { label: "WHO HIV guidelines", organization: "World Health Organization", url: "https://www.who.int/teams/global-hiv-hepatitis-and-stis-programmes/hiv/treatment" },
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
      { label: "WHO hepatitis topic", organization: "World Health Organization", url: "https://www.who.int/health-topics/hepatitis" },
      { label: "CDC viral hepatitis overview", organization: "CDC", url: "https://www.cdc.gov/hepatitis/hcp/clinical-overview/index.html" },
      {
        label: "PubMed cirrhosis guidelines",
        organization: "National Library of Medicine",
        url: pubmedQuery("cirrhosis clinical practice guideline portal hypertension ascites encephalopathy"),
      },
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
      { label: "WHO mhGAP", organization: "World Health Organization", url: "https://www.who.int/publications/i/item/9789240084278" },
      { label: "NICE mental health guidance", organization: "NICE", url: `${niceConditionsUrl}/mental-health-behavioural-and-neurodevelopmental-conditions` },
      { label: "PCDT e protocolos SUS", organization: "Ministerio da Saude", url: pcdtUrl },
    ],
  },
];

export const guidelineCategories = ["Todos", "Urgencia", "Infecciosas", "Cronicas", "Pediatria", "Saude publica"] as const;
