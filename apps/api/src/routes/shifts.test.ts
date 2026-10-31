import { once } from "node:events";
import { request, type Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";

vi.mock("../config/env", () => ({
  env: { NODE_ENV: "production", WEB_ORIGIN: "http://localhost:5173" },
}));
const { getUser, createSupabaseForToken } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createSupabaseForToken: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({ authSupabase: { auth: { getUser } }, createSupabaseForToken }));

type Row = Record<string, unknown>;
type Query = { table: string; operation: string; filters: Array<[string, unknown]>; payload?: Row | Row[] };
let database: { locations: Row[]; shifts: Row[]; receivables: Row[]; recurrences: Row[] };
let queries: Query[];
let server: Server;

// Executa as consultas em memória com filtros reais, sem acessar contas ou dados remotos.
function from(table: keyof typeof database) {
  const operation: Query = { table, operation: "select", filters: [] };
  const predicates: Array<(row: Row) => boolean> = [];
  let single = false;
  const query = {
    select: () => query,
    insert: (payload: Row | Row[]) => { operation.operation = "insert"; operation.payload = payload; return query; },
    update: (payload: Row) => { operation.operation = "update"; operation.payload = payload; return query; },
    eq: (column: string, value: unknown) => {
      operation.filters.push([column, value]);
      predicates.push((row) => row[column] === value);
      return query;
    },
    gte: (column: string, value: string) => { predicates.push((row) => String(row[column]) >= value); return query; },
    lte: (column: string, value: string) => { predicates.push((row) => String(row[column]) <= value); return query; },
    in: (column: string, values: unknown[]) => {
      operation.filters.push([column, values]);
      predicates.push((row) => values.includes(row[column]));
      return query;
    },
    single: () => { single = true; return query; },
    then: (resolve: (result: unknown) => unknown, reject: (reason: unknown) => unknown) => {
      queries.push(operation);
      const rows = database[table];
      let selected = rows.filter((row) => predicates.every((predicate) => predicate(row)));
      if (operation.operation === "insert") {
        selected = (Array.isArray(operation.payload) ? operation.payload : [operation.payload!]).map((row) => ({ ...row }));
        rows.push(...selected);
      } else if (operation.operation === "update") {
        const values = Object.fromEntries(Object.entries(operation.payload!).filter(([, value]) => value !== undefined));
        for (const row of selected) Object.assign(row, values);
      }
      return Promise.resolve(single && selected.length !== 1
        ? { data: null, error: { code: "PGRST116", message: "Registro não encontrado", details: "" } }
        : { data: single ? { ...selected[0] } : selected.map((row) => ({ ...row })), error: null }).then(resolve, reject);
    },
  };
  return query;
}

const shiftInput = { date: "2026-10-30", start_time: "07:00", location_id: "unit", duration: 12, value: 1000 };
const originalShift = { ...shiftInput, id: "shift", user_id: "owner", location_name: "Unidade de teste" };

async function send(method: string, body: unknown, authenticated = true) {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta de teste indisponível");
  return new Promise<{ status: number; body: { error?: { code: string }; data?: unknown } }>((resolve, reject) => {
    const outgoing = request({
      hostname: "127.0.0.1", port: address.port, path: method === "POST" ? "/api/shifts" : "/api/shifts/shift",
      method, agent: false,
      headers: { "content-type": "application/json", ...(authenticated ? { authorization: "Bearer synthetic-token" } : {}) },
    }, (response) => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { text += chunk; });
      response.on("end", () => resolve({ status: response.statusCode!, body: JSON.parse(text) }));
    });
    outgoing.setTimeout(3000, () => outgoing.destroy(new Error("Tempo limite do teste")));
    outgoing.once("error", reject);
    outgoing.end(JSON.stringify(body));
  });
}

function seedReceipt(expectedDate: string, status = "pending", userId = "owner") {
  database.shifts = [{ ...originalShift }];
  const receipt = {
    id: `receipt-${userId}-${status}`, user_id: userId, shift_id: "shift", location_id: "unit",
    description: "Plantão original", amount: 1000, expected_date: expectedDate, status,
  };
  database.receivables.push(receipt);
  return receipt;
}

beforeAll(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  queries = [];
  database = {
    locations: [
      { id: "unit", user_id: "owner", name: "Unidade de teste", value12: 1000, active: true, reference_start_day: 1, reference_end_day: 31, payment_due_day: 10, payment_due_months_after: 1 },
      { id: "second-unit", user_id: "owner", name: "Segunda unidade", value12: 1500, active: true, reference_start_day: 1, reference_end_day: 31, payment_due_day: 25, payment_due_months_after: 2 },
      { id: "other-unit", user_id: "other-user", name: "Unidade de outra pessoa", active: true },
    ],
    shifts: [], receivables: [], recurrences: [],
  };
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  createSupabaseForToken.mockReset().mockReturnValue({ from });
});

