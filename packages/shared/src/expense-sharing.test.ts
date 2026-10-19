import { describe, expect, it } from "vitest";
import {
  expenseCardAvailable,
  expenseCardCosts,
  expenseCardInputSchema,
  expenseInviteInputSchema,
  expenseLocationInputSchema,
  expenseLocationInviteSchema,
  locatedExpenseInputSchema,
  attachExpenseLocations,
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
  it("requires an existing location identifier for shared expenses", () => {
    const values = { description: "Internet", amount: 100, expense_date: "2026-10-18" };
    expect(locatedExpenseInputSchema.safeParse(values).success).toBe(false);
    expect(
      locatedExpenseInputSchema.safeParse({ ...values, location_card_id: "invalid" }).success,
    ).toBe(false);
    expect(
      locatedExpenseInputSchema.safeParse({
        ...values,
        location_card_id: "20000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
  });
  it("validates location visibility and normalizes membership invitations", () => {
    expect(expenseLocationInputSchema.parse({ name: " Casa ", visibility: "personal" })).toEqual({
      name: "Casa",
      visibility: "personal",
    });
    expect(
      expenseLocationInputSchema.safeParse({ name: "Casa", visibility: "public" }).success,
    ).toBe(false);
    expect(
      expenseLocationInviteSchema.parse({ email: " GUEST@EXAMPLE.TEST ", amount: 500 }),
    ).toEqual({ email: "guest@example.test" });
  });
  it("preserves location associations without duplicating financial records", () => {
    expect(expenseCardCosts([{ ...card, location_card_id: "location" }])[0]).toMatchObject({
      amount: 200,
      location_card_id: "location",
    });
    expect(
      attachExpenseLocations([{ id: "personal" }, { id: "old" }], {
        available: true,
        cards: [],
        invitations: [],
        personal_locations: [{ expense_id: "personal", location_card_id: "location" }],
      }),
    ).toEqual([
      { id: "personal", location_card_id: "location" },
      { id: "old", location_card_id: undefined },
    ]);
  });
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
