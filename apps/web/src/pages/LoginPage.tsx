import { CalendarDays, Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { LegalAcknowledgmentError, PRIVACY_VERSION, TERMS_VERSION } from "../lib/legal";

type AuthMode = "login" | "signup";

function friendly(error: unknown) {
  if (error instanceof LegalAcknowledgmentError) return error.message;
  if (error && typeof error === "object" && "code" in error && error.code === "signup_name_invalid") {
    return "Informe seu nome completo, com 2 a 80 caracteres.";
  }
  const message = error instanceof Error ? error.message : "Nao foi possivel entrar.";

  const messages: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha invalidos.",
    "Email not confirmed": "Confirme seu e-mail antes de entrar.",
    "User already registered": "Este e-mail ja esta cadastrado.",
  };
  const translated = Object.hasOwn(messages, message) ? messages[message] : undefined;
  return translated ?? "Não foi possível concluir o acesso. Tente novamente em instantes.";
}

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setTermsAccepted(false);
    setPrivacyAcknowledged(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);

    try {
      if (mode === "signup") {
        await signUp(email.trim(), password, fullName, {
          termsAccepted, privacyAcknowledged,
          termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION,
        });
        setPassword("");
        setFullName("");
        setTermsAccepted(false);
        setPrivacyAcknowledged(false);
        setMessage("Conta criada. Confira seu e-mail caso a confirmacao esteja ativa.");
      } else {
        await signIn(email.trim(), password);
      }
    } catch (error) {
      setMessage(friendly(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-media">
        <Brand />
        <div className="auth-media-copy">
          <CalendarDays size={42} />
          <h1>Plantoes, recebimentos e rotina financeira no mesmo fluxo.</h1>
          <p>Agenda visual, API dedicada e dados isolados pelo Supabase RLS.</p>
          <p className="author-signature">
            Idealizado por <strong>Murilo Neder</strong>
          </p>
        </div>
      </section>
      <section className="auth-card">
        <Brand compact />
        <p className="eyebrow">Acesso seguro</p>
        <h2>{mode === "login" ? "Entrar na conta" : "Criar conta"}</h2>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <label className="field">
              <span>Nome completo</span>
              <div className="input-icon">
                <UserRound aria-hidden="true" size={18} />
                <input
                  autoComplete="name"
                  disabled={submitting}
                  maxLength={80}
                  minLength={2}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  type="text"
                  value={fullName}
                />
              </div>
            </label>
          )}
          <label className="field">
            <span>E-mail</span>
            <div className="input-icon">
              <Mail size={18} />
              <input
                autoComplete="email"
                disabled={submitting}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
          </label>
          <label className="field">
            <span>Senha</span>
            <div className="input-icon">
              <Lock size={18} />
              <input
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                disabled={submitting}
                minLength={mode === "signup" ? 8 : 6}
                onChange={(event) => setPassword(event.target.value)}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <Button
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword((value) => !value)}
                size="icon"
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                variant="ghost"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </Button>
            </div>
          </label>
          {mode === "signup" && (
            <fieldset className="signup-legal" disabled={submitting}>
              <legend>Antes de criar sua conta</legend>
              <p className="form-hint">Os documentos estão em revisão. Consulte os modelos antes de manifestar sua ciência.</p>
              <label className="legal-check" htmlFor="signup-terms">
                <input checked={termsAccepted} id="signup-terms" onChange={(event) => setTermsAccepted(event.target.checked)} required type="checkbox" />
                <span>Li e aceito os <Link rel="noopener noreferrer" target="_blank" to="/terms">Termos de Uso</Link> (versão {TERMS_VERSION}).</span>
              </label>
              <label className="legal-check" htmlFor="signup-privacy">
                <input checked={privacyAcknowledged} id="signup-privacy" onChange={(event) => setPrivacyAcknowledged(event.target.checked)} required type="checkbox" />
                <span>Li e estou ciente do <Link rel="noopener noreferrer" target="_blank" to="/privacy">Aviso de Privacidade</Link> (versão {PRIVACY_VERSION}).</span>
              </label>
              <p className="form-hint">A ciência não autoriza publicidade nem o uso irrestrito dos seus dados. Não cadastre informações de pacientes.</p>
            </fieldset>
          )}
          <Button className="full" disabled={submitting} type="submit" variant="primary">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
          {message && <p className="form-message" role="status">{message}</p>}
        </form>
        <p className="auth-switch">
          {mode === "login" ? (
            <button className="auth-link" disabled={submitting} onClick={() => switchMode("signup")} type="button">
              Você não possui conta? <strong>Criar conta</strong>
            </button>
          ) : (
            <button className="auth-link" disabled={submitting} onClick={() => switchMode("login")} type="button">
              Já tem conta? <strong>Entrar</strong>
            </button>
          )}
        </p>
        <nav aria-label="Documentos legais" className="legal-links">
          <Link rel="noopener noreferrer" target="_blank" to="/terms">Termos de Uso</Link>
          <Link rel="noopener noreferrer" target="_blank" to="/privacy">Aviso de Privacidade</Link>
        </nav>
      </section>
    </main>
  );
}
