import {
  personalExpenseInputSchema,
  sharedExpenseInputSchema,
  expenseCardInputSchema,
  expenseInviteInputSchema,
  expenseInviteReplySchema,
  expenseSharingIdSchema,
  expenseCardCosts,
  type Expense,
} from "@financplantoes/shared";
import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { expectData, optionalData } from "../lib/db";
import { ok } from "../lib/respond";
import { expenseSharingAction, expenseSharingSnapshot } from "../lib/expense-sharing";

export const expensesRouter = Router();

expensesRouter.post("/cards", asyncHandler(async (request, response) => {
  const input = expenseCardInputSchema.parse(request.body);
  ok(response, await expenseSharingAction(request.auth.supabase, "expense_sharing_create", {
    p_description: input.description, p_amount: input.amount, p_expense_date: input.expense_date,
    p_category: input.category || null, p_notes: input.notes || null,
  }), 201);
}));

expensesRouter.post("/cards/:id/invitations", asyncHandler(async (request, response) => {
  const { id } = expenseSharingIdSchema.parse(request.params);
  const input = expenseInviteInputSchema.parse(request.body);
  ok(response, await expenseSharingAction(request.auth.supabase, "expense_sharing_invite", {
    p_card_id: id, p_email: input.email, p_amount: input.amount,
  }), 201);
}));

expensesRouter.post("/invitations/:id/respond", asyncHandler(async (request, response) => {
  const { id } = expenseSharingIdSchema.parse(request.params);
  const { action } = expenseInviteReplySchema.parse(request.body);
  ok(response, await expenseSharingAction(request.auth.supabase, "expense_sharing_respond", {
    p_invitation_id: id, p_action: action,
  }));
}));

expensesRouter.post("/invitations/:id/cancel", asyncHandler(async (request, response) => {
  const { id } = expenseSharingIdSchema.parse(request.params);
  ok(response, await expenseSharingAction(request.auth.supabase, "expense_sharing_cancel", {
    p_invitation_id: id,
  }));
}));

expensesRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const [personal, memberships, sharing] = await Promise.all([
      optionalData<Expense[]>(
        request.auth.supabase
          .from("personal_expenses")
          .select("id,description,amount,expense_date,category,notes,created_at")
          .eq("user_id", request.auth.user.id)
          .order("expense_date", { ascending: false }),
        [],
      ),
      optionalData<Array<{ space_id: string }>>(
        request.auth.supabase
          .from("space_members")
          .select("space_id")
          .eq("user_id", request.auth.user.id)
          .eq("status", "active"),
        [],
      ),
      expenseSharingSnapshot(request.auth.supabase),
    ]);

    const spaceIds = memberships.map((item) => item.space_id);
    const shared = spaceIds.length
      ? await optionalData<Expense[]>(
          request.auth.supabase
            .from("expenses")
            .select("id,description,amount,expense_date,category,notes,created_at")
            .in("space_id", spaceIds)
            .order("expense_date", { ascending: false }),
          [],
        )
      : [];

    ok(response, { personal, shared: [...shared, ...expenseCardCosts(sharing.cards)] });
  }),
);

expensesRouter.post(
  "/personal",
  asyncHandler(async (request, response) => {
    const input = personalExpenseInputSchema.parse(request.body);
    const expense = await expectData<Expense>(
      request.auth.supabase
        .from("personal_expenses")
        .insert({
          ...input,
          user_id: request.auth.user.id,
        })
        .select("id,description,amount,expense_date,category,notes,created_at")
        .single(),
    );

    ok(response, expense, 201);
  }),
);

expensesRouter.post(
  "/shared",
  asyncHandler(async (request, response) => {
    const input = sharedExpenseInputSchema.parse(request.body);
    const expense = await expectData<Expense>(
      request.auth.supabase
        .from("expenses")
        .insert({
          ...input,
          paid_by: request.auth.user.id,
        })
        .select("id,description,amount,expense_date,category,notes,created_at")
        .single(),
    );

    ok(response, expense, 201);
  }),
);
