import {
  personalExpenseInputSchema,
  sharedExpenseInputSchema,
  expenseCardInputSchema,
  expenseInviteInputSchema,
  expenseInviteReplySchema,
  expenseSharingIdSchema,
  expenseCardCosts,
  attachExpenseLocations,
  expenseLocationInputSchema,
  expenseLocationInviteSchema,
  locatedExpenseInputSchema,
  type Expense,
} from "@financplantoes/shared";
import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { expectData, optionalData } from "../lib/db";
import { ok } from "../lib/respond";
import { expenseSharingAction, expenseSharingSnapshot } from "../lib/expense-sharing";

export const expensesRouter = Router();

expensesRouter.get(
  "/overview",
  asyncHandler(async (request, response) => {
    const startedAt = performance.now();
    const [personal, shared, expenseSharing] = await Promise.all([
      optionalData<Expense[]>(
        request.auth.supabase
          .from("personal_expenses")
          .select("id,description,amount,expense_date,category,notes,created_at")
          .eq("user_id", request.auth.user.id)
          .order("expense_date", { ascending: false }),
        [],
      ),
      optionalData<Expense[]>(
        request.auth.supabase
          .from("expenses")
          .select("id,description,amount,expense_date,category,notes,created_at")
          .eq("paid_by", request.auth.user.id)
          .order("expense_date", { ascending: false }),
        [],
      ),
      expenseSharingSnapshot(request.auth.supabase),
    ]);
    response.setHeader(
      "Server-Timing",
      `expenses;dur=${Math.round(performance.now() - startedAt)}`,
    );
    ok(response, {
      personal: attachExpenseLocations(personal, expenseSharing),
      shared: [...shared, ...expenseCardCosts(expenseSharing.cards)],
      expenseSharing,
    });
  }),
);

expensesRouter.post(
  "/locations",
  asyncHandler(async (request, response) => {
    const input = expenseLocationInputSchema.parse(request.body);
    ok(
      response,
      await expenseSharingAction(request.auth.supabase, "expense_location_create", {
        p_name: input.name,
        p_visibility: input.visibility,
      }),
      201,
    );
  }),
);

expensesRouter.patch(
  "/locations/:id",
  asyncHandler(async (request, response) => {
    const { id } = expenseSharingIdSchema.parse(request.params);
    const input = expenseLocationInputSchema.pick({ name: true }).parse(request.body);
    ok(
      response,
      await expenseSharingAction(request.auth.supabase, "expense_location_rename", {
        p_card_id: id,
        p_name: input.name,
      }),
    );
  }),
);

expensesRouter.post(
  "/locations/:id/invitations",
  asyncHandler(async (request, response) => {
    const { id } = expenseSharingIdSchema.parse(request.params);
    const input = expenseLocationInviteSchema.parse(request.body);
    ok(
      response,
      await expenseSharingAction(request.auth.supabase, "expense_location_invite", {
        p_card_id: id,
        p_email: input.email,
      }),
      201,
    );
  }),
);

expensesRouter.post(
  "/locations/:id/expenses",
  asyncHandler(async (request, response) => {
    const { id } = expenseSharingIdSchema.parse(request.params);
    const input = locatedExpenseInputSchema.parse({ ...request.body, location_card_id: id });
    ok(
      response,
      await expenseSharingAction(request.auth.supabase, "expense_location_add_shared", {
        p_card_id: id,
        p_description: input.description,
        p_amount: input.amount,
        p_expense_date: input.expense_date,
        p_category: input.category || null,
        p_notes: input.notes || null,
      }),
      201,
    );
  }),
);

expensesRouter.post(
  "/cards",
  asyncHandler(async (request, response) => {
    const input = expenseCardInputSchema.parse(request.body);
    ok(
      response,
      await expenseSharingAction(request.auth.supabase, "expense_sharing_create", {
        p_description: input.description,
        p_amount: input.amount,
        p_expense_date: input.expense_date,
        p_category: input.category || null,
        p_notes: input.notes || null,
      }),
      201,
    );
  }),
);

expensesRouter.post(
  "/cards/:id/invitations",
  asyncHandler(async (request, response) => {
    const { id } = expenseSharingIdSchema.parse(request.params);
    const input = expenseInviteInputSchema.parse(request.body);
    ok(
      response,
      await expenseSharingAction(request.auth.supabase, "expense_sharing_invite", {
        p_card_id: id,
        p_email: input.email,
        p_amount: input.amount,
      }),
      201,
    );
  }),
);

expensesRouter.post(
  "/invitations/:id/respond",
  asyncHandler(async (request, response) => {
    const { id } = expenseSharingIdSchema.parse(request.params);
    const { action } = expenseInviteReplySchema.parse(request.body);
    ok(
      response,
      await expenseSharingAction(request.auth.supabase, "expense_sharing_respond", {
        p_invitation_id: id,
        p_action: action,
      }),
    );
  }),
);

expensesRouter.post(
  "/invitations/:id/cancel",
  asyncHandler(async (request, response) => {
    const { id } = expenseSharingIdSchema.parse(request.params);
    ok(
      response,
      await expenseSharingAction(request.auth.supabase, "expense_sharing_cancel", {
        p_invitation_id: id,
      }),
    );
  }),
);

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
    if (input.location_card_id) {
      ok(
        response,
        await expenseSharingAction(request.auth.supabase, "expense_location_add_personal", {
          p_card_id: input.location_card_id,
          p_description: input.description,
          p_amount: input.amount,
          p_expense_date: input.expense_date,
          p_category: input.category || null,
          p_notes: input.notes || null,
        }),
        201,
      );
      return;
    }
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
