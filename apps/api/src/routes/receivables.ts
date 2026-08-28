import {
  idParamSchema,
  markReceivablePaidSchema,
  receivableInputSchema,
  type Receivable,
} from "@financplantoes/shared";
import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { expectData, optionalData } from "../lib/db";
import { ok } from "../lib/respond";

export const receivablesRouter = Router();

const receivableSelect =
  "id,shift_id,location_id,description,amount,expected_date,received_date,payment_method,status,notes,created_at";

receivablesRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const receivables = await optionalData<Receivable[]>(
      request.auth.supabase
        .from("receivables")
        .select(receivableSelect)
        .eq("user_id", request.auth.user.id)
        .order("expected_date", { ascending: true }),
      [],
    );

    ok(response, receivables);
  }),
);

receivablesRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = receivableInputSchema.parse(request.body);
    const receivable = await expectData<Receivable>(
      request.auth.supabase
        .from("receivables")
        .insert({
          ...input,
          user_id: request.auth.user.id,
        })
        .select(receivableSelect)
        .single(),
    );

    ok(response, receivable, 201);
  }),
);

receivablesRouter.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    const { id } = idParamSchema.parse(request.params);
    const input = receivableInputSchema.partial().parse(request.body);
    const receivable = await expectData<Receivable>(
      request.auth.supabase
        .from("receivables")
        .update(input)
        .eq("id", id)
        .eq("user_id", request.auth.user.id)
        .select(receivableSelect)
        .single(),
    );

    ok(response, receivable);
  }),
);

receivablesRouter.post(
  "/:id/mark-paid",
  asyncHandler(async (request, response) => {
    const { id } = idParamSchema.parse(request.params);
    const input = markReceivablePaidSchema.parse(request.body);

    const receivable = await expectData<Receivable>(
      request.auth.supabase
        .from("receivables")
        .update({
          ...input,
          received_date: input.received_date ?? new Date().toISOString().slice(0, 10),
          status: "received",
        })
        .eq("id", id)
        .eq("user_id", request.auth.user.id)
        .select(receivableSelect)
        .single(),
    );

    ok(response, receivable);
  }),
);

receivablesRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const { id } = idParamSchema.parse(request.params);

    await expectData(
      request.auth.supabase
        .from("receivables")
        .delete()
        .eq("id", id)
        .eq("user_id", request.auth.user.id),
    );

    ok(response, { id });
  }),
);
