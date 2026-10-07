import type { AiChatSource } from "@financplantoes/shared";

type MedicalSource = AiChatSource & {
  tags: string[];
};

const sourceCatalog: MedicalSource[] = [
  {
    id: "who-guidelines",
    title: "WHO guidelines approved by the Guidelines Review Committee",
    organization: "World Health Organization",
    url: "https://www.who.int/publications/who-guidelines",
    summary:
      "Portal oficial de diretrizes da OMS. Priorize diretrizes vigentes, data de publicacao e contexto local antes de aplicar condutas.",
    tags: ["oms", "who", "diretriz", "guideline", "conduta", "tratamento", "prevencao"],
  },
  {
    id: "who-emergency-care",
    title: "WHO Emergency and trauma care",
    organization: "World Health Organization",
    url: "https://www.who.int/health-topics/emergency-care",
    summary:
      "Referencia da OMS para atendimento inicial, reconhecimento de gravidade, estabilizacao e encaminhamento em urgencias.",
    tags: ["emergencia", "urgencia", "trauma", "choque", "dispneia", "dor toracica", "convulsao"],
  },
  {
    id: "who-antibiotics-aware",
    title: "WHO AWaRe antibiotic book",
    organization: "World Health Organization",
    url: "https://www.who.int/publications/i/item/9789240062382",
    summary:
      "Livro da OMS para uso racional de antibioticos, com foco em indicacoes, grupos AWaRe e resistencia antimicrobiana.",
    tags: ["antibiotico", "infeccao", "antimicrobiano", "resistencia", "febre", "pneumonia", "itu"],
  },
  {
    id: "who-imci",
    title: "Integrated Management of Childhood Illness",
    organization: "World Health Organization",
    url: "https://www.who.int/teams/maternal-newborn-child-adolescent-health-and-ageing/child-health/integrated-management-of-childhood-illness",
    summary:
      "Estrategia OMS/UNICEF para avaliacao integrada de criancas, sinais de perigo, classificacao e encaminhamento.",
    tags: ["crianca", "pediatria", "febre", "diarreia", "tosse", "desidratacao", "imci"],
  },
  {
    id: "paho-technical",
    title: "PAHO/WHO technical documentation",
    organization: "Pan American Health Organization",
    url: "https://www.paho.org/en/technical-documents",
    summary:
      "Biblioteca tecnica da OPAS/OMS para contexto das Americas, vigilancia, protocolos e documentos de saude publica.",
    tags: ["opas", "paho", "america", "saude publica", "vigilancia", "protocolo"],
  },
  {
    id: "ms-pcdt",
    title: "Protocolos Clinicos e Diretrizes Terapeuticas",
    organization: "Ministerio da Saude do Brasil",
    url: "https://www.gov.br/saude/pt-br/assuntos/pcdt",
    summary:
      "PCDTs oficiais do Ministerio da Saude para condutas no SUS, criterios diagnosticos, tratamento e monitoramento.",
    tags: ["brasil", "sus", "pcdt", "ministerio da saude", "protocolo", "tratamento", "diagnostico"],
  },
  {
    id: "cfm-ai",
    title: "Resolucao CFM n. 2.454/2026",
    organization: "Conselho Federal de Medicina",
    url: "https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2026/2454_2026.pdf",
    summary:
      "Normas brasileiras para governanca, auditoria, monitoramento, capacitacao e uso responsavel de IA na medicina.",
    tags: ["cfm", "ia", "etica", "auditoria", "governanca", "medicina", "responsabilidade"],
  },
  {
    id: "nice-guidance",
    title: "NICE guidance",
    organization: "National Institute for Health and Care Excellence",
    url: "https://www.nice.org.uk/guidance",
    summary:
      "Diretrizes clinicas do NICE com recomendacoes baseadas em evidencia, criterios de qualidade e fluxos de cuidado.",
    tags: ["nice", "diretriz", "evidencia", "tratamento", "diagnostico", "conduta"],
  },
  {
    id: "cdc-clinical",
    title: "CDC clinical guidance",
    organization: "Centers for Disease Control and Prevention",
    url: "https://www.cdc.gov/clinical-guidance/",
    summary:
      "Guias clinicos e de saude publica do CDC, especialmente uteis para infeccoes, vacinas, vigilancia e prevencao.",
    tags: ["cdc", "infeccao", "vacina", "prevencao", "vigilancia", "doenca transmissivel"],
  },
  {
    id: "pubmed",
    title: "PubMed",
    organization: "National Library of Medicine",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    summary:
      "Base bibliografica para localizar revisoes sistematicas, ensaios clinicos, metanalises e artigos revisados por pares.",
    tags: ["artigo", "pubmed", "metanalise", "ensaio clinico", "revisao sistematica", "evidencia"],
  },
];

const emergencyTerms = [
  "anafilaxia",
  "convulsao",
  "confusao mental",
  "desmaio",
  "dispneia",
  "dor no peito",
  "dor toracica",
  "hemorragia",
  "parada",
  "rebaixamento",
  "sepse",
  "sinais de choque",
  "suicidio",
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3);
}

export function hasEmergencySignal(question: string) {
  const normalized = normalize(question);
  return emergencyTerms.some((term) => normalized.includes(normalize(term)));
}

export function retrieveMedicalSources(question: string, limit = 5): AiChatSource[] {
  const terms = tokenize(question);
  const normalizedQuestion = normalize(question);

  const scored = sourceCatalog.map((source) => {
    const haystack = normalize(
      `${source.title} ${source.organization} ${source.summary} ${source.tags.join(" ")}`,
    );
    const termScore = terms.reduce((score, term) => score + (haystack.includes(term) ? 2 : 0), 0);
    const tagScore = source.tags.reduce(
      (score, tag) => score + (normalizedQuestion.includes(normalize(tag)) ? 4 : 0),
      0,
    );

    return {
      source,
      score: termScore + tagScore,
    };
  });

  return scored
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ source }) => ({
      id: source.id,
      title: source.title,
      organization: source.organization,
      url: source.url,
      summary: source.summary,
    }));
}

export function sourceSummaryAnswer(question: string, sources: AiChatSource[], emergency: boolean) {
  const sourceList = sources.map((source) => `- ${source.organization}: ${source.summary}`).join("\n");
  const emergencyText = emergency
    ? "A pergunta contem sinais de possivel urgencia. Oriente avaliacao imediata e siga o protocolo local de emergencia antes de qualquer conduta nao presencial.\n\n"
    : "";

  return `${emergencyText}Nao consegui gerar uma resposta completa com IA neste ambiente. Para a duvida enviada, revise as fontes oficiais selecionadas e confronte com protocolo institucional, historia clinica, exame fisico, alergias, gestacao, comorbidades e recursos disponiveis.\n\nFontes priorizadas:\n${sourceList}\n\nPergunta registrada: ${question}`;
}
