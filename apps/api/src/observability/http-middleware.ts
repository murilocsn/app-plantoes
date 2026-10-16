import type { RequestHandler } from "express";
import { approvedRoute } from "./http-attributes";
import type { HttpTelemetry } from "./metrics";

export function httpMetricsMiddleware(telemetry: HttpTelemetry): RequestHandler {
  return (request, response, next) => {
    if (!telemetry.enabled) {
      next();
      return;
    }
    const startedAt = performance.now();
    let recorded = false;
    const record = (aborted: boolean) => {
      if (recorded) return;
      recorded = true;
      response.off("finish", finish);
      response.off("close", close);
      try {
        telemetry.record({
          method: request.method,
          route: approvedRoute(request),
          status: response.headersSent ? response.statusCode : undefined,
          aborted,
          durationSeconds: Math.max(0, performance.now() - startedAt) / 1000,
        });
      } catch {
        // Observability must not change an HTTP response or crash a request.
      }
    };
    const finish = () => record(false);
    const close = () => record(!response.writableFinished);
    response.once("finish", finish);
    response.once("close", close);
    next();
  };
}
