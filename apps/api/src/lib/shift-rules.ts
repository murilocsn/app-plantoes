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

function dateAtNoon(value: string) {
  return new Date(`${value}T12:00:00`);
}

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function utcDayNumber(date: Date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

function weeksBetween(start: Date, end: Date) {
  return Math.floor((utcDayNumber(startOfWeek(end)) - utcDayNumber(start)) / 7);
}

function normalizedWeekdays(recurrence: RecurrenceInput) {
  return recurrence.weekdays?.length
    ? [...new Set(recurrence.weekdays)].sort((left, right) => left - right)
    : null;
}

function recurrenceDatesByWeekdays(firstDate: string, recurrence: RecurrenceInput) {
  const weekdays = normalizedWeekdays(recurrence);

  if (!weekdays?.length) {
    return [];
  }

  const dates: string[] = [];
  const selectedWeekdays = new Set(weekdays);
  const intervalWeeks =
    recurrence.frequency === "biweekly" ? recurrence.interval_value * 2 : recurrence.interval_value;
  const limit = recurrence.occurrences ?? 500;
  const endDate = recurrence.end_date ? dateAtNoon(recurrence.end_date) : null;
  const startDate = dateAtNoon(firstDate);
  const anchorWeekStart = startOfWeek(startDate);
  let cursor = new Date(startDate);

  while (dates.length < limit) {
    if (endDate && cursor > endDate) {
      break;
    }

    const weeksSinceStart = weeksBetween(anchorWeekStart, cursor);

    if (weeksSinceStart % intervalWeeks === 0 && selectedWeekdays.has(cursor.getDay())) {
      dates.push(dateValue(cursor));
    }

    cursor = addDays(cursor, 1);
  }

  return dates;
}

export function recurrenceDates(firstDate: string, recurrence: RecurrenceInput) {
  if (!recurrence.end_date && !recurrence.occurrences) {
    throw new HttpError(
      422,
      "Para criar recorrencia, informe uma data final ou quantidade de repeticoes.",
      "RECURRENCE_RANGE_REQUIRED",
    );
  }

  if (
    recurrence.weekdays?.length &&
    (recurrence.frequency === "weekly" || recurrence.frequency === "biweekly")
  ) {
    return recurrenceDatesByWeekdays(firstDate, recurrence);
  }

  const dates: string[] = [];
  const limit = recurrence.occurrences ?? 500;
  const endDate = recurrence.end_date ? dateAtNoon(recurrence.end_date) : null;
  let cursor = dateAtNoon(firstDate);

  while (dates.length < limit) {
    const value = dateValue(cursor);

    if (endDate && cursor > endDate) {
      break;
    }

    dates.push(value);
    cursor = nextDate(cursor, recurrence.frequency, recurrence.interval_value);
  }

  return dates;
}

export function recurrenceForDatabase(recurrence: RecurrenceInput) {
  const weekdays = normalizedWeekdays(recurrence);

  if (recurrence.frequency === "biweekly") {
    return {
      frequency: "weekly",
      interval_value: recurrence.interval_value * 2,
      weekdays,
    };
  }

  return {
    frequency: recurrence.frequency,
    interval_value: recurrence.interval_value,
    weekdays,
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
