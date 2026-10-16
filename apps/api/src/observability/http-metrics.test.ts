import { createServer, request as httpRequest } from "node:http";
import type { Server, RequestListener } from "node:http";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import express from "express";
import type { ErrorRequestHandler, Request, Response } from "express";
import morgan from "morgan";
import {
  AggregationTemporality,
  DataPointType,
  InMemoryMetricExporter,
} from "@opentelemetry/sdk-metrics";
import type { MetricData, PushMetricExporter } from "@opentelemetry/sdk-metrics";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readTelemetryConfig } from "./config";
import { HTTP_ATTRIBUTE_KEYS, safeAccessLog, trackRoutePrefix } from "./http-attributes";
import { httpMetricsMiddleware } from "./http-middleware";
import {
  createHttpTelemetry,
  initializeHttpTelemetry,
  REQUEST_COUNT,
  REQUEST_DURATION,
} from "./metrics";
import type { HttpTelemetry } from "./metrics";

vi.mock("../config/env", () => ({
  env: { NODE_ENV: "test", API_PORT: 3333, WEB_ORIGIN: "http://localhost:5173" },
}));
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("../lib/supabase", () => ({
  authSupabase: { auth: { getUser } },
  createSupabaseForToken: vi.fn(),
}));

const servers: Server[] = [];
const runtimes: HttpTelemetry[] = [];

async function serve(listener: RequestListener) {
  const server = createServer(listener);
  servers.push(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server has no port.");
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

async function send(
  origin: string,
  path: string,
  method = "GET",
  body?: string,
  headers: Record<string, string> = {},
) {
  return new Promise<number>((resolve, reject) => {
    const request = httpRequest(
      `${origin}${path}`,
      { method, headers, agent: false },
      (response) => {
        response.resume();
        response.once("end", () => resolve(response.statusCode!));
      },
    );
    request.once("error", reject);
    request.end(body);
  });
}

function runtime(exporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE)) {
  const telemetry = createHttpTelemetry(
    readTelemetryConfig({
      OTEL_SDK_DISABLED: "false",
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://127.0.0.1:4318",
      NODE_ENV: "test",
    }),
    exporter,
  );
  runtimes.push(telemetry);
  return { telemetry, exporter };
}

function metrics(exporter: InMemoryMetricExporter): MetricData[] {
  return exporter
    .getMetrics()
    .at(-1)!
    .scopeMetrics.flatMap((scope) => scope.metrics);
}

function count(exporter: InMemoryMetricExporter) {
  const metric = metrics(exporter).find((item) => item.descriptor.name === REQUEST_COUNT)!;
  if (metric.dataPointType !== DataPointType.SUM) throw new Error("Expected counter.");
  return metric.dataPoints;
}

function fixture(telemetry: HttpTelemetry) {
  const logs: string[] = [];
  const app = express();
  app.use(httpMetricsMiddleware(telemetry));
  app.use(
    morgan<Request, Response>(safeAccessLog, { stream: { write: (line) => logs.push(line) } }),
  );
  app.use(express.json());
  const router = express.Router();
  router.patch("/:id", (_request, response) =>
    response.status(200).json({ result: "PRIVATE_RESPONSE" }),
  );
  router.post("/", (_request, response) => response.sendStatus(422));
  router.get("/:id", (_request, _response, next) => next(new Error("PRIVATE_ERROR")));
  app.use("/api/shifts", trackRoutePrefix("/api/shifts"), router);
  app.get("/not-approved/:privateId", (_request, response) => response.sendStatus(200));
  app.use(((_error, _request, response, _next) => response.sendStatus(500)) as ErrorRequestHandler);
  return { app, logs };
}

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((telemetry) => telemetry.shutdown()));
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  getUser.mockClear();
});

