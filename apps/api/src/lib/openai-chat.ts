import type { AiChatSource } from "@financplantoes/shared";
import { env } from "../config/env";
import { sourceSummaryAnswer } from "./medical-rag";

type GenerateAnswerInput = {
  question: string;
  sources: AiChatSource[];
  emergency: boolean;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

type ModelJson = {
  answer?: unknown;
  safetyNotice?: unknown;
};

const safetyNotice =
  "Uso de apoio educacional. Nao substitui julgamento clinico, exame fisico, protocolos locais, regulacao vigente ou encaminhamento em urgencia.";

function extractResponseText(payload: unknown) {
  if (payload && typeof payload === "object" && "output_text" in payload) {
    const text = (payload as { output_text?: unknown }).output_text;
    if (typeof text === "string" && text.trim()) {
      return text.trim();
    }
  }

  const output = payload && typeof payload === "object" ? (payload as { output?: unknown }).output : null;
  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .flatMap((item) => {
      const content = item && typeof item === "object" ? (item as { content?: unknown }).content : null;
      return Array.isArray(content) ? content : [];
    })
    .map((content) => {
      if (!content || typeof content !== "object") {
        return "";
      }

      const value = content as { text?: unknown; type?: unknown };
      return typeof value.text === "string" && (!value.type || String(value.type).includes("text"))
        ? value.text
        : "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function parseModelText(text: string) {
  try {
    const parsed = JSON.parse(text) as ModelJson;

    if (typeof parsed.answer === "string") {
      return {
        answer: parsed.answer.trim(),
        safetyNotice: typeof parsed.safetyNotice === "string" ? parsed.safetyNotice.trim() : safetyNotice,
      };
    }
  } catch {
    // Fallback abaixo: o modelo pode retornar texto livre em vez de JSON.
  }

  return {
    answer: text.trim(),
    safetyNotice,
  };
}

function buildSourceContext(sources: AiChatSource[]) {
  return sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title}\nOrganizacao: ${source.organization}\nURL: ${source.url}\nResumo: ${source.summary}`,
    )
    .join("\n\n");
}

export async function generateMedicalAnswer({ question, sources, emergency, history = [] }: GenerateAnswerInput) {
  if (!env.OPENAI_API_KEY) {
    return {
      answer: sourceSummaryAnswer(question, sources, emergency),
      safetyNotice,
      mode: "source-summary" as const,
      model: null,
    };
  }

  const instructions = [
    "Voce e um assistente de apoio a pesquisa de condutas em saude para profissionais.",
    "Responda em portugues do Brasil, de forma objetiva, conservadora e baseada apenas nas fontes fornecidas.",
    "Nao invente diretrizes, doses, diagnosticos, tratamentos ou links.",
    "Quando a pergunta envolver sinais de urgencia, destaque avaliacao imediata e protocolo local antes de discutir conduta.",
    "Inclua limites: necessidade de historia clinica, exame fisico, alergias, gestacao, comorbidades, idade, exames e contexto local.",
    "Nunca substitua avaliacao medica, regulacao, CCIH, SAMU/192, protocolos institucionais ou autoridade sanitaria local.",
    "Retorne exclusivamente JSON valido com as chaves answer e safetyNotice.",
  ].join("\n");

  const compactHistory = history
    .slice(-4)
    .map((message) => `${message.role === "user" ? "Usuario" : "Assistente"}: ${message.content}`)
    .join("\n");

  const input = [
    compactHistory ? `Historico recente:\n${compactHistory}` : "",
    `Sinais de possivel urgencia detectados: ${emergency ? "sim" : "nao"}`,
    `Fontes validadas disponiveis:\n${buildSourceContext(sources)}`,
    `Pergunta do usuario:\n${question}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.AI_CHAT_MODEL,
        instructions,
        input,
        max_output_tokens: 900,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI respondeu com status ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const text = extractResponseText(payload);

    if (!text) {
      throw new Error("OpenAI nao retornou texto");
    }

    return {
      ...parseModelText(text),
      mode: "ai" as const,
      model: env.AI_CHAT_MODEL,
    };
  } catch {
    return {
      answer: sourceSummaryAnswer(question, sources, emergency),
      safetyNotice,
      mode: "source-summary" as const,
      model: null,
    };
  }
}
