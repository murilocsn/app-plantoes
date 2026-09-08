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

function normalizeDateInput(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const text = value.trim();
  const brDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!brDate) {
    return text;
  }

  const day = brDate[1];
  const month = brDate[2];
  const year = brDate[3];
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizePaymentMethodInput(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().toLowerCase();
}

function normalizeReceivableInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }

  const input = body as Record<string, unknown>;
  return {
    ...input,
    expected_date: normalizeDateInput(input.expected_date),
    received_date: normalizeDateInput(input.received_date),
    payment_method: normalizePaymentMethodInput(input.payment_method),
  };
}

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
    const input = receivableInputSchema.parse(normalizeReceivableInput(request.body));
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
    const input = receivableInputSchema.partial().parse(normalizeReceivableInput(request.body));
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
    const input = markReceivablePaidSchema.parse(normalizeReceivableInput(request.body));

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