describe("HTTP metrics and privacy", () => {
  it("measures a controlled HTTP delay in seconds rather than milliseconds", async () => {
    const { telemetry, exporter } = runtime();
    const app = express();
    app.use(httpMetricsMiddleware(telemetry));
    app.get("/health", async (_request, response) => {
      await delay(30);
      response.sendStatus(200);
    });
    const { origin } = await serve(app);
    await send(origin, "/health");
    await telemetry.forceFlush();
    const metric = metrics(exporter).find((item) => item.descriptor.name === REQUEST_DURATION)!;
    if (metric.dataPointType !== DataPointType.HISTOGRAM) throw new Error("Expected histogram.");
    expect(metric.dataPoints[0]!.value.sum).toBeGreaterThanOrEqual(0.02);
    expect(metric.dataPoints[0]!.value.sum).toBeLessThan(5);
  });

  it("counts each request once, including errors, and records duration in seconds", async () => {
    const { telemetry, exporter } = runtime();
    const { app } = fixture(telemetry);
    const { origin } = await serve(app);
    expect(await send(origin, "/api/shifts/PRIVATE_ID_A", "PATCH")).toBe(200);
    expect(await send(origin, "/api/shifts/PRIVATE_ID_B", "PATCH")).toBe(200);
    expect(await send(origin, "/api/shifts", "POST")).toBe(422);
    expect(await send(origin, "/api/shifts/PRIVATE_ID_C")).toBe(500);
    expect(await send(origin, "/PRIVATE_UNKNOWN")).toBe(404);
    await telemetry.forceFlush();

    const points = count(exporter);
    expect(points.reduce((sum, point) => sum + point.value, 0)).toBe(5);
    expect(
      points.find((point) => point.attributes["http.response.status_code"] === 200),
    ).toMatchObject({ value: 2, attributes: { "http.route": "/api/shifts/:id" } });
    expect(
      points.find((point) => point.attributes["http.response.status_code"] === 500)?.attributes[
        "http.route"
      ],
    ).toBe("/api/shifts/:id");
    expect(
      points.find((point) => point.attributes["http.response.status_code"] === 404)?.attributes[
        "http.route"
      ],
    ).toBe("unmatched");
    const duration = metrics(exporter).find(
      (metric) => metric.descriptor.name === REQUEST_DURATION,
    )!;
    expect(duration.descriptor.unit).toBe("s");
    if (duration.dataPointType !== DataPointType.HISTOGRAM) throw new Error("Expected histogram.");
    expect(duration.dataPoints.reduce((sum, point) => sum + point.value.count, 0)).toBe(5);
    expect(duration.dataPoints.every((point) => point.value.sum! > 0)).toBe(true);
    expect(
      metrics(exporter)
        .map((metric) => metric.descriptor.name)
        .sort(),
    ).toEqual([REQUEST_COUNT, REQUEST_DURATION].sort());
  });

  it("excludes sensitive values from resources, datapoints and local access logs", async () => {
    vi.stubEnv("OTEL_RESOURCE_ATTRIBUTES", "user.id=PRIVATE_RESOURCE");
    const { telemetry, exporter } = runtime();
    const { app, logs } = fixture(telemetry);
    const { origin } = await serve(app);
    await send(
      origin,
      "/api/shifts/PRIVATE_ID?patient=PRIVATE_QUERY",
      "PATCH",
      JSON.stringify({ medical: "PRIVATE_BODY", finance: "PRIVATE_FINANCE" }),
      {
        "content-type": "application/json",
        authorization: "Bearer PRIVATE_TOKEN",
        cookie: "session=PRIVATE_COOKIE",
        "x-forwarded-for": "192.0.2.19",
        "user-agent": "PRIVATE_AGENT",
        referer: "https://example.invalid/PRIVATE_REFERER",
        baggage: "patient=PRIVATE_BAGGAGE",
        traceparent: "00-01234567890123456789012345678901-0123456789012345-01",
      },
    );
    await send(origin, "/not-approved/PRIVATE_ID");
    await send(origin, "/api/shifts/PRIVATE_ID");
    await telemetry.forceFlush();

    const snapshot = exporter.getMetrics().at(-1)!;
    expect(snapshot.resource.attributes).toEqual({
      "service.name": "financplantoes-api",
      "deployment.environment.name": "test",
    });
    expect(JSON.stringify(snapshot)).not.toMatch(
      /PRIVATE_|192\.0\.2\.19|0123456789012345|127\.0\.0\.1/,
    );
    expect(logs.join("")).not.toMatch(/PRIVATE_|192\.0\.2\.19|0123456789012345|127\.0\.0\.1/);
    for (const metric of metrics(exporter)) {
      for (const point of metric.dataPoints)
        expect(
          Object.keys(point.attributes).every((key) => HTTP_ATTRIBUTE_KEYS.includes(key)),
        ).toBe(true);
    }
    expect(count(exporter).some((point) => point.attributes["http.route"] === "unmatched")).toBe(
      true,
    );
  });

  it("observes JSON parser failures without collecting the invalid body", async () => {
    const { telemetry, exporter } = runtime();
    const { app, logs } = fixture(telemetry);
    const { origin } = await serve(app);
    expect(
      await send(origin, "/api/shifts?patient=PRIVATE_QUERY", "POST", "PRIVATE_INVALID_JSON", {
        "content-type": "application/json",
      }),
    ).toBe(500);
    await telemetry.forceFlush();
    expect(count(exporter)).toMatchObject([
      { value: 1, attributes: { "http.route": "unmatched", "http.response.status_code": 500 } },
    ]);
    expect(JSON.stringify(exporter.getMetrics()) + logs.join("")).not.toContain("PRIVATE_");
  });

  it("counts an aborted response once and never invents a response status", async () => {
    const { telemetry, exporter } = runtime();
    const app = express();
    app.use(httpMetricsMiddleware(telemetry));
    let accepted!: () => void;
    const entered = new Promise<void>((resolve) => {
      accepted = resolve;
    });
    let closed!: () => void;
    const disconnected = new Promise<void>((resolve) => {
      closed = resolve;
    });
    app.get("/health", (_request, response) => {
      response.once("close", closed);
      accepted();
    });
    const { origin } = await serve(app);
    const request = httpRequest(`${origin}/health`);
    request.on("error", () => undefined);
    request.end();
    await entered;
    request.destroy();
    await disconnected;
    await telemetry.forceFlush();
    expect(count(exporter)).toMatchObject([
      { value: 1, attributes: { "http.route": "/health", "error.type": "client_aborted" } },
    ]);
    expect(count(exporter)[0]!.attributes).not.toHaveProperty("http.response.status_code");
  });

  it("keeps real public routes and authentication unchanged, including disabled telemetry", async () => {
    const { createApp } = await import("../app");
    const { telemetry, exporter } = runtime();
    const enabledServer = await serve(createApp(telemetry));
    expect(await send(enabledServer.origin, "/health")).toBe(200);
    expect(await send(enabledServer.origin, "/api/dashboard/overview")).toBe(401);
    await telemetry.forceFlush();
    expect(
      count(exporter).find((point) => point.attributes["http.response.status_code"] === 401)
        ?.attributes["http.route"],
    ).toBe("unmatched");
    const unusedExporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
    const exportSpy = vi.spyOn(unusedExporter, "export");
    const disabled = createHttpTelemetry({ enabled: false }, unusedExporter);
    runtimes.push(disabled);
    const disabledServer = await serve(createApp(disabled));
    expect(await send(disabledServer.origin, "/health")).toBe(200);
    expect(await send(disabledServer.origin, "/api/dashboard/overview")).toBe(401);
    await disabled.forceFlush();
    expect(exportSpy).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("normalizes unknown methods, routes and extra input fields at the recording boundary", async () => {
    const { telemetry, exporter } = runtime();
    telemetry.record({
      method: "PRIVATE_METHOD",
      route: "/PRIVATE_ROUTE",
      status: 999,
      durationSeconds: 0.25,
      ...{ token: "PRIVATE_TOKEN" },
    });
    await telemetry.forceFlush();
    expect(count(exporter)[0]).toMatchObject({
      value: 1,
      attributes: { "http.request.method": "_OTHER", "http.route": "unmatched" },
    });
    expect(JSON.stringify(exporter.getMetrics())).not.toContain("PRIVATE_");
  });

  it("initializes once without installing a global provider", async () => {
    vi.stubEnv("OTEL_SDK_DISABLED", "true");
    const first = initializeHttpTelemetry();
    expect(initializeHttpTelemetry()).toBe(first);
    expect(first.enabled).toBe(false);
  });
});

describe("OTLP export isolation", () => {
  it("sends protobuf metrics to the configured path without HTTP request data", async () => {
    const payloads: Buffer[] = [];
    const contentTypes: Array<string | undefined> = [];
    const paths: Array<string | undefined> = [];
    const collector = await serve(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      payloads.push(Buffer.concat(chunks));
      contentTypes.push(request.headers["content-type"]);
      paths.push(request.url);
      response.end();
    });
    const telemetry = createHttpTelemetry(
      readTelemetryConfig({
        OTEL_SDK_DISABLED: "false",
        OTEL_EXPORTER_OTLP_ENDPOINT: `${collector.origin}/otlp`,
        NODE_ENV: "test",
      }),
    );
    runtimes.push(telemetry);
    const { app } = fixture(telemetry);
    const { origin } = await serve(app);
    await send(origin, "/api/shifts/PRIVATE_ID?patient=PRIVATE_QUERY", "PATCH");
    await telemetry.forceFlush();
    expect(payloads).toHaveLength(1);
    expect(paths).toEqual(["/otlp/v1/metrics"]);
    expect(contentTypes).toEqual(["application/x-protobuf"]);
    expect(payloads[0]!.includes(Buffer.from(REQUEST_DURATION))).toBe(true);
    expect(payloads[0]!.includes(Buffer.from("/api/shifts/:id"))).toBe(true);
    expect(payloads[0]!.includes(Buffer.from("PRIVATE_"))).toBe(false);
  });

  it("survives a rejected export and continues serving requests", async () => {
    let attempts = 0;
    const collector = await serve((request, response) => {
      attempts++;
      request.resume();
      response.writeHead(401).end();
    });
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const telemetry = createHttpTelemetry(
      readTelemetryConfig({
        OTEL_SDK_DISABLED: "false",
        OTEL_EXPORTER_OTLP_ENDPOINT: collector.origin,
        OTEL_EXPORTER_OTLP_TIMEOUT: "200",
      }),
    );
    runtimes.push(telemetry);
    const { app } = fixture(telemetry);
    const { origin } = await serve(app);
    expect(await send(origin, "/api/shifts/PRIVATE_ID", "PATCH")).toBe(200);
    await expect(telemetry.forceFlush()).resolves.toBeUndefined();
    expect(attempts).toBe(1);
    expect(await send(origin, "/api/shifts/PRIVATE_ID", "PATCH")).toBe(200);
    expect(warning.mock.calls.flat().join("")).not.toMatch(/PRIVATE_|127\.0\.0\.1|401/);
    expect(warning).toHaveBeenCalledWith(
      "HTTP metrics export failed; HTTP requests remain available.",
    );
  });

  it("contains exporter exceptions and shutdown failures without exposing their content", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const exporter: PushMetricExporter = {
      export() {
        throw new Error("PRIVATE_EXPORT_ERROR");
      },
      async forceFlush() {
        throw new Error("PRIVATE_FLUSH_ERROR");
      },
      async shutdown() {
        throw new Error("PRIVATE_SHUTDOWN_ERROR");
      },
    };
    const telemetry = createHttpTelemetry(
      readTelemetryConfig({
        OTEL_SDK_DISABLED: "false",
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
      }),
      exporter,
    );
    telemetry.record({ method: "GET", route: "/health", status: 200, durationSeconds: 0.1 });
    await expect(telemetry.forceFlush()).resolves.toBeUndefined();
    const shutdown = telemetry.shutdown();
    expect(telemetry.shutdown()).toBe(shutdown);
    await expect(shutdown).resolves.toBeUndefined();
    expect(warning.mock.calls.flat().join("")).not.toContain("PRIVATE_");
  });

  it("serves requests while an exporter is stalled, then bounds the export timeout", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let received!: () => void;
    const arrived = new Promise<void>((resolve) => {
      received = resolve;
    });
    const collector = await serve((request) => {
      request.resume();
      received();
    });
    const telemetry = createHttpTelemetry(
      readTelemetryConfig({
        OTEL_SDK_DISABLED: "false",
        OTEL_EXPORTER_OTLP_ENDPOINT: collector.origin,
        OTEL_EXPORTER_OTLP_TIMEOUT: "200",
      }),
    );
    runtimes.push(telemetry);
    const { app } = fixture(telemetry);
    const { origin } = await serve(app);
    await send(origin, "/api/shifts/PRIVATE_ID", "PATCH");
    const flushing = telemetry.forceFlush();
    await arrived;
    expect(await send(origin, "/api/shifts/PRIVATE_ID", "PATCH")).toBe(200);
    await expect(flushing).resolves.toBeUndefined();
  });

  it("disables invalid runtime configuration with a fixed diagnostic and keeps HTTP available", async () => {
    vi.resetModules();
    vi.stubEnv("OTEL_SDK_DISABLED", "false");
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "PRIVATE_INVALID_ENDPOINT");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { initializeHttpTelemetry: initialize } = await import("./metrics");
    const telemetry = initialize();
    expect(initialize()).toBe(telemetry);
    expect(telemetry.enabled).toBe(false);
    const { app } = fixture(telemetry);
    const { origin } = await serve(app);
    expect(await send(origin, "/api/shifts/PRIVATE_ID", "PATCH")).toBe(200);
    expect(warning.mock.calls).toEqual([
      ["HTTP metrics disabled: invalid observability configuration."],
    ]);
  });
});
