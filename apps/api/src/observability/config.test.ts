import { describe, expect, it } from "vitest";
import { readTelemetryConfig } from "./config";

const enabled = {
  OTEL_SDK_DISABLED: "false",
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://127.0.0.1:4318",
};

describe("HTTP telemetry configuration", () => {
  it("is opt-in and ignores invalid exporter configuration while disabled", () => {
    expect(readTelemetryConfig({})).toEqual({ enabled: false });
    expect(
      readTelemetryConfig({
        OTEL_SDK_DISABLED: "true",
        OTEL_EXPORTER_OTLP_ENDPOINT: "PRIVATE_VALUE",
      }),
    ).toEqual({ enabled: false });
    expect(readTelemetryConfig({ ...enabled, OTEL_METRICS_EXPORTER: "none" })).toEqual({
      enabled: false,
    });
  });

  it("uses protobuf, safe defaults and only the backend service identity", () => {
    expect(
      readTelemetryConfig({
        ...enabled,
        OTEL_RESOURCE_ATTRIBUTES: "user.id=PRIVATE_VALUE",
        NODE_ENV: "test",
      }),
    ).toEqual({
      enabled: true,
      endpoint: "http://127.0.0.1:4318/v1/metrics",
      headers: {},
      exportIntervalMillis: 60000,
      exportTimeoutMillis: 5000,
      environment: "test",
    });
  });

  it("preserves the OTLP gateway base path and supports a full metrics-specific endpoint", () => {
    expect(
      readTelemetryConfig({
        ...enabled,
        OTEL_EXPORTER_OTLP_ENDPOINT: "https://example.invalid/otlp/",
      }),
    ).toMatchObject({ endpoint: "https://example.invalid/otlp/v1/metrics" });
    expect(
      readTelemetryConfig({
        ...enabled,
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "https://example.invalid/otlp/v1/metrics",
      }),
    ).toMatchObject({ endpoint: "https://example.invalid/otlp/v1/metrics" });
  });

  it("supports encoded Basic authorization and signal-specific precedence", () => {
    expect(
      readTelemetryConfig({
        ...enabled,
        OTEL_EXPORTER_OTLP_HEADERS: "authorization=Bearer synthetic-generic",
        OTEL_EXPORTER_OTLP_METRICS_HEADERS: "Authorization=Basic%20c3ludGhldGljOg==",
        OTEL_EXPORTER_OTLP_METRICS_TIMEOUT: "200",
        OTEL_EXPORTER_OTLP_TIMEOUT: "300",
        OTEL_METRIC_EXPORT_INTERVAL: "1000",
      }),
    ).toMatchObject({
      headers: { authorization: "Basic c3ludGhldGljOg==" },
      exportTimeoutMillis: 200,
      exportIntervalMillis: 1000,
    });
  });

  it.each([
    { OTEL_EXPORTER_OTLP_ENDPOINT: "PRIVATE_VALUE" },
    { OTEL_EXPORTER_OTLP_ENDPOINT: "http://example.invalid" },
    { OTEL_EXPORTER_OTLP_ENDPOINT: "https://PRIVATE_VALUE@example.invalid" },
    { OTEL_EXPORTER_OTLP_ENDPOINT: "https://example.invalid?token=PRIVATE_VALUE" },
    { OTEL_EXPORTER_OTLP_ENDPOINT: "https://example.invalid/#PRIVATE_VALUE" },
    { OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "https://example.invalid/otlp" },
    { OTEL_EXPORTER_OTLP_PROTOCOL: "grpc" },
    { OTEL_METRICS_EXPORTER: "console" },
    { OTEL_SERVICE_NAME: "PRIVATE_VALUE" },
    { OTEL_EXPORTER_OTLP_HEADERS: "cookie=PRIVATE_VALUE" },
    {
      OTEL_EXPORTER_OTLP_HEADERS: "cookie=PRIVATE_VALUE",
      OTEL_EXPORTER_OTLP_METRICS_HEADERS: "authorization=Bearer synthetic",
    },
    { OTEL_EXPORTER_OTLP_HEADERS: "authorization=Bearer%0D%0APRIVATE_VALUE" },
    { OTEL_EXPORTER_OTLP_HEADERS: "authorization=Bearer%ZZPRIVATE_VALUE" },
    {
      OTEL_EXPORTER_OTLP_HEADERS:
        "authorization=Bearer synthetic,authorization=Bearer PRIVATE_VALUE",
    },
    { OTEL_METRIC_EXPORT_INTERVAL: "NaN" },
    { OTEL_METRIC_EXPORT_INTERVAL: "0" },
    { OTEL_EXPORTER_OTLP_TIMEOUT: "10001" },
    { OTEL_METRIC_EXPORT_INTERVAL: "1000", OTEL_EXPORTER_OTLP_TIMEOUT: "2000" },
  ])("rejects unsafe configuration without reproducing its values: %j", (overrides) => {
    expect(() => readTelemetryConfig({ ...enabled, ...overrides })).toThrow(
      /^Invalid HTTP metrics configuration\.$/,
    );
  });
});
