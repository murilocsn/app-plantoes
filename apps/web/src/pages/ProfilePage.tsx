import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Mail, Save, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { useAuth } from "../contexts/AuthContext";
import { profileEmailSchema, profileErrorMessage, profileNameSchema, profilePasswordSchema, type ProfilePassword } from "../lib/profile";

export function ProfilePage() {
  const { user, updateName, changeEmail, changePassword } = useAuth();
  const fullName = typeof user?.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name
    : typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : "";
  const [nameMessage, setNameMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const nameForm = useForm<z.infer<typeof profileNameSchema>>({
    resolver: zodResolver(profileNameSchema),
    values: { fullName },
  });
  const emailForm = useForm<z.infer<typeof profileEmailSchema>>({
    resolver: zodResolver(profileEmailSchema),
    values: { email: user?.email ?? "" },
  });
  const passwordForm = useForm<ProfilePassword>({
    resolver: zodResolver(profilePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmation: "" },
  });
  const busy = nameForm.formState.isSubmitting || emailForm.formState.isSubmitting || passwordForm.formState.isSubmitting;

  async function saveName(input: z.infer<typeof profileNameSchema>) {
    setNameMessage("");
    try {
      await updateName(input.fullName);
      nameForm.reset(input);
      setNameMessage("Nome atualizado.");
    } catch (error) {
      nameForm.setError("root", { message: profileErrorMessage(error) });
    }
  }

  async function saveEmail(input: z.infer<typeof profileEmailSchema>) {
    setEmailMessage("");
    try {
      const pending = await changeEmail(input.email);
      emailForm.reset(input);
      setEmailMessage(pending
        ? "Solicitação enviada. Confira seus e-mails para confirmar a alteração. Seu e-mail atual continua válido até a confirmação."
        : "E-mail atualizado.");
    } catch (error) {
      emailForm.setError("root", { message: profileErrorMessage(error) });
    }
  }

  async function savePassword(input: ProfilePassword) {
    setPasswordMessage("");
    try {
      await changePassword(input);
      passwordForm.reset();
      setPasswordMessage("Senha alterada. Use a nova senha no próximo acesso.");
    } catch (error) {
      passwordForm.reset();
      passwordForm.setError("root", { message: profileErrorMessage(error) });
    }
  }

  return (
    <section className="page-section profile-page">
      <header className="section-head">
        <div>
          <p className="eyebrow">Minha conta</p>
          <h2>Meu perfil</h2>
          <p className="muted">Atualize seu nome e seus dados de acesso.</p>
        </div>
      </header>

      <div className="profile-summary">
        <span aria-hidden="true" className="profile-avatar"><UserRound size={24} /></span>
        <div>
          <strong>{fullName || "Sua conta"}</strong>
          <p className="muted profile-email">{user?.email}</p>
          {user?.new_email && user.new_email !== user.email && (
            <p className="form-hint">Alteração de e-mail aguardando confirmação.</p>
          )}
        </div>
      </div>

      <div className="profile-grid">
        <section aria-labelledby="profile-name-title" className="profile-card">
          <h3 id="profile-name-title"><UserRound aria-hidden="true" size={18} /> Seu nome</h3>
          <form className="form-grid" noValidate onSubmit={nameForm.handleSubmit(saveName)}>
            <Field error={nameForm.formState.errors.fullName?.message} label="Nome de exibição">
              <input autoComplete="name" aria-invalid={Boolean(nameForm.formState.errors.fullName)} disabled={busy} maxLength={80} {...nameForm.register("fullName")} />
            </Field>
            <p className="form-hint">Esse nome aparece na saudação do aplicativo.</p>
            {nameForm.formState.errors.root && <p className="form-message" role="alert">{nameForm.formState.errors.root.message}</p>}
            {nameMessage && <p className="profile-success" role="status">{nameMessage}</p>}
            <div className="form-actions">
              <Button disabled={busy || !nameForm.formState.isDirty} type="submit" variant="primary"><Save aria-hidden="true" size={16} />{nameForm.formState.isSubmitting ? "Salvando…" : "Salvar nome"}</Button>
            </div>
          </form>
        </section>

        <section aria-labelledby="profile-email-title" className="profile-card">
          <h3 id="profile-email-title"><Mail aria-hidden="true" size={18} /> E-mail de acesso</h3>
          <form className="form-grid" noValidate onSubmit={emailForm.handleSubmit(saveEmail)}>
            <Field error={emailForm.formState.errors.email?.message} label="Novo e-mail">
              <input autoComplete="email" aria-invalid={Boolean(emailForm.formState.errors.email)} disabled={busy} maxLength={254} type="email" {...emailForm.register("email")} />
            </Field>
            <p className="form-hint">A alteração pode exigir confirmação nos endereços atual e novo.</p>
            {emailForm.formState.errors.root && <p className="form-message" role="alert">{emailForm.formState.errors.root.message}</p>}
            {emailMessage && <p className="profile-success" role="status">{emailMessage}</p>}
            <div className="form-actions">
              <Button disabled={busy || !emailForm.formState.isDirty} type="submit" variant="primary">{emailForm.formState.isSubmitting ? "Enviando…" : "Solicitar alteração de e-mail"}</Button>
            </div>
          </form>
        </section>

        <section aria-labelledby="profile-password-title" className="profile-card profile-password-card">
          <h3 id="profile-password-title"><KeyRound aria-hidden="true" size={18} /> Alterar senha</h3>
          <p className="form-hint">Confirme sua senha atual e escolha uma nova com pelo menos 8 caracteres.</p>
          <form className="form-grid" noValidate onSubmit={passwordForm.handleSubmit(savePassword)}>
            <Field error={passwordForm.formState.errors.currentPassword?.message} label="Senha atual">
              <input autoComplete="current-password" aria-invalid={Boolean(passwordForm.formState.errors.currentPassword)} disabled={busy} type="password" {...passwordForm.register("currentPassword")} />
            </Field>
            <Field error={passwordForm.formState.errors.password?.message} label="Nova senha">
              <input autoComplete="new-password" aria-invalid={Boolean(passwordForm.formState.errors.password)} disabled={busy} maxLength={128} type="password" {...passwordForm.register("password")} />
            </Field>
            <Field error={passwordForm.formState.errors.confirmation?.message} label="Confirmar nova senha">
              <input autoComplete="new-password" aria-invalid={Boolean(passwordForm.formState.errors.confirmation)} disabled={busy} maxLength={128} type="password" {...passwordForm.register("confirmation")} />
            </Field>
            {passwordForm.formState.errors.root && <p className="form-message" role="alert">{passwordForm.formState.errors.root.message}</p>}
            {passwordMessage && <p className="profile-success" role="status">{passwordMessage}</p>}
            <div className="form-actions">
              <Button disabled={busy || !passwordForm.formState.isDirty} type="submit" variant="primary">{passwordForm.formState.isSubmitting ? "Alterando…" : "Alterar senha"}</Button>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}
