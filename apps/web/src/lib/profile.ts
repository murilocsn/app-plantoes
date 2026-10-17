import { z } from "zod";

export const profileNameSchema = z.object({
  fullName: z.string().trim().min(2, "Informe pelo menos 2 caracteres.").max(80, "Use até 80 caracteres."),
});

export const profileEmailSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").max(254, "Use até 254 caracteres."),
});

export const profilePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe sua senha atual."),
  password: z.string().min(8, "Use pelo menos 8 caracteres.").max(128, "Use até 128 caracteres."),
  confirmation: z.string().min(1, "Confirme a nova senha."),
}).refine((value) => value.password === value.confirmation, {
  message: "As senhas precisam ser iguais.",
  path: ["confirmation"],
}).refine((value) => value.password !== value.currentPassword, {
  message: "A nova senha deve ser diferente da atual.",
  path: ["password"],
});

export type ProfilePassword = z.infer<typeof profilePasswordSchema>;

const messages: Record<string, string> = {
  invalid_credentials: "A senha atual está incorreta. Confira e tente novamente.",
  current_password_mismatch: "A senha atual está incorreta. Confira e tente novamente.",
  current_password_required: "Informe sua senha atual para continuar.",
  same_password: "Escolha uma senha diferente da atual.",
  weak_password: "Escolha uma senha mais forte, com letras, números e símbolos.",
  email_exists: "Não foi possível usar esse e-mail. Confira o endereço ou escolha outro.",
  email_address_invalid: "Informe um e-mail válido.",
  over_email_send_rate_limit: "Aguarde alguns minutos antes de solicitar outro e-mail.",
  over_request_rate_limit: "Aguarde alguns minutos e tente novamente.",
  session_not_found: "Entre novamente na sua conta para continuar.",
  session_expired: "Entre novamente na sua conta para continuar.",
  reauthentication_needed: "Entre novamente na sua conta para confirmar a alteração.",
  insufficient_aal: "Confirme sua identidade antes de alterar os dados de acesso.",
};

export function profileErrorMessage(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  // Never echo provider messages: they can contain account details or request data.
  const message = typeof code === "string" && Object.hasOwn(messages, code)
    ? messages[code]
    : undefined;
  return message ?? "Não foi possível salvar a alteração. Tente novamente em alguns instantes.";
}
