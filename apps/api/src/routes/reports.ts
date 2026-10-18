import { dateRangeQuerySchema, type Expense, type Receivable, type Shift } from "@financplantoes/shared";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler";
import { optionalData } from "../lib/db";

export const reportsRouter = Router();

function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safe = typeof value === "string" && /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

reportsRouter.get(
  "/export.csv",
  asyncHandler(async (request, response) => {
    const userId = request.auth.user.id;
    const query = dateRangeQuerySchema.extend({ location_id: z.string().optional() }).parse(request.query);
    let shiftsQuery = request.auth.supabase
      .from("shifts")
      .select("date,location_name,value,value12")
      .eq("user_id", userId);
    if (query.from) shiftsQuery = shiftsQuery.gte("date", query.from);
    if (query.to) shiftsQuery = shiftsQuery.lte("date", query.to);
    if (query.location_id) shiftsQuery = shiftsQuery.eq("location_id", query.location_id);
    let receivablesQuery = request.auth.supabase.from("receivables")
      .select("expected_date,received_date,description,amount,status,location_id")
      .eq("user_id", userId).order("expected_date", { ascending: true });
    if (query.location_id) receivablesQuery = receivablesQuery.eq("location_id", query.location_id);
    const inPeriod = (date: string | null | undefined) => Boolean(date && (!query.from || date >= query.from) && (!query.to || date <= query.to));
    const [shifts, receivables, expenses, sharedExpenses] = await Promise.all([
      optionalData<Shift[]>(
        shiftsQuery.order("date", { ascending: true }),
        [],
      ),
      optionalData<Receivable[]>(
        receivablesQuery,
        [],
      ),
      query.location_id ? Promise.resolve([] as Expense[]) : optionalData<Expense[]>(
        request.auth.supabase
          .from("personal_expenses")
          .select("expense_date,description,amount")
          .eq("user_id", userId)
          .order("expense_date", { ascending: true }),
        [],
      ),
      query.location_id ? Promise.resolve([] as Expense[]) : optionalData<Expense[]>(
        request.auth.supabase.from("expenses").select("expense_date,description,amount")
          .eq("paid_by", userId).order("expense_date", { ascending: true }), [],
      ),
    ]);

    const rows = [
      ["Tipo", "Data", "Descricao", "Valor", "Status"],
      ...shifts.map((shift) => [
        "Plantao",
        shift.date,
        shift.location_name,
        shift.value ?? shift.value12,
        "",
      ]),
      ...receivables.filter(item => item.status !== "cancelled" && inPeriod(item.status === "received" ? item.received_date : item.expected_date)).map((item) => [
        "Recebivel",
        item.status === "received" ? item.received_date : item.expected_date,
        item.description,
        item.amount,
        item.status,
      ]),
      ...[...expenses, ...sharedExpenses].filter(item => inPeriod(item.expense_date)).map((item) => [
        "Despesa",
        item.expense_date,
        item.description,
        -Number(item.amount || 0),
        "",
      ]),
    ];

    const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");

    response
      .status(200)
      .type("text/csv")
      .attachment(`financplantoes-${new Date().toISOString().slice(0, 10)}.csv`)
      .send(csv);
  }),
);
