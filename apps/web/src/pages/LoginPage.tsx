import { CalendarDays, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { useAuth } from "../contexts/AuthContext";

type AuthMode = "login" | "signup";

function friendly(error: unknown) {
  const message = error instanceof Error ? error.message : "Nao foi possivel entrar.";

  return (
    {
      "Invalid login credentials": "E-mail ou senha invalidos.",
      "Email not confirmed": "Confirme seu e-mail antes de entrar.",
      "User already registered": "Este e-mail ja esta cadastrado.",
    }[message] ?? message
  );
}

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);

    try {
      if (mode === "signup") {
        await signUp(email.trim(), password);
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
        </div>
      </section>
      <section className="auth-card">
        <Brand compact />
        <p className="eyebrow">Acesso seguro</p>
        <h2>{mode === "login" ? "Entrar na conta" : "Criar conta"}</h2>
        <form onSubmit={submit}>
          <label className="field">
            <span>E-mail</span>
            <div className="input-icon">
              <Mail size={18} />
              <input
                autoComplete="email"
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
                minLength={6}
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
          <Button className="full" disabled={submitting} type="submit" variant="primary">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
          {message && <p className="form-message">{message}</p>}
        </form>
        <p className="auth-switch">
          {mode === "login" ? (
            <button className="auth-link" onClick={() => setMode("signup")} type="button">
              Você não possui conta? <strong>Criar conta</strong>
            </button>
          ) : (
            <button className="auth-link" onClick={() => setMode("login")} type="button">
              Já tem conta? <strong>Entrar</strong>
            </button>
          )}
        </p>
      </section>
    </main>
  );
}
