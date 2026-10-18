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

type Row = {
  id: string;
  user_id: string;
  status: string;
  amount: number;
  received_date?: string;
  payment_method?: string;
  notes?: string;
};
let rows: Row[];
let databaseFails: boolean;
let server: Server | undefined;
const update = vi.fn();
const appliedFilters: Array<[string, unknown]> = [];
const from = vi.fn(() => {
  let payload: Partial<Row> = {};
  const predicates: Array<(row: Row) => boolean> = [];
  const query = {
    update: (value: Partial<Row>) => {
      update(value);
      payload = value;
      return query;
    },
    select: () => query,
    eq: (column: keyof Row, value: string) => {
      appliedFilters.push([column, value]);
      predicates.push((row) => row[column] === value);
      return query;
    },
    in: (column: keyof Row, values: string[]) => {
      appliedFilters.push([column, values]);
      predicates.push((row) => values.includes(String(row[column])));
      return query;
    },
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
      if (databaseFails)
        return Promise.resolve({
          data: null,
          error: { code: "42501", message: "Synthetic database failure", details: "" },
        }).then(resolve, reject);
      const selected = rows.filter((row) => predicates.every((predicate) => predicate(row)));
      for (const row of selected) Object.assign(row, payload);
      return Promise.resolve({ data: selected, error: null }).then(resolve, reject);
    },
  };
  return query;
});

async function markPaid(body: unknown, authenticated = true) {
  if (!server) {
    server = createApp().listen(0, "127.0.0.1");
    await once(server, "listening");
  }
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing local test port");
  return new Promise<{ status: number; body: { data?: Row[]; error?: { code: string } } }>(
    (resolve, reject) => {
      const outgoing = request(
        {
          hostname: "127.0.0.1",
          port: address.port,
          path: "/api/receivables/mark-paid",
          method: "POST",
          agent: false,
          headers: {
            "content-type": "application/json",
            ...(authenticated ? { authorization: "Bearer synthetic-token" } : {}),
          },
        },
        (response) => {
          let responseBody = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            responseBody += chunk;
          });
          response.on("end", () =>
            resolve({ status: response.statusCode!, body: JSON.parse(responseBody) }),
          );
        },
      );
      outgoing.setTimeout(1500, () => outgoing.destroy(new Error("Batch test timed out")));
      outgoing.once("error", reject);
      outgoing.end(JSON.stringify(body));
    },
  );
}

beforeEach(() => {
  rows = [
    { id: "pending", user_id: "owner", status: "pending", amount: 500 },
    { id: "overdue", user_id: "owner", status: "overdue", amount: 500 },
    {
      id: "paid",
      user_id: "owner",
      status: "received",
      amount: 500,
      received_date: "2026-08-01",
      payment_method: "cash",
      notes: "Original",
    },
    { id: "cancelled", user_id: "owner", status: "cancelled", amount: 500 },
    { id: "other", user_id: "other-user", status: "pending", amount: 500 },
    { id: "unselected", user_id: "owner", status: "pending", amount: 500 },
  ];
  databaseFails = false;
  appliedFilters.length = 0;
  from.mockClear();
  update.mockClear();
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
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

describe("POST /api/receivables/mark-paid", () => {
  it("requires a session before accessing data", async () => {
    expect((await markPaid({ ids: ["pending"] }, false)).status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { ids: [] },
    { ids: [12] },
    { ids: ["pending"], received_date: "invalid" },
    { ids: Array(1001).fill("pending") },
  ])("validates the batch before updating", async (body) => {
    expect((await markPaid(body)).status).toBe(422);
    expect(from).not.toHaveBeenCalled();
  });

  it("updates only selected open records owned by the user in one query", async () => {
    const original = JSON.parse(JSON.stringify(rows)) as Row[];
    const result = await markPaid({
      ids: ["pending", "pending", "overdue", "paid", "cancelled", "other"],
      received_date: "2026-09-14",
      payment_method: "pix",
      notes: "Invoice received",
    });
    expect(result.status).toBe(200);
    expect(result.body.data?.map((row) => row.id)).toEqual(["pending", "overdue"]);
    expect(from).toHaveBeenCalledExactlyOnceWith("receivables");
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      received_date: "2026-09-14",
      payment_method: "pix",
      notes: "Invoice received",
      status: "received",
    });
    expect(appliedFilters).toContainEqual(["user_id", "owner"]);
    expect(appliedFilters).toContainEqual([
      "id",
      ["pending", "overdue", "paid", "cancelled", "other"],
    ]);
    expect(appliedFilters).toContainEqual(["status", ["pending", "overdue"]]);
    for (const id of ["paid", "cancelled", "other", "unselected"])
      expect(rows.find((row) => row.id === id)).toEqual(original.find((row) => row.id === id));
  });

  it("does not overwrite payment details when the request is repeated", async () => {
    await markPaid({ ids: ["pending"], received_date: "2026-09-14", payment_method: "pix" });
    const result = await markPaid({
      ids: ["pending"],
      received_date: "2026-10-01",
      payment_method: "cash",
    });
    expect(result.status).toBe(200);
    expect(result.body.data).toEqual([]);
    expect(rows.find((row) => row.id === "pending")).toMatchObject({
      received_date: "2026-09-14",
      payment_method: "pix",
    });
  });

  it("reports database failure without returning a successful payment", async () => {
    databaseFails = true;
    const original = JSON.stringify(rows);
    const result = await markPaid({ ids: ["pending", "overdue"] });
    expect(result.status).toBe(400);
    expect(result.body.error?.code).toBe("42501");
    expect(JSON.stringify(rows)).toBe(original);
  });
});
