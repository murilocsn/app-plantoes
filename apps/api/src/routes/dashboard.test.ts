import { once } from "node:events";
import { request } from "node:http";
import type { Server } from "node:http";
import type { AppBootstrap } from "@financplantoes/shared";
import { AggregationTemporality, InMemoryMetricExporter } from "@opentelemetry/sdk-metrics";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import { HTTP_ATTRIBUTE_KEYS } from "../observability/http-attributes";
import { readTelemetryConfig } from "../observability/config";
import { createHttpTelemetry, REQUEST_COUNT } from "../observability/metrics";
import type { HttpTelemetry } from "../observability/metrics";

vi.mock("../config/env", () => ({
  env: { NODE_ENV: "production", WEB_ORIGIN: "http://localhost:5173" },
}));
const { getUser, createSupabaseForToken } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createSupabaseForToken: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
  authSupabase: { auth: { getUser } },
  createSupabaseForToken,
}));

type QueryResult = {
  data: unknown;
  error: { code: string; message: string; details: string } | null;
};
const userId = "synthetic-user";
const token = "synthetic-token";
const tables = [
  "shifts",
  "locations",
  "receivables",
  "personal_expenses",
  "space_members",
  "expenses",
];
let rows: Record<string, unknown[]>;
let databaseError: { table: string; code: string } | undefined;
let rejectedTable: string | undefined;
let server: Server | undefined;
let telemetry: HttpTelemetry | undefined;
const filters = new Map<string, Array<[string, unknown]>>();
const from = vi.fn((table: string) => {
  const appliedFilters: Array<[string, unknown]> = [];
  filters.set(table, appliedFilters);
  const result = (): Promise<QueryResult> => {
    if (table === rejectedTable) return Promise.reject(new Error("synthetic-unavailable-database"));
    return Promise.resolve({
      data: rows[table] ?? [],
      error:
        databaseError?.table === table
          ? { code: databaseError.code, message: "Synthetic database failure", details: "" }
          : null,
    });
  };
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      appliedFilters.push([column, value]);
      return query;
    }),
    then: (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) =>
      result().then(resolve, reject),
  };
  return query;
});

async function bootstrap(accessToken?: string) {
  server = createApp(telemetry).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test server port.");
  return new Promise<{
    status: number;
    body: { data?: AppBootstrap; error?: { code: string; message: string; details?: unknown } };
  }>((resolve, reject) => {
    const outgoing = request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path: "/api/dashboard/bootstrap",
        agent: false,
        headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolve({ status: response.statusCode!, body: JSON.parse(body) }));
      },
    );
    outgoing.setTimeout(1500, () => outgoing.destroy(new Error("Bootstrap request timed out.")));
    outgoing.once("error", reject);
    outgoing.end();
  });
}

beforeEach(() => {
  rows = {};
  databaseError = undefined;
  rejectedTable = undefined;
  filters.clear();
  from.mockClear();
  getUser.mockReset().mockResolvedValue({ data: { user: { id: userId } }, error: null });
  createSupabaseForToken.mockReset().mockReturnValue({ from });
  // These are isolated route tests; never query a real database or auth service.
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected external request."));
});

afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
  }
  await telemetry?.shutdown();
  telemetry = undefined;
  vi.restoreAllMocks();
});

describe("GET /api/dashboard/bootstrap", () => {
  it("requires a session before touching user data", async () => {
    const response = await bootstrap();
    expect(response.status).toBe(401);
    expect(response.body.error?.code).toBe("AUTH_REQUIRED");
    expect(getUser).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects an expired or invalid session without querying tables", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "Expired session" } });
    const response = await bootstrap(token);
    expect(response.status).toBe(401);
    expect(response.body.error?.code).toBe("AUTH_INVALID");
    expect(createSupabaseForToken).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("returns the bootstrap and records one safe HTTP measurement", async () => {
    const month = new Date().toISOString().slice(0, 7);
    rows = {
      shifts: [{ id: "synthetic-shift", date: `${month}-15`, duration: 6, value: 100 }],
      locations: [{ id: "synthetic-location", active: true }],
      receivables: [
        {
          id: "synthetic-receivable",
          expected_date: `${month}-15`,
          amount: 100,
          status: "received",
        },
      ],
      personal_expenses: [{ id: "synthetic-expense", expense_date: `${month}-15`, amount: 20 }],
      space_members: [{ role: "member", spaces: { id: "synthetic-space", archived: false } }],
      expenses: [],
    };
    const exporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
    telemetry = createHttpTelemetry(
      readTelemetryConfig({
        OTEL_SDK_DISABLED: "false",
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://127.0.0.1:4318",
        NODE_ENV: "test",
      }),
      exporter,
    );
    const response = await bootstrap(token);
    expect(response.status).toBe(200);
    expect(response.body.data?.summary).toMatchObject({
      shiftCount: 1,
      shiftHours: 6,
      incomeProjected: 100,
      received: 100,
      expenses: 20,
      net: 80,
    });
    expect(response.body.data?.spaces).toEqual([
      { id: "synthetic-space", archived: false, role: "member" },
    ]);
    expect(getUser).toHaveBeenCalledWith(token);
    expect(createSupabaseForToken).toHaveBeenCalledWith(token);
    expect([...filters.keys()].sort()).toEqual([...tables].sort());
    for (const table of tables) {
      expect(filters.get(table)).toContainEqual([
        table === "expenses" ? "paid_by" : "user_id",
        userId,
      ]);
    }
    expect(filters.get("space_members")).toContainEqual(["status", "active"]);
    await telemetry.forceFlush();
    const exported = exporter.getMetrics();
    const metrics = exported.flatMap((resource) =>
      resource.scopeMetrics.flatMap((scope) => scope.metrics),
    );
    const counter = metrics.find((metric) => metric.descriptor.name === REQUEST_COUNT)!;
    expect(counter.dataPoints).toHaveLength(1);
    expect(counter.dataPoints[0]).toMatchObject({
      value: 1,
      attributes: { "http.route": "/api/dashboard/bootstrap", "http.response.status_code": 200 },
    });
    expect(
      Object.keys(counter.dataPoints[0]!.attributes).every((key) =>
        HTTP_ATTRIBUTE_KEYS.includes(key),
      ),
    ).toBe(true);
    expect(JSON.stringify(exported)).not.toContain("synthetic-");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("works with disabled telemetry and genuinely empty query results", async () => {
    const response = await bootstrap(token);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      shifts: [],
      locations: [],
      receivables: [],
      spaces: [],
    });
    expect(response.body.data?.summary.shiftCount).toBe(0);
  });

  it("propagates a database session error as 401 instead of an empty success", async () => {
    databaseError = { table: "shifts", code: "PGRST301" };
    const response = await bootstrap(token);
    expect(response.status).toBe(401);
    expect(response.body.error?.code).toBe("PGRST301");
    expect(response.body.data).toBeUndefined();
  });

  it("does not hide an RLS recursion error behind a successful empty response", async () => {
    databaseError = { table: "space_members", code: "42P17" };
    const response = await bootstrap(token);
    expect(response.status).toBe(400); // Preserve the existing PostgREST error mapping.
    expect(response.body.error?.code).toBe("42P17");
    expect(response.body.data).toBeUndefined();
  });

  it("handles an unexpected query rejection without leaking internal details", async () => {
    rejectedTable = "receivables";
    const response = await bootstrap(token);
    expect(response).toEqual({
      status: 500,
      body: {
        error: {
          code: "INTERNAL_ERROR",
          message: "Erro interno ao processar a requisicao.",
        },
      },
    });
  });
});
