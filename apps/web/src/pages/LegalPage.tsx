import { useEffect } from "react";
import { Link } from "react-router-dom";
import termsText from "../../../../docs/07-privacidade-lgpd/termos-de-uso.md?raw";
import privacyText from "../../../../docs/07-privacidade-lgpd/aviso-de-privacidade.md?raw";
import { Brand } from "../components/Brand";
import { PRIVACY_VERSION, TERMS_VERSION } from "../lib/legal";

// These source-controlled documents use only headings, paragraphs and plain lists.
// Render text nodes; never execute HTML or URLs supplied inside a document.
function documentBlock(block: string, index: number) {
  if (block.startsWith("# ")) return <h1 key={index}>{block.slice(2)}</h1>;
  if (block.startsWith("## ")) return <h2 key={index}>{block.slice(3)}</h2>;
  if (block.startsWith("- ")) return <ul key={index}>{block.split("\n").map((line) => <li key={line}>{line.slice(2)}</li>)}</ul>;
  return <p key={index}>{block}</p>;
}

export function LegalPage({ document }: { document: "terms" | "privacy" }) {
  const isTerms = document === "terms";
  const text = isTerms ? termsText : privacyText;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [document]);

  return (
    <main className="legal-page">
      <header className="legal-header">
        <Brand compact />
        <Link to="/login">Voltar ao aplicativo</Link>
      </header>
      <article aria-label={isTerms ? "Termos de Uso" : "Aviso de Privacidade"}>
        <p className="eyebrow">Versão {isTerms ? TERMS_VERSION : PRIVACY_VERSION}</p>
        <nav aria-label="Documentos legais" className="legal-links">
          <Link aria-current={isTerms ? "page" : undefined} to="/terms">Termos de Uso</Link>
          <Link aria-current={!isTerms ? "page" : undefined} to="/privacy">Aviso de Privacidade</Link>
        </nav>
        {text.trim().split(/\r?\n\s*\r?\n/).map(documentBlock)}
      </article>
    </main>
  );
}
