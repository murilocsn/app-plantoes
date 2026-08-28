import { dateRangeQuerySchema, type Expense, type Receivable, type Shift } from "@financplantoes/shared";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler";
import { optionalData } from "../lib/db";

export const reportsRouter = Router();

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
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
    const [shifts, receivables, expenses] = await Promise.all([
      optionalData<Shift[]>(
        shiftsQuery.order("date", { ascending: true }),
        [],
      ),
      optionalData<Receivable[]>(
        request.auth.supabase
          .from("receivables")
          .select("expected_date,description,amount,status")
          .eq("user_id", userId)
          .order("expected_date", { ascending: true }),
        [],
      ),
      optionalData<Expense[]>(
        request.auth.supabase
          .from("personal_expenses")
          .select("expense_date,description,amount")
          .eq("user_id", userId)
          .order("expense_date", { ascending: true }),
        [],
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
      ...receivables.map((item) => [
        "Recebivel",
        item.expected_date,
        item.description,
        item.amount,
        item.status,
      ]),
      ...expenses.map((item) => [
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
