import { BookOpenCheck, ExternalLink, Search, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { diseaseGuidelines, guidelineCategories } from "../lib/disease-guidelines";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function DiseaseGuidelinesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof guidelineCategories)[number]>("Todos");
  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query.trim());

    return diseaseGuidelines.filter((item) => {
      const matchesCategory = category === "Todos" || item.category === category;
      const searchTarget = normalize(
        [
          item.title,
          item.summary,
          item.category,
          item.searchTerms.join(" "),
          item.cid10.map((cid) => `${cid.code} ${cid.label}`).join(" "),
          item.conduct.join(" "),
          item.medications.join(" "),
        ].join(" "),
      );

      return matchesCategory && (!normalizedQuery || searchTarget.includes(normalizedQuery));
    });
  }, [category, query]);

  return (
    <section className="guidelines-page">
      <header className="section-head guidelines-hero">
        <div>
          <p className="eyebrow">Consulta clinica</p>
          <h2>Guidelines de doencas</h2>
          <p className="muted">
            Doencas com CID-10, conduta inicial, medicacoes de referencia e fontes validadas para
            apoio ao plantao.
          </p>
        </div>
        <span className="guidelines-count">{filtered.length} temas</span>
      </header>

      <div className="ai-safety-box guidelines-safety" role="note">
        <ShieldAlert size={18} />
        <span>
          Apoio clinico para profissionais. Nao substitui avaliacao, prescricao, dose individual,
          protocolo local, checagem de alergias, gestacao, idade, peso, funcao renal/hepatica e
          responsabilidade profissional.
        </span>
      </div>

      <div className="guidelines-toolbar">
        <label className="guidelines-search">
          <Search size={18} />
          <input
            aria-label="Buscar guideline"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por doenca, sintoma ou tema"
            type="search"
            value={query}
          />
        </label>
        <div aria-label="Categoria de guideline" className="guidelines-categories" role="group">
          {guidelineCategories.map((option) => (
            <button
              aria-pressed={category === option}
              className={category === option ? "active" : ""}
              key={option}
              onClick={() => setCategory(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="guidelines-grid">
          {filtered.map((item) => (
            <article className="guideline-card" key={item.id}>
              <header className="guideline-card-head">
                <span>
                  <BookOpenCheck size={18} />
                  {item.category}
                </span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
              </header>
              <div className="guideline-cid-list">
                <strong>CID-10</strong>
                <div>
                  {item.cid10.map((cid) => (
                    <span key={`${item.id}-${cid.code}`}>
                      <b>{cid.code}</b>
                      {cid.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="guideline-clinical-grid">
                <div className="guideline-treatment">
                  <strong>Conduta</strong>
                  <ul>
                    {item.conduct.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
                <div className="guideline-treatment">
                  <strong>Medicacoes e medidas</strong>
                  <ul>
                    {item.medications.map((medication) => (
                      <li key={medication}>{medication}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="guideline-checkpoints">
                <strong>O que revisar</strong>
                <ul>
                  {item.checkpoints.map((checkpoint) => (
                    <li key={checkpoint}>{checkpoint}</li>
                  ))}
                </ul>
              </div>
              <div className="guideline-sources">
                <strong>Fontes oficiais</strong>
                {item.sources.map((source) => (
                  <a
                    href={source.url}
                    key={`${item.id}-${source.label}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>
                      <b>{source.label}</b>
                      <small>{source.organization}</small>
                    </span>
                    <ExternalLink size={14} />
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="guidelines-empty">
          <BookOpenCheck size={24} />
          <strong>Nenhum guideline cadastrado para essa busca.</strong>
          <span>
            Tente outro termo ou solicite a inclusao dessa doenca no catalogo. A busca mostra apenas
            temas ja cadastrados.
          </span>
        </div>
      )}
    </section>
  );
}
