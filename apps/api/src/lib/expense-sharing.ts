import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExpenseSharingSnapshot } from "@financplantoes/shared";
import { HttpError } from "./http-error";

// Only a genuinely absent migration disables this optional module. Database or
// permission failures must not be disguised as an empty list or successful invite.
export async function expenseSharingSnapshot(
  client: SupabaseClient,
): Promise<ExpenseSharingSnapshot> {
  const { data, error } = await client.rpc("expense_sharing_snapshot");
  if (error?.code === "PGRST202") {
    return { available: false, cards: [], invitations: [] };
  }
  if (error || !Array.isArray(data?.cards) || !Array.isArray(data?.invitations))
    throw new HttpError(
      503,
      "Não foi possível carregar as despesas compartilhadas.",
      "EXPENSE_SHARING_UNAVAILABLE",
    );
  return { ...data, available: true };
}

export async function expenseSharingAction(
  client: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
) {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    const messages: Record<string, [number, string]> = {
      "42501": [403, "Você não tem permissão para realizar esta ação."],
      P0002: [404, "Despesa ou convite não encontrado."],
      "23505": [409, "Já existe um convite pendente ou aceito para essa pessoa."],
      "22023": [
        400,
        "Confira o valor e o e-mail informado. O valor não pode ultrapassar o disponível.",
      ],
      P0001: [409, "Esse convite já foi respondido ou cancelado. Atualize a página."],
      "54000": [429, "O limite de convites foi atingido. Tente novamente mais tarde."],
    };
    const [status, message] = messages[error.code] ?? [
      503,
      "Não foi possível concluir a operação. Tente novamente.",
    ];
    throw new HttpError(status, message, "EXPENSE_SHARING_ERROR");
  }
  return { id: data };
}
