import type { recurrenceInputSchema } from "@financplantoes/shared";
import type { z } from "zod";
import { HttpError } from "./http-error";

export type RecurrenceInput = z.infer<typeof recurrenceInputSchema>;

export type PaymentLocation = {
  id: string;
  name: string;
  value12: number;
  active: boolean | null;
  reference_start_day: number;
  reference_end_day: number;
  payment_due_day: number;
  payment_due_months_after: number;
};

export function nextDate(
  date: Date,
  frequency: "daily" | "weekly" | "biweekly" | "monthly",
  interval: number,
) {
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

export function recurrenceDates(firstDate: string, recurrence: RecurrenceInput) {
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

export function recurrenceForDatabase(recurrence: RecurrenceInput) {
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

export function expectedPaymentDate(shiftDate: string, location: PaymentLocation) {
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
    Date.UTC(periodDate.getUTCFullYear(), periodDate.getUTCMonth() + location.payment_due_months_after, 1),
  );
  const lastDay = new Date(
    Date.UTC(paymentDate.getUTCFullYear(), paymentDate.getUTCMonth() + 1, 0),
  ).getUTCDate();
  paymentDate.setUTCDate(Math.min(location.payment_due_day, lastDay));

  return paymentDate.toISOString().slice(0, 10);
}
