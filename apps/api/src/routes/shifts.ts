import {
  dateRangeQuerySchema,
  idParamSchema,
  recurrenceInputSchema,
  shiftInputSchema,
  type Receivable,
  type Shift,
} from "@financplantoes/shared";
import { Router } from "express";
import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler";
import { expectData, normalizeShiftStatus, optionalData } from "../lib/db";
import { HttpError } from "../lib/http-error";
import { ok } from "../lib/respond";

export const shiftsRouter = Router();

const shiftSelect =
  "id,date,start_time,location_id,location_name,duration,value,value12,professional,notes,recurring_group_id,created_at";

const createShiftRequestSchema = z.object({
  shift: shiftInputSchema,
  recurrence: recurrenceInputSchema.nullable().optional(),
});

const deleteShiftRequestSchema = z.object({
  scope: z.enum(["only", "future", "all"]).default("only"),
});

function nextDate(date: Date, frequency: "daily" | "weekly" | "biweekly" | "monthly", interval: number) {
  const next = new Date(date);

  if (frequency === "daily") {
    next.setDate(next.getDate() + interval);
  }

  if (frequency === "weekly") {
    next.setDate(next.getDate() + interval * 7);
  }

  if (frequency === "biweekly") {
    next.setDate(next.getDate() + interval * 14);
  }

  if (frequency === "monthly") {
    next.setMonth(next.getMonth() + interval);
  }

  return next;
}

function recurrenceDates(firstDate: string, recurrence: z.infer<typeof recurrenceInputSchema>) {
  if (!recurrence.end_date && !recurrence.occurrences) {
    throw new HttpError(
      422,
      "Para criar recorrencia, informe uma data final ou quantidade de repeticoes.",
      "RECURRENCE_RANGE_REQUIRED",
    );
  }

  const dates: string[] = [];
  const limit = recurrence.occurrences ?? 500;
  const endDate = recurrence.end_date ? new Date(`${recurrence.end_date}T12:00:00`) : null;
  let cursor = new Date(`${firstDate}T12:00:00`);

  while (dates.length < limit) {
    const value = cursor.toISOString().slice(0, 10);

    if (endDate && cursor > endDate) {
      break;
    }

    dates.push(value);
    cursor = nextDate(cursor, recurrence.frequency, recurrence.interval_value);
  }

  return dates;
}

function recurrenceForDatabase(recurrence: z.infer<typeof recurrenceInputSchema>) {
  if (recurrence.frequency === "biweekly") {
    return {
      frequency: "weekly",
      interval_value: recurrence.interval_value * 2,
    };
  }

  return {
    frequency: recurrence.frequency,
    interval_value: recurrence.interval_value,
  };
}

type PaymentLocation = {
  id: string;
  name: string;
  value12: number;
  active: boolean | null;
  reference_start_day: number;
  reference_end_day: number;
  payment_due_day: number;
  payment_due_months_after: number;
};

async function getLocation(request: Request, id: string) {
  const location = await expectData<PaymentLocation>(
    request.auth.supabase
      .from("locations")
      .select("id,name,value12,active,reference_start_day,reference_end_day,payment_due_day,payment_due_months_after")
      .eq("id", id)
      .eq("user_id", request.auth.user.id)
      .single(),
    "Local nao encontrado.",
  );

  if (location.active === false) {
    throw new HttpError(422, "Este local esta inativo.", "LOCATION_INACTIVE");
  }

  return location;
}

function expectedPaymentDate(shiftDate: string, location: PaymentLocation) {
  const date = new Date(`${shiftDate}T12:00:00Z`);
  const day = date.getUTCDate();
  let periodMonth = date.getUTCMonth();
  const periodYear = date.getUTCFullYear();

  if (location.reference_start_day <= location.reference_end_day) {
    if (day > location.reference_end_day) {
      periodMonth += 1;
    } else if (day < location.reference_start_day) {
      periodMonth -= 1;
    }
  } else if (day < location.reference_start_day) {
    periodMonth -= 1;
  }

  const periodDate = new Date(Date.UTC(periodYear, periodMonth, 1));
  const paymentDate = new Date(
    Date.UTC(
      periodDate.getUTCFullYear(),
      periodDate.getUTCMonth() + location.payment_due_months_after,
      1,
    ),
  );
  const lastDay = new Date(
    Date.UTC(paymentDate.getUTCFullYear(), paymentDate.getUTCMonth() + 1, 0),
  ).getUTCDate();
  paymentDate.setUTCDate(Math.min(location.payment_due_day, lastDay));

  return paymentDate.toISOString().slice(0, 10);
}

shiftsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const query = dateRangeQuerySchema.parse(request.query);
    let builder = request.auth.supabase
      .from("shifts")
      .select(shiftSelect)
      .eq("user_id", request.auth.user.id);

    if (query.from) {
      builder = builder.gte("date", query.from);
    }

    if (query.to) {
      builder = builder.lte("date", query.to);
    }

    const shifts = await optionalData<Shift[]>(
      builder.order("date", { ascending: true }).order("start_time", { ascending: true }),
      [],
    );

    ok(response, shifts.map(normalizeShiftStatus));
  }),
);

shiftsRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = createShiftRequestSchema.parse(request.body);
    const location = await getLocation(request, input.shift.location_id);
    const recurrenceId = input.recurrence ? randomUUID() : null;
    const dates = input.recurrence
      ? recurrenceDates(input.shift.date, input.recurrence)
      : [input.shift.date];

    const rows = dates.map((date) => ({
      id: randomUUID(),
      user_id: request.auth.user.id,
      date,
      start_time: input.shift.start_time,
      location_id: location.id,
      location_name: location.name,
      duration: input.shift.duration,
      value: input.shift.value,
      value12: input.shift.value,
      professional: input.shift.professional,
      notes: input.shift.notes,
      recurring_group_id: recurrenceId,
    }));

    const shifts = await expectData<Shift[]>(
      request.auth.supabase.from("shifts").insert(rows).select(shiftSelect),
    );

    if (input.recurrence && recurrenceId) {
      const normalized = recurrenceForDatabase(input.recurrence);
      await optionalData(
        request.auth.supabase.from("recurrences").insert({
          id: recurrenceId,
          user_id: request.auth.user.id,
          location_id: location.id,
          start_date: input.shift.date,
          end_date: input.recurrence.end_date ?? null,
          frequency: normalized.frequency,
          interval_value: normalized.interval_value,
          start_time: input.shift.start_time,
          duration_hours: input.shift.duration,
          value: input.shift.value,
          active: true,
        }),
        null,
      );
    }

    if (input.shift.createReceivable) {
      const receivableRows = rows.map((row) => ({
        user_id: request.auth.user.id,
        shift_id: row.id,
        location_id: row.location_id,
        description: `Plantao - ${row.location_name}`,
        amount: row.value,
        expected_date: expectedPaymentDate(row.date, location),
        status: "pending",
      }));

      await optionalData<Receivable[]>(
        request.auth.supabase.from("receivables").insert(receivableRows).select("*"),
        [],
      );
    }

    ok(response, shifts.map(normalizeShiftStatus), 201);
  }),
);

shiftsRouter.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    const { id } = idParamSchema.parse(request.params);
    const input = shiftInputSchema.partial().parse(request.body);
    const location = input.location_id ? await getLocation(request, input.location_id) : null;
    const update = {
      date: input.date,
      start_time: input.start_time,
      location_id: location?.id,
      location_name: location?.name,
      duration: input.duration,
      value: input.value,
      value12: input.value,
      professional: input.professional,
      notes: input.notes,
    };

    const shift = await expectData<Shift>(
      request.auth.supabase
        .from("shifts")
        .update(update)
        .eq("id", id)
        .eq("user_id", request.auth.user.id)
        .select(shiftSelect)
        .single(),
    );

    if (location || input.date || input.value !== undefined) {
      const paymentLocation = location ?? (shift.location_id ? await getLocation(request, shift.location_id) : null);
      await optionalData(
        request.auth.supabase
          .from("receivables")
          .update({
            location_id: paymentLocation?.id,
            description: location ? `Plantao - ${location.name}` : undefined,
            amount: input.value,
            expected_date: paymentLocation ? expectedPaymentDate(shift.date, paymentLocation) : undefined,
          })
          .eq("shift_id", id)
          .eq("user_id", request.auth.user.id)
          .neq("status", "received"),
        null,
      );
    }

    ok(response, normalizeShiftStatus(shift));
  }),
);

shiftsRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const { id } = idParamSchema.parse(request.params);
    const input = deleteShiftRequestSchema.parse(request.body ?? {});
    const shift = await expectData<Shift>(
      request.auth.supabase
        .from("shifts")
        .select(shiftSelect)
        .eq("id", id)
        .eq("user_id", request.auth.user.id)
        .single(),
      "Plantao nao encontrado.",
    );

    const groupId = shift.recurring_group_id;
    let ids = [id];

    if (groupId && input.scope !== "only") {
      let builder = request.auth.supabase
        .from("shifts")
        .select("id")
        .eq("user_id", request.auth.user.id)
        .eq("recurring_group_id", groupId);

      if (input.scope === "future") {
        builder = builder.gte("date", shift.date);
      }

      const grouped = await expectData<Array<{ id: string }>>(builder);
      ids = grouped.map((item) => item.id);
    }

    if (ids.length) {
      await optionalData(
        request.auth.supabase
          .from("receivables")
          .delete()
          .eq("user_id", request.auth.user.id)
          .in("shift_id", ids)
          .neq("status", "received"),
        null,
      );

      await expectData(
        request.auth.supabase
          .from("shifts")
          .delete()
          .eq("user_id", request.auth.user.id)
          .in("id", ids),
      );
    }

    if (groupId && input.scope === "all") {
      await optionalData(
        request.auth.supabase
          .from("recurrences")
          .update({ active: false })
          .eq("id", groupId)
          .eq("user_id", request.auth.user.id),
        null,
      );
    }

    ok(response, { ids, scope: input.scope });
  }),
);
