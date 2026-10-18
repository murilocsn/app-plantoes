import { describe, expect, it } from "vitest";
import {
  expenseCardAvailable,
  expenseCardCosts,
  expenseCardInputSchema,
  expenseInviteInputSchema,
  type SharedExpenseCard,
} from "./expense-sharing";

const card: SharedExpenseCard = {
  id: "card",
  owner_id: "owner",
  owner_name: "Owner",
  description: "Test",
  expense_date: "2026-10-15",
  created_at: "2026-10-15",
  total_amount: 300.01,
  amount: 200,
  participant_count: 2,
  is_owner: true,
  invitations: [
    {
      id: "a",
      card_id: "card",
      invited_email: "a@example.test",
      amount: 100.01,
      status: "accepted",
      created_at: "2026-10-15",
    },
    {
      id: "b",
      card_id: "card",
      invited_email: "b@example.test",
      amount: 50,
      status: "pending",
      created_at: "2026-10-15",
    },
    {
      id: "c",
      card_id: "card",
      invited_email: "c@example.test",
      amount: 99,
      status: "declined",
      created_at: "2026-10-15",
    },
  ],
};
describe("expense sharing", () => {
  it("reserves pending and accepted cents, freeing declined or cancelled invitations", () => {
    expect(expenseCardAvailable(card)).toBe(150);
    expect(
      expenseCardAvailable({
        ...card,
        invitations: card.invitations.map((i) => ({ ...i, status: "cancelled" })),
      }),
    ).toBe(300.01);
  });
  it("uses individual shares instead of full totals in finance records", () => {
    const [expense] = expenseCardCosts([card]);
    expect(expense).toMatchObject({
      amount: 200,
      sharing_card_id: "card",
      expense_date: "2026-10-15",
    });
    expect(card.total_amount).toBe(300.01);
  });
  it("validates dates, precision, bounded descriptions and normalized email", () => {
    expect(
      expenseCardInputSchema.safeParse({
        description: "Test",
        amount: 1.001,
        expense_date: "2026-10-15",
      }).success,
    ).toBe(false);
    expect(
      expenseCardInputSchema.safeParse({
        description: "Test",
        amount: -1,
        expense_date: "2026-10-15",
      }).success,
    ).toBe(false);
    expect(
      expenseCardInputSchema.safeParse({
        description: "Test",
        amount: 10,
        expense_date: "2026-02-30",
      }).success,
    ).toBe(false);
    expect(
      expenseInviteInputSchema.parse({ email: " GUEST@EXAMPLE.TEST ", amount: "100.01" }),
    ).toEqual({ email: "guest@example.test", amount: 100.01 });
  });
});