describe("Previsão de pagamento no cadastro de plantão", () => {
  it("exige autenticação antes de consultar ou gravar dados", async () => {
    expect((await send("POST", { shift: shiftInput }, false)).status).toBe(401);
    expect(queries).toEqual([]);
  });

  it.each(["2026-02-30", "30/11/2026", null, 20261130])("rejeita previsão inválida antes de gravar: %s", async (expected_payment_date) => {
    expect((await send("POST", { shift: { ...shiftInput, expected_payment_date } })).status).toBe(422);
    expect(queries).toEqual([]);
  });

  it.each([undefined, ""])("herda a regra da unidade quando a previsão é %s", async (expected_payment_date) => {
    expect((await send("POST", { shift: { ...shiftInput, expected_payment_date } })).status).toBe(201);
    expect(database.receivables).toEqual([expect.objectContaining({ expected_date: "2026-11-10", amount: 1000, user_id: "owner" })]);
    expect(database.shifts[0]).not.toHaveProperty("expected_payment_date");
  });

  it("grava a data escolhida somente no recebível do usuário autenticado", async () => {
    const unitsBefore = structuredClone(database.locations);
    expect((await send("POST", { shift: { ...shiftInput, expected_payment_date: "2026-12-20", user_id: "other-user" } })).status).toBe(201);
    expect(database.receivables[0]).toMatchObject({ expected_date: "2026-12-20", amount: 1000, user_id: "owner", shift_id: database.shifts[0]!.id });
    expect(database.locations).toEqual(unitsBefore);
  });

  it("calcula a previsão de cada repetição quando segue o local", async () => {
    expect((await send("POST", { shift: { ...shiftInput, date: "2026-10-25" }, recurrence: { frequency: "weekly", occurrences: 3 } })).status).toBe(201);
    expect(database.receivables.map((row) => row.expected_date)).toEqual(["2026-11-10", "2026-12-10", "2026-12-10"]);
  });

  it("aplica a data personalizada a todas as repetições do envio", async () => {
    expect((await send("POST", { shift: { ...shiftInput, expected_payment_date: "2026-12-20" }, recurrence: { frequency: "weekly", occurrences: 3 } })).status).toBe(201);
    expect(database.receivables.map((row) => row.expected_date)).toEqual(Array(3).fill("2026-12-20"));
  });

  it("não cria recebíveis quando a geração automática está desmarcada", async () => {
    expect((await send("POST", { shift: { ...shiftInput, createReceivable: false, expected_payment_date: "2026-12-20" } })).status).toBe(201);
    expect(database.shifts).toHaveLength(1);
    expect(database.receivables).toEqual([]);
  });

  it("não permite criar plantão em unidade de outra conta", async () => {
    expect((await send("POST", { shift: { ...shiftInput, location_id: "other-unit", expected_payment_date: "2026-12-20" } })).status).toBe(404);
    expect(database.shifts).toEqual([]);
    expect(database.receivables).toEqual([]);
    expect(queries[0]?.filters).toContainEqual(["user_id", "owner"]);
  });

  it("mantém o bloqueio de conflito de horário antes de criar o recebível", async () => {
    database.shifts = [{ ...originalShift }];
    const result = await send("POST", { shift: { ...shiftInput, expected_payment_date: "2026-12-20" } });
    expect(result.status).toBe(409);
    expect(result.body.error?.code).toBe("SHIFT_TIME_CONFLICT");
    expect(database.receivables).toEqual([]);
  });
});

describe("Preservação da previsão ao editar o plantão", () => {
  it.each(["2026-11-10", "2026-12-20"])("não recalcula a data %s ao salvar o mesmo local e dia", async (expectedDate) => {
    const receipt = seedReceipt(expectedDate);
    expect((await send("PATCH", { ...shiftInput, value: 1200, notes: "Valor atualizado" })).status).toBe(200);
    expect(receipt).toMatchObject({ expected_date: expectedDate, amount: 1200 });
  });

  it("recalcula a previsão herdada ao mudar a data do plantão", async () => {
    const receipt = seedReceipt("2026-11-10");
    expect((await send("PATCH", { date: "2026-11-30" })).status).toBe(200);
    expect(receipt.expected_date).toBe("2026-12-10");
  });

  it("preserva a previsão personalizada ao mudar a data do plantão", async () => {
    const receipt = seedReceipt("2026-12-20");
    expect((await send("PATCH", { date: "2026-11-30" })).status).toBe(200);
    expect(receipt.expected_date).toBe("2026-12-20");
  });

  it("recalcula apenas a previsão herdada ao trocar de unidade", async () => {
    const inherited = seedReceipt("2026-11-10");
    const customized = seedReceipt("2026-12-20");
    database.locations[0]!.active = false;
    expect((await send("PATCH", { location_id: "second-unit" })).status).toBe(200);
    expect(inherited).toMatchObject({ expected_date: "2026-12-25", location_id: "second-unit" });
    expect(customized).toMatchObject({ expected_date: "2026-12-20", location_id: "second-unit" });
  });

  it("preserva recebidos, cancelados e dados de outra conta", async () => {
    const receipts = [seedReceipt("2026-11-10", "received"), seedReceipt("2026-11-10", "cancelled"), seedReceipt("2026-11-10", "pending", "other-user")];
    const before = structuredClone(receipts);
    expect((await send("PATCH", { location_id: "second-unit", date: "2026-11-30", value: 1500 })).status).toBe(200);
    expect(receipts).toEqual(before);
    for (const query of queries.filter((item) => item.table === "receivables")) {
      expect(query.filters).toContainEqual(["user_id", "owner"]);
      expect(query.filters).toContainEqual(["shift_id", "shift"]);
    }
  });
});
