import type { AppBootstrap, Expense, Location, Receivable, Shift, Space } from "@financplantoes/shared";
import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { normalizeShiftStatus, optionalData } from "../lib/db";
import { ok } from "../lib/respond";

export const dashboardRouter = Router();

function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function sumBy<T>(items: T[], getValue: (item: T) => unknown) {
  return items.reduce((sum, item) => sum + Number(getValue(item) || 0), 0);
}

function calculateBootstrap(data: Omit<AppBootstrap, "summary">): AppBootstrap {
  const monthKey = getMonthKey();
  const monthShifts = data.shifts.filter((shift) => String(shift.date).startsWith(monthKey));
  const activeReceivables = data.receivables.filter((item) => item.status !== "cancelled");
  const received = sumBy(
    activeReceivables.filter((item) => item.status === "received"),
    (item) => item.amount,
  );
  const pending = sumBy(
    activeReceivables.filter((item) => item.status === "pending" || item.status === "overdue"),
    (item) => item.amount,
  );
  const expenses = sumBy(data.personalExpenses, (item) => item.amount);
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
  "/bootstrap",
  asyncHandler(async (request, response) => {
    const userId = request.auth.user.id;
    const supabase = request.auth.supabase;

    const [
      shifts,
      locations,
      receivables,
      personalExpenses,
      membershipRows,
      directSharedExpenses,
    ] = await Promise.all([
      optionalData<Shift[]>(
        supabase
          .from("shifts")
          .select(
            "id,date,start_time,location_id,location_name,duration,value,value12,professional,notes,recurring_group_id,created_at",
          )
          .eq("user_id", userId)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true }),
        [],
      ),
      optionalData<Location[]>(
        supabase
          .from("locations")
          .select("id,name,value12,doc,active,created_at")
          .eq("user_id", userId)
          .order("name", { ascending: true }),
        [],
      ),
      optionalData<Receivable[]>(
        supabase
          .from("receivables")
          .select(
            "id,shift_id,location_id,description,amount,expected_date,received_date,payment_method,status,notes,created_at",
          )
          .eq("user_id", userId)
          .order("expected_date", { ascending: true }),
        [],
      ),
      optionalData<Expense[]>(
        supabase
          .from("personal_expenses")
          .select("id,description,amount,expense_date,category,notes,created_at")
          .eq("user_id", userId)
          .order("expense_date", { ascending: false }),
        [],
      ),
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
      optionalData<Expense[]>(
        supabase
          .from("expenses")
          .select("id,description,amount,expense_date,category,notes,created_at")
          .eq("paid_by", userId)
          .order("expense_date", { ascending: false }),
        [],
      ),
    ]);

    const spaces = membershipRows
      .filter((row) => row.spaces && row.spaces.archived !== true)
      .map((row) => ({
        ...row.spaces,
        role: row.role,
      })) as Space[];

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
