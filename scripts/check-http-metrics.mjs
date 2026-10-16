import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// Exercise source and compiled ESM with synthetic configuration only. No .env or cloud calls.
const root = fileURLToPath(new URL("../", import.meta.url));
const apiDirectory = resolve(root, "apps/api");
const payloads = [];
const collector = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  payloads.push({
    path: request.url,
    contentType: request.headers["content-type"],
    body: Buffer.concat(chunks),
  });
  response.end();
});
collector.listen(0, "127.0.0.1");
await once(collector, "listening");
const collectorPort = collector.address().port;

async function availablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((done) => server.close(done));
  return port;
}

async function check(mode, enabled) {
  const port = await availablePort();
  const env = {};
  for (const key of ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP", "ComSpec", "PATHEXT"]) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  Object.assign(env, {
    NODE_ENV: "test",
    DOTENV_CONFIG_PATH: resolve(root, "node_modules/.cache/observability-no-env-file"),
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "synthetic-test-publishable-key",
    WEB_ORIGIN: "http://localhost:5173",
    PORT: String(port),
    OTEL_SDK_DISABLED: String(!enabled),
    OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_ENDPOINT: `http://127.0.0.1:${collectorPort}`,
    OTEL_EXPORTER_OTLP_HEADERS: "",
    OTEL_RESOURCE_ATTRIBUTES: "user.id=PRIVATE_RESOURCE",
    OTEL_METRIC_EXPORT_INTERVAL: "1000",
    OTEL_EXPORTER_OTLP_TIMEOUT: "300",
  });
  const args = mode === "tsx" ? ["--import", "tsx", "src/server.ts"] : ["dist/server.js"];
  const child = spawn(process.execPath, args, {
    cwd: apiDirectory,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const exited = once(child, "exit");
  let output = "";
  let ready;
  const started = new Promise((done) => {
    ready = done;
  });
  const capture = (chunk) => {
    output += chunk.toString();
    if (output.includes("FinancPlantoes API listening")) ready();
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  let deadline;
  try {
    await Promise.race([
      started,
      exited.then(() => {
        throw new Error(`${mode}: server exited before listening.`);
      }),
      new Promise((_, reject) => {
        deadline = setTimeout(() => reject(new Error(`${mode}: startup timed out.`)), 15000);
      }),
    ]);
    clearTimeout(deadline);
    const firstExport = payloads.length;
    const health = await fetch(`http://127.0.0.1:${port}/health?private=PRIVATE_QUERY`, {
      headers: { authorization: "Bearer PRIVATE_CLIENT_TOKEN", cookie: "private=PRIVATE_COOKIE" },
    });
    assert.equal(health.status, 200);
    await health.arrayBuffer();
    const protectedResponse = await fetch(`http://127.0.0.1:${port}/api/dashboard/bootstrap`);
    assert.equal(protectedResponse.status, 401);
    await protectedResponse.arrayBuffer();

    if (enabled) {
      for (let attempt = 0; attempt < 60 && payloads.length === firstExport; attempt++)
        await delay(100);
      assert.ok(payloads.length > firstExport, `${mode}: missing OTLP metrics.`);
      for (const payload of payloads.slice(firstExport)) {
        assert.equal(payload.path, "/v1/metrics");
        assert.equal(payload.contentType, "application/x-protobuf");
        assert.ok(payload.body.includes(Buffer.from("http.server.request.duration")));
        assert.ok(payload.body.includes(Buffer.from("financplantoes.http.server.requests")));
        assert.ok(!payload.body.includes(Buffer.from("PRIVATE_")));
        assert.ok(!payload.body.includes(Buffer.from("127.0.0.1")));
      }
    } else {
      await delay(1200);
      assert.equal(payloads.length, firstExport, `${mode}: disabled telemetry exported data.`);
    }
    assert.ok(!output.includes("PRIVATE_"), `${mode}: local output leaked synthetic private data.`);
    console.log(
      `PASS ${mode}: HTTP 200/401, telemetry ${enabled ? "enabled (protobuf)" : "disabled"}, privacy.`,
    );
  } finally {
    clearTimeout(deadline);
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await exited;
  }
}

try {
  for (const mode of ["tsx", "tsup"]) {
    await check(mode, true);
    await check(mode, false);
  }
} finally {
  collector.closeAllConnections();
  await new Promise((done) => collector.close(done));
}
