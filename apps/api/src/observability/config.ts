export const SERVICE_NAME = "financplantoes-api";

export type TelemetryConfig =
  | { enabled: false }
  | {
      enabled: true;
      endpoint: string;
      headers: Record<string, string>;
      exportIntervalMillis: number;
      exportTimeoutMillis: number;
      environment: "development" | "test" | "production";
    };

type Environment = Readonly<Record<string, string | undefined>>;

function invalidConfiguration(): never {
  // Never include input values: endpoint/header configuration can contain secrets.
  throw new Error("Invalid HTTP metrics configuration.");
}

function milliseconds(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (value === undefined || value === "") return fallback;
  if (!/^\d+$/.test(value)) return invalidConfiguration();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    return invalidConfiguration();
  }
  return parsed;
}

function authorizationHeaders(value: string | undefined): Record<string, string> {
  if (!value?.trim()) return {};
  if (value.length > 8192) return invalidConfiguration();
  const headers: Record<string, string> = {};
  for (const entry of value.split(",")) {
    const separator = entry.indexOf("=");
    if (separator < 1) return invalidConfiguration();
    const key = entry.slice(0, separator).trim().toLowerCase();
    let decoded: string;
    try {
      decoded = decodeURIComponent(entry.slice(separator + 1).trim());
    } catch {
      return invalidConfiguration();
    }
    if (
      key !== "authorization" ||
      headers.authorization ||
      !/^(Basic|Bearer) [A-Za-z0-9+/_=.-]+$/.test(decoded)
    ) {
      return invalidConfiguration();
    }
    headers.authorization = decoded;
  }
  return headers;
}

export function readTelemetryConfig(source: Environment): TelemetryConfig {
  // Opt in explicitly. Disabled telemetry neither validates nor uses exporter secrets.
  if (source.OTEL_SDK_DISABLED !== "false" || source.OTEL_METRICS_EXPORTER === "none") {
    return { enabled: false };
  }
  if (source.OTEL_METRICS_EXPORTER && source.OTEL_METRICS_EXPORTER !== "otlp") {
    return invalidConfiguration();
  }
  const protocol = source.OTEL_EXPORTER_OTLP_METRICS_PROTOCOL ?? source.OTEL_EXPORTER_OTLP_PROTOCOL;
  if (protocol && protocol !== "http/protobuf") return invalidConfiguration();
  if (source.OTEL_SERVICE_NAME && source.OTEL_SERVICE_NAME !== SERVICE_NAME) {
    return invalidConfiguration();
  }

  const specificEndpoint = source.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT;
  const endpoint = specificEndpoint || source.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return invalidConfiguration();
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return invalidConfiguration();
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
  ) {
    return invalidConfiguration();
  }
  if (specificEndpoint) {
    if (!url.pathname.endsWith("/v1/metrics")) return invalidConfiguration();
  } else {
    url.pathname = `${url.pathname.replace(/\/$/, "")}/v1/metrics`;
  }

  const exportIntervalMillis = milliseconds(
    source.OTEL_METRIC_EXPORT_INTERVAL,
    60000,
    1000,
    300000,
  );
  const exportTimeoutMillis = milliseconds(
    source.OTEL_EXPORTER_OTLP_METRICS_TIMEOUT ?? source.OTEL_EXPORTER_OTLP_TIMEOUT,
    Math.min(5000, exportIntervalMillis),
    100,
    10000,
  );
  if (exportTimeoutMillis > exportIntervalMillis) return invalidConfiguration();

  const environment = source.NODE_ENV;
  // The OTLP transport merges generic and signal-specific headers. Validate both
  // so an overridden generic configuration cannot sneak additional headers in.
  const genericHeaders = authorizationHeaders(source.OTEL_EXPORTER_OTLP_HEADERS);
  const specificHeaders = authorizationHeaders(source.OTEL_EXPORTER_OTLP_METRICS_HEADERS);
  return {
    enabled: true,
    endpoint: url.href,
    headers: { ...genericHeaders, ...specificHeaders },
    exportIntervalMillis,
    exportTimeoutMillis,
    environment:
      environment === "production" || environment === "test" ? environment : "development",
  };
}
