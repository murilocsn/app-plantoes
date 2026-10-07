import type { AiChatResponse } from "@financplantoes/shared";
import { AlertTriangle, Bot, ExternalLink, Send, ShieldCheck, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { domainApi } from "../lib/domain-api";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AiChatResponse;
};

const examples = [
  "Quais fontes revisar para conduta inicial em suspeita de sepse?",
  "Como pesquisar conduta para uso racional de antibiotico em infeccao respiratoria?",
  "Quais sinais de alerta exigem encaminhamento imediato em pediatria?",
];

function compactHistory(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-6)
    .map((message) => ({ role: message.role, content: message.content }));
}

export function AiAssistantPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = question.trim().length >= 8 && !submitting;
  const statusText = useMemo(() => {
    if (submitting) {
      return "Pesquisando fontes e gerando resposta...";
    }

    return "Respostas com fontes oficiais, para apoio educacional e revisao de conduta.";
  }, [submitting]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = question.trim();
    if (!trimmed || submitting) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setQuestion("");
    setError("");
    setSubmitting(true);
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await domainApi.aiChat({
        question: trimmed,
        history: compactHistory(messages),
      });
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        response,
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Nao foi possivel consultar o assistente.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="ai-page">
      <header className="section-head ai-hero">
        <div>
          <p className="eyebrow">Pesquisa assistida</p>
          <h2>Assistente IA</h2>
          <p className="muted">{statusText}</p>
        </div>
        <span className="ai-mode-badge">
          <ShieldCheck size={17} />
          Fontes validadas
        </span>
      </header>

      <div className="ai-safety-box" role="note">
        <AlertTriangle size={18} />
        <span>
          Nao use este assistente como diagnostico definitivo. Em urgencia, acione o protocolo local,
          regulacao/SAMU 192 e avaliacao presencial.
        </span>
      </div>

      <div className="ai-chat-shell">
        <div className="ai-chat-log" aria-live="polite">
          {messages.length === 0 ? (
            <div className="ai-empty-state">
              <Bot size={28} />
              <strong>Comece com uma pergunta clinica objetiva.</strong>
              <span>O assistente seleciona fontes oficiais e retorna uma sintese com limites claros.</span>
              <div className="ai-examples">
                {examples.map((example) => (
                  <button key={example} onClick={() => setQuestion(example)} type="button">
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <article className={`ai-message ${message.role}`} key={message.id}>
                <span className="ai-avatar">
                  {message.role === "user" ? <UserRound size={17} /> : <Bot size={17} />}
                </span>
                <div className="ai-message-body">
                  <strong>{message.role === "user" ? "Voce" : "Assistente IA"}</strong>
                  <p>{message.content}</p>
                  {message.response && (
                    <div className="ai-response-meta">
                      {message.response.emergency && (
                        <span className="ai-alert-pill">
                          <AlertTriangle size={14} />
                          Possivel urgencia
                        </span>
                      )}
                      <span>{message.response.mode === "ai" ? "Resposta gerada por IA" : "Resumo de fontes"}</span>
                      {message.response.model && <span>{message.response.model}</span>}
                    </div>
                  )}
                  {message.response && (
                    <div className="ai-sources">
                      <span>Fontes consultadas</span>
                      {message.response.sources.map((source) => (
                        <a href={source.url} key={source.id} rel="noreferrer" target="_blank">
                          <strong>{source.title}</strong>
                          <small>{source.organization}</small>
                          <ExternalLink size={14} />
                        </a>
                      ))}
                    </div>
                  )}
                  {message.response?.safetyNotice && (
                    <small className="ai-safety-note">{message.response.safetyNotice}</small>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        <form className="ai-chat-form" onSubmit={submit}>
          <Field label="Pergunta">
            <textarea
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ex.: quais fontes oficiais revisar para conduta inicial em suspeita de sepse?"
              rows={4}
              value={question}
            />
          </Field>
          {error && (
            <p className="form-message" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button disabled={!canSubmit} type="submit" variant="primary">
              <Send size={17} />
              <span>{submitting ? "Pesquisando..." : "Enviar"}</span>
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
