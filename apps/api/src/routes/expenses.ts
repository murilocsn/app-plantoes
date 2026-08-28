import {
  personalExpenseInputSchema,
  sharedExpenseInputSchema,
  type Expense,
} from "@financplantoes/shared";
import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { expectData, optionalData } from "../lib/db";
import { ok } from "../lib/respond";

export const expensesRouter = Router();

expensesRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const [personal, memberships] = await Promise.all([
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

    ok(response, { personal, shared });
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
