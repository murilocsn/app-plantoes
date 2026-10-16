import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  AggregationTemporality,
  AggregationType,
  createAllowListAttributesProcessor,
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import type { PushMetricExporter } from "@opentelemetry/sdk-metrics";
import { readTelemetryConfig, SERVICE_NAME } from "./config";
import type { TelemetryConfig } from "./config";
import { HTTP_ATTRIBUTE_KEYS, httpAttributes } from "./http-attributes";

export const REQUEST_COUNT = "financplantoes.http.server.requests";
export const REQUEST_DURATION = "http.server.request.duration";

export interface HttpMeasurement {
  method: string;
  route: string;
  status?: number;
  aborted?: boolean;
  durationSeconds: number;
}

export interface HttpTelemetry {
  readonly enabled: boolean;
  record(measurement: HttpMeasurement): void;
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
}

export const disabledTelemetry: HttpTelemetry = {
  enabled: false,
  record() {},
  async forceFlush() {},
  async shutdown() {},
};

export function createHttpTelemetry(
  config: TelemetryConfig,
  exporter?: PushMetricExporter,
): HttpTelemetry {
  if (!config.enabled) return disabledTelemetry;

  let lastWarning = -Infinity;
  const warn = () => {
    if (Date.now() - lastWarning >= 60000) {
      lastWarning = Date.now();
      console.warn("HTTP metrics export failed; HTTP requests remain available.");
    }
  };
  const delegate =
    exporter ??
    new OTLPMetricExporter({
      url: config.endpoint,
      headers: config.headers,
      timeoutMillis: config.exportTimeoutMillis,
      concurrencyLimit: 1,
    });
  // Do not forward exporter errors (which may contain endpoints or credentials) to diagnostics.
  const safeExporter: PushMetricExporter = {
    export(data, callback) {
      try {
        delegate.export(data, (result) => {
          if (result.code !== 0) warn();
          callback({ code: result.code === 0 ? 0 : 1 });
        });
      } catch {
        warn();
        callback({ code: 1 });
      }
    },
    selectAggregationTemporality: () => AggregationTemporality.CUMULATIVE,
    async forceFlush() {
      try {
        await delegate.forceFlush();
      } catch {
        warn();
      }
    },
    async shutdown() {
      try {
        await delegate.shutdown();
      } catch {
        warn();
      }
    },
  };
  const reader = new PeriodicExportingMetricReader({
    exporter: safeExporter,
    exportIntervalMillis: config.exportIntervalMillis,
    exportTimeoutMillis: config.exportTimeoutMillis,
  });
  const provider = new MeterProvider({
    // No resource detectors, environment attribute injection, host/process identifiers or SDK self-metrics.
    resource: resourceFromAttributes({
      "service.name": SERVICE_NAME,
      "deployment.environment.name": config.environment,
    }),
    sdkMetricsEnabled: false,
    readers: [reader],
    views: [REQUEST_COUNT, REQUEST_DURATION].map((instrumentName) => ({
      instrumentName,
      attributesProcessors: [createAllowListAttributesProcessor(HTTP_ATTRIBUTE_KEYS)],
      aggregationCardinalityLimit: 2000,
      ...(instrumentName === REQUEST_DURATION
        ? {
            aggregation: {
              type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
              options: {
                boundaries: [
                  0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 7.5, 10,
                ],
              },
            },
          }
        : {}),
    })),
  });
  // Use a private provider: no global registration or automatic trace/log initialization.
  const meter = provider.getMeter("financplantoes.http");
  const requests = meter.createCounter(REQUEST_COUNT, {
    description: "Completed or aborted inbound HTTP requests.",
    unit: "{request}",
  });
  const duration = meter.createHistogram(REQUEST_DURATION, {
    description: "Duration of inbound HTTP requests.",
    unit: "s",
  });
  let stopped = false;
  let shutdown: Promise<void> | undefined;
  return {
    enabled: true,
    record(measurement) {
      if (
        stopped ||
        !Number.isFinite(measurement.durationSeconds) ||
        measurement.durationSeconds < 0
      )
        return;
      const attributes = httpAttributes(
        measurement.method,
        measurement.route,
        measurement.status,
        measurement.aborted,
      );
      requests.add(1, attributes);
      duration.record(measurement.durationSeconds, attributes);
    },
    async forceFlush() {
      if (stopped) return;
      try {
        await provider.forceFlush({ timeoutMillis: config.exportTimeoutMillis + 1000 });
      } catch {
        warn();
      }
    },
    shutdown() {
      if (!shutdown) {
        stopped = true;
        shutdown = provider
          .shutdown({ timeoutMillis: config.exportTimeoutMillis + 1000 })
          .catch(warn);
      }
      return shutdown;
    },
  };
}

let initialized: HttpTelemetry | undefined;

export function initializeHttpTelemetry(): HttpTelemetry {
  if (!initialized) {
    try {
      initialized = createHttpTelemetry(readTelemetryConfig(process.env));
    } catch {
      console.warn("HTTP metrics disabled: invalid observability configuration.");
      initialized = disabledTelemetry;
    }
  }
  return initialized;
}
