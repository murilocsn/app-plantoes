import { once } from "node:events";
import { request, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";

vi.mock("../config/env", () => ({
  env: { NODE_ENV: "production", WEB_ORIGIN: "http://localhost:5173" },
}));
const { getUser, createSupabaseForToken } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createSupabaseForToken: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({ authSupabase: { auth: { getUser } }, createSupabaseForToken }));

type Row = Record<string, string | number | null>;
let rows: Record<string, Row[]>;
let errorTable: string | undefined;
let server: Server | undefined;
const filters = new Map<string, Array<[string, string, string]>>();
const from = vi.fn((table: string) => {
  const applied: Array<[string, string, string]> = [];
  filters.set(table, applied);
  const query = {
    select: () => query,
    order: () => query,
    eq: (column: string, value: string) => {
      applied.push(["eq", column, value]);
      return query;
    },
    gte: (column: string, value: string) => {
      applied.push(["gte", column, value]);
      return query;
    },
    lte: (column: string, value: string) => {
      applied.push(["lte", column, value]);
      return query;
    },
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve({
        data: (rows[table] || []).filter((row) =>
          applied.every(([op, column, value]) =>
            op === "eq"
              ? row[column] === value
              : op === "gte"
                ? String(row[column]) >= value
                : String(row[column]) <= value,
          ),
        ),
        error:
          table === errorTable
            ? { code: "42501", message: "Synthetic permission failure", details: "" }
            : null,
      }).then(resolve, reject),
  };
  return query;
});

async function exportCsv(path = "?from=2026-09-01&to=2026-09-30", authenticated = true) {
  server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test port");
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const outgoing = request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path: `/api/reports/export.csv${path}`,
        agent: false,
        headers: authenticated ? { authorization: "Bearer synthetic-token" } : {},
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolve({ status: response.statusCode!, body }));
      },
    );
    outgoing.setTimeout(1500, () => outgoing.destroy(new Error("Export test timed out")));
    outgoing.once("error", reject);
    outgoing.end();
  });
}

beforeEach(() => {
  rows = {};
  errorTable = undefined;
  filters.clear();
  from.mockClear();
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
  createSupabaseForToken.mockReset().mockReturnValue({ from });
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected external request"));
});

afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
  }
  vi.restoreAllMocks();
});

describe("monthly report export", () => {
  it("requires authentication before accessing any table", async () => {
    expect((await exportCsv("", false)).status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("exports production, actual receipts and expenses for the selected month and user", async () => {
    rows = {
      shifts: [
        { user_id: "user-a", date: "2026-09-01", location_name: "September shift", value: 500 },
        { user_id: "user-a", date: "2026-08-31", location_name: "Outside shift", value: 9000 },
        { user_id: "user-b", date: "2026-09-01", location_name: "Other user", value: 9000 },
      ],
      receivables: [
        {
          user_id: "user-a",
          expected_date: "2026-08-10",
          received_date: "2026-09-01",
          description: "Actual September receipt",
          status: "received",
          amount: 200,
        },
        {
          user_id: "user-a",
          expected_date: "2026-09-10",
          received_date: "2026-10-01",
          description: "Outside receipt",
          status: "received",
          amount: 300,
        },
        {
          user_id: "user-a",
          expected_date: "2026-09-10",
          description: "Missing actual date",
          status: "received",
          amount: 900,
        },
        {
          user_id: "user-a",
          expected_date: "2026-09-30",
          description: "Pending September",
          status: "pending",
          amount: 500,
        },
        {
          user_id: "user-a",
          expected_date: "2026-09-30",
          description: "Cancelled",
          status: "cancelled",
          amount: 900,
        },
      ],
      personal_expenses: [
        { user_id: "user-a", expense_date: "2026-09-30", description: "=FORMULA()", amount: 20 },
        {
          user_id: "user-a",
          expense_date: "2026-10-01",
          description: "Outside expense",
          amount: 800,
        },
      ],
      expenses: [
        {
          paid_by: "user-a",
          expense_date: "2026-09-15",
          description: "Shared expense",
          amount: 30,
        },
        { paid_by: "user-b", expense_date: "2026-09-15", description: "Other payer", amount: 800 },
      ],
    };
    const result = await exportCsv();
    expect(result.status).toBe(200);
    expect(result.body.split("\n")).toHaveLength(6);
    expect(result.body).toContain('"Actual September receipt";"200";"received"');
    expect(result.body).toContain('"Pending September";"500";"pending"');
    expect(result.body).toContain('"\'=FORMULA()";"-20"');
    expect(result.body).toContain('"Shared expense";"-30"');
    expect(result.body).not.toMatch(/Outside|Other user|Other payer|Missing actual date|Cancelled/);
    for (const table of ["shifts", "receivables", "personal_expenses"])
      expect(filters.get(table)).toContainEqual(["eq", "user_id", "user-a"]);
    expect(filters.get("expenses")).toContainEqual(["eq", "paid_by", "user-a"]);
  });

  it("filters the unit without assigning unlinked expenses to it", async () => {
    rows.shifts = [
      {
        user_id: "user-a",
        location_id: "unit-a",
        date: "2026-09-15",
        location_name: "Selected unit",
        value: 500,
      },
      {
        user_id: "user-a",
        location_id: "unit-b",
        date: "2026-09-15",
        location_name: "Other unit",
        value: 900,
      },
    ];
    const result = await exportCsv("?from=2026-09-01&to=2026-09-30&location_id=unit-a");
    expect(result.status).toBe(200);
    expect(result.body).toContain("Selected unit");
    expect(result.body).not.toContain("Other unit");
    expect(filters.get("receivables")).toContainEqual(["eq", "location_id", "unit-a"]);
    expect(filters.has("expenses")).toBe(false);
    expect(filters.has("personal_expenses")).toBe(false);
  });

  it("returns database failures instead of an empty successful export", async () => {
    errorTable = "receivables";
    const result = await exportCsv();
    expect(result.status).toBe(400);
    expect(JSON.parse(result.body).error.code).toBe("42501");
  });
});
