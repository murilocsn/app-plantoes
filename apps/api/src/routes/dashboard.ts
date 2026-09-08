import {
  monthQuerySchema,
  type AppBootstrap,
  type DashboardOverview,
  type Expense,
  type Location,
  type Receivable,
  type Shift,
  type Space,
} from "@financplantoes/shared";
import { Router, type Response } from "express";
import { performance } from "node:perf_hooks";
import { asyncHandler } from "../lib/async-handler";
import { normalizeShiftStatus, optionalData } from "../lib/db";
import { ok } from "../lib/respond";

export const dashboardRouter = Router();

const shiftSelect =
  "id,date,start_time,location_id,location_name,duration,value,value12,professional,notes,recurring_group_id,created_at";

const locationSelect =
  "id,name,value12,doc,active,reference_start_day,reference_end_day,payment_due_day,payment_due_months_after,created_at";

const receivableSelect =
  "id,shift_id,location_id,description,amount,expected_date,received_date,payment_method,status,notes,created_at";

const expenseSelect = "id,description,amount,expense_date,category,notes,created_at";

type QueryTimings = Record<string, number>;

function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function getMonthParam(date = new Date()) {
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${date.getUTCFullYear()}`;
}

function parseMonthKey(monthKey: string) {
  const [monthValue, yearValue] = monthKey.split("-");

  return {
    year: Number(yearValue),
    month: Number(monthValue),
  };
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthBounds(monthKey: string) {
  const { year, month } = parseMonthKey(monthKey);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  return {
    from: dateKey(start),
    to: dateKey(end),
  };
}

function calendarBounds(monthKey: string) {
  const { year, month } = parseMonthKey(monthKey);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  return {
    from: dateKey(start),
    to: dateKey(end),
  };
}

function sumBy<T>(items: T[], getValue: (item: T) => unknown) {
  return items.reduce((sum, item) => sum + Number(getValue(item) || 0), 0);
}

function inMonth(value: string | null | undefined, monthKey: string) {
  return String(value ?? "").startsWith(monthKey);
}

async function measure<T>(timings: QueryTimings, name: string, operation: () => Promise<T>) {
  const startedAt = performance.now();

  try {
    return await operation();
  } finally {
    timings[name] = Math.round(performance.now() - startedAt);
  }
}

function writeServerTiming(response: Response, timings: QueryTimings, totalStartedAt: number) {
  const metrics = {
    ...timings,
    total: Math.round(performance.now() - totalStartedAt),
  };

  response.setHeader(
    "Server-Timing",
    Object.entries(metrics)
      .map(([name, duration]) => `${name};dur=${duration}`)
      .join(", "),
  );
}

function calculateBootstrap(data: Omit<AppBootstrap, "summary">): AppBootstrap {
  const monthKey = getMonthKey();
  const monthShifts = data.shifts.filter((shift) => inMonth(shift.date, monthKey));
  const monthReceivables = data.receivables.filter((item) => inMonth(item.expected_date, monthKey));
  const activeReceivables = monthReceivables.filter((item) => item.status !== "cancelled");
  const received = sumBy(
    activeReceivables.filter((item) => item.status === "received"),
    (item) => item.amount,
  );
  const pending = sumBy(
    activeReceivables.filter((item) => item.status === "pending" || item.status === "overdue"),
    (item) => item.amount,
  );
  const expenses = sumBy(
    data.personalExpenses.filter((item) => inMonth(item.expense_date, monthKey)),
    (item) => item.amount,
  );
  const incomeProjected = sumBy(monthShifts, (item) => item.value ?? item.value12);
  const nextReceivable =
    activeReceivables
      .filter((item) => item.status === "pending" || item.status === "overdue")
      .sort((left, right) =>
        String(left.expected_date ?? "").localeCompare(String(right.expected_date ?? "")),
      )[0] ?? null;

  return {
    ...data,
    summary: {
      monthKey,
      incomeProjected,
      received,
      pending,
      expenses,
      net: received - expenses,
      shiftCount: monthShifts.length,
      shiftHours: sumBy(monthShifts, (item) => item.duration),
      activeLocationCount: data.locations.filter((item) => item.active !== false).length,
      nextReceivable,
    },
  };
}

dashboardRouter.get(
  "/overview",
  asyncHandler(async (request, response) => {
    const totalStartedAt = performance.now();
    const timings: QueryTimings = {};
    const userId = request.auth.user.id;
    const supabase = request.auth.supabase;
    const { month = getMonthParam() } = monthQuerySchema.parse(request.query);
    const monthRange = monthBounds(month);
    const calendarRange = calendarBounds(month);
    const today = new Date().toISOString().slice(0, 10);

    const [
      calendarShifts,
      upcomingShifts,
      locations,
      monthReceivables,
      dashboardReceivables,
      personalExpenses,
      membershipRows,
    ] = await Promise.all([
      measure(timings, "calendar_shifts", () =>
        optionalData<Shift[]>(
          supabase
            .from("shifts")
            .select(shiftSelect)
            .eq("user_id", userId)
            .gte("date", calendarRange.from)
            .lte("date", calendarRange.to)
            .order("date", { ascending: true })
            .order("start_time", { ascending: true }),
          [],
        ),
      ),
      measure(timings, "upcoming_shifts", () =>
        optionalData<Shift[]>(
          supabase
            .from("shifts")
            .select(shiftSelect)
            .eq("user_id", userId)
            .gte("date", today)
            .order("date", { ascending: true })
            .order("start_time", { ascending: true })
            .limit(6),
          [],
        ),
      ),
      measure(timings, "locations", () =>
        optionalData<Location[]>(
          supabase
            .from("locations")
            .select(locationSelect)
            .eq("user_id", userId)
            .order("name", { ascending: true }),
          [],
        ),
      ),
      measure(timings, "month_receivables", () =>
        optionalData<Receivable[]>(
          supabase
            .from("receivables")
            .select(receivableSelect)
            .eq("user_id", userId)
            .gte("expected_date", monthRange.from)
            .lte("expected_date", monthRange.to)
            .order("expected_date", { ascending: true }),
          [],
        ),
      ),
      measure(timings, "open_receivables", () =>
        optionalData<Receivable[]>(
          supabase
            .from("receivables")
            .select(receivableSelect)
            .eq("user_id", userId)
            .in("status", ["pending", "overdue"])
            .order("expected_date", { ascending: true })
            .limit(6),
          [],
        ),
      ),
      measure(timings, "personal_expenses", () =>
        optionalData<Expense[]>(
          supabase
            .from("personal_expenses")
            .select(expenseSelect)
            .eq("user_id", userId)
            .gte("expense_date", monthRange.from)
            .lte("expense_date", monthRange.to)
            .order("expense_date", { ascending: false }),
          [],
        ),
      ),
      measure(timings, "spaces", () =>
        optionalData<Array<{ role: string; spaces: Pick<Space, "archived"> | null }>>(
          supabase
            .from("space_members")
            .select("role,spaces(archived)")
            .eq("user_id", userId)
            .eq("status", "active"),
          [],
        ),
      ),
    ]);

    const normalizedCalendarShifts = calendarShifts.map(normalizeShiftStatus);
    const normalizedUpcomingShifts = upcomingShifts.map(normalizeShiftStatus);
    const monthShifts = normalizedCalendarShifts.filter(
      (shift) => shift.date >= monthRange.from && shift.date <= monthRange.to,
    );
    const activeReceivables = monthReceivables.filter((item) => item.status !== "cancelled");
    const received = sumBy(
      activeReceivables.filter((item) => item.status === "received"),
      (item) => item.amount,
    );
    const pending = sumBy(
      activeReceivables.filter((item) => item.status === "pending" || item.status === "overdue"),
      (item) => item.amount,
    );
    const expenses = sumBy(personalExpenses, (item) => item.amount);
    const incomeProjected = sumBy(monthShifts, (item) => item.value ?? item.value12);
    const nextReceivable = dashboardReceivables[0] ?? null;
    const overview: DashboardOverview = {
      summary: {
        monthKey: month,
        incomeProjected,
        received,
        pending,
        expenses,
        net: received - expenses,
        shiftCount: monthShifts.length,
        shiftHours: sumBy(monthShifts, (item) => item.duration),
        activeLocationCount: locations.filter((item) => item.active !== false).length,
        nextReceivable,
      },
      calendarShifts: normalizedCalendarShifts,
      upcomingShifts: normalizedUpcomingShifts,
      receivables: dashboardReceivables,
      locations,
      spaceCount: membershipRows.filter((row) => row.spaces && row.spaces.archived !== true).length,
    };

    writeServerTiming(response, timings, totalStartedAt);
    ok(response, overview);
  }),
);

dashboardRouter.get(
  "/bootstrap",
  asyncHandler(async (request, response) => {
    const totalStartedAt = performance.now();
    const timings: QueryTimings = {};
    const userId = request.auth.user.id;
    const supabase = request.auth.supabase;

    const [shifts, locations, receivables, personalExpenses, membershipRows, directSharedExpenses] =
      await Promise.all([
        measure(timings, "shifts", () =>
          optionalData<Shift[]>(
            supabase
              .from("shifts")
              .select(shiftSelect)
              .eq("user_id", userId)
              .order("date", { ascending: true })
              .order("start_time", { ascending: true }),
            [],
          ),
        ),
        measure(timings, "locations", () =>
          optionalData<Location[]>(
            supabase
              .from("locations")
              .select(locationSelect)
              .eq("user_id", userId)
              .order("name", { ascending: true }),
            [],
          ),
        ),
        measure(timings, "receivables", () =>
          optionalData<Receivable[]>(
            supabase
              .from("receivables")
              .select(receivableSelect)
              .eq("user_id", userId)
              .order("expected_date", { ascending: true }),
            [],
          ),
        ),
        measure(timings, "personal_expenses", () =>
          optionalData<Expense[]>(
            supabase
              .from("personal_expenses")
              .select(expenseSelect)
              .eq("user_id", userId)
              .order("expense_date", { ascending: false }),
            [],
          ),
        ),
        measure(timings, "spaces", () =>
          optionalData<Array<{ role: string; spaces: Space | null }>>(
            supabase
              .from("space_members")
              .select(
                "role,spaces(id,name,space_type,description,start_date,end_date,archived,owner_id)",
              )
              .eq("user_id", userId)
              .eq("status", "active"),
            [],
          ),
        ),
        measure(timings, "shared_expenses", () =>
          optionalData<Expense[]>(
            supabase
              .from("expenses")
              .select(expenseSelect)
              .eq("paid_by", userId)
              .order("expense_date", { ascending: false }),
            [],
          ),
        ),
      ]);

    const spaces = membershipRows
      .filter((row) => row.spaces && row.spaces.archived !== true)
      .map((row) => ({
        ...row.spaces,
        role: row.role,
      })) as Space[];

    writeServerTiming(response, timings, totalStartedAt);
    ok(
      response,
      calculateBootstrap({
        shifts: shifts.map(normalizeShiftStatus),
        locations,
        receivables,
        personalExpenses,
        sharedExpenses: directSharedExpenses,
        spaces,
        plans: [],
      }),
    );
  }),
);
