import { z } from "zod";
import { personalExpenseInputSchema } from "./schemas";

const moneyInput = z.coerce
  .number()
  .finite()
  .positive("Informe um valor maior que zero")
  .max(9999999999.99)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001,
    "Use no máximo duas casas decimais",
  );

export const expenseCardInputSchema = personalExpenseInputSchema.extend({
  description: z.string().trim().min(2, "Informe uma descrição").max(200),
  amount: moneyInput,
  category: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const expenseInviteInputSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido")
    .max(254)
    .transform((value) => value.toLowerCase()),
  amount: moneyInput,
});
export const expenseInviteReplySchema = z.object({ action: z.enum(["accepted", "declined"]) });
export const expenseSharingIdSchema = z.object({ id: z.string().uuid("Identificador inválido") });

export const expenseLocationInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do local").max(200),
  visibility: z.enum(["personal", "shared"]),
});
export const expenseLocationInviteSchema = expenseInviteInputSchema.pick({ email: true });
export const locatedExpenseInputSchema = expenseCardInputSchema.extend({
  location_card_id: z.string().uuid("Selecione um local"),
});

export type ExpenseInvitation = {
  id: string;
  card_id: string;
  invited_email: string;
  amount: number;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
};
export type ReceivedExpenseInvitation = ExpenseInvitation & {
  description: string;
  expense_date: string;
  total_amount: number;
  owner_name: string;
  is_location?: boolean;
};
export type SharedExpenseCard = {
  id: string;
  owner_id: string;
  owner_name: string;
  description: string;
  expense_date: string;
  category?: string | null;
  notes?: string | null;
  created_at: string;
  total_amount: number;
  amount: number;
  is_owner: boolean;
  participant_count: number;
  invitations: ExpenseInvitation[];
  location_card_id?: string | null;
};
export type ExpenseLocationCard = {
  id: string;
  name: string;
  visibility: "personal" | "shared";
  is_owner: boolean;
  owner_name: string;
  participant_count: number;
  participants: Array<{ name: string; is_owner: boolean }>;
  invitations: ExpenseInvitation[];
};
export type ExpenseSharingSnapshot = {
  available: boolean;
  cards: SharedExpenseCard[];
  invitations: ReceivedExpenseInvitation[];
  locations?: ExpenseLocationCard[];
  personal_locations?: Array<{ expense_id: string; location_card_id: string }>;
};

/** Pending invitations reserve cents, but do not charge their recipients. */
export function expenseCardAvailable(
  card: Pick<SharedExpenseCard, "total_amount" | "invitations">,
) {
  const reserved = card.invitations.reduce(
    (total, invitation) =>
      total +
      (["pending", "accepted"].includes(invitation.status)
        ? Math.round(Number(invitation.amount) * 100)
        : 0),
    0,
  );
  return Math.max(0, Math.round(Number(card.total_amount) * 100) - reserved) / 100;
}

export function expenseCardCosts(cards: readonly SharedExpenseCard[]) {
  return cards.map((card) => ({
    id: card.id,
    sharing_card_id: card.id,
    location_card_id: card.location_card_id,
    description: card.description,
    amount: Number(card.amount),
    expense_date: card.expense_date,
    category: card.category,
    notes: card.notes,
    created_at: card.created_at,
  }));
}

export function attachExpenseLocations<T extends { id: string }>(
  expenses: readonly T[],
  sharing: ExpenseSharingSnapshot,
) {
  const links = new Map(
    sharing.personal_locations?.map((link) => [link.expense_id, link.location_card_id]),
  );
  return expenses.map((expense) => ({ ...expense, location_card_id: links.get(expense.id) }));
}
