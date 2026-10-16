import type { Attributes } from "@opentelemetry/api";
import type { Request, RequestHandler, Response } from "express";
import type { FormatFn } from "morgan";

// Only source-controlled route templates may leave the process. New routes fail closed.
const routePaths = {
  "": ["/", "/health"],
  "/api/ai": ["/chat"],
  "/api/dashboard": ["/overview", "/bootstrap"],
  "/api/expenses": ["/", "/personal", "/shared"],
  "/api/locations": ["/", "/:id"],
  "/api/receivables": ["/", "/:id", "/:id/mark-paid"],
  "/api/reports": ["/export.csv"],
  "/api/settings": ["/"],
  "/api/shifts": ["/", "/:id"],
  "/api/spaces": ["/", "/:id"],
} as const;

export type RoutePrefix = keyof typeof routePaths;
const prefixes = new WeakMap<Request, RoutePrefix>();
const methods = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "CONNECT",
  "TRACE",
]);
export const HTTP_ATTRIBUTE_KEYS = [
  "http.request.method",
  "http.route",
  "http.response.status_code",
  "error.type",
  "otel.metric.overflow", // SDK-only boolean for the bounded cardinality overflow bucket.
];
export const APPROVED_ROUTES = new Set([
  "unmatched",
  ...Object.entries(routePaths).flatMap(([prefix, paths]) =>
    paths.map((path) => `${prefix}${path === "/" && prefix ? "" : path}`),
  ),
]);

export function trackRoutePrefix(prefix: RoutePrefix): RequestHandler {
  return (request, _response, next) => {
    prefixes.set(request, prefix);
    next();
  };
}

export function approvedRoute(request: Request): string {
  const prefix = prefixes.get(request) ?? "";
  const path: unknown = (request.route as { path?: unknown } | undefined)?.path;
  if (typeof path !== "string" || !(routePaths[prefix] as readonly string[]).includes(path)) {
    return "unmatched";
  }
  return `${prefix}${path === "/" && prefix ? "" : path}`;
}

export function httpAttributes(
  method: string,
  route: string,
  status?: number,
  aborted = false,
): Attributes {
  const attributes: Attributes = {
    "http.request.method": methods.has(method) ? method : "_OTHER",
    "http.route": APPROVED_ROUTES.has(route) ? route : "unmatched",
  };
  if (status !== undefined && Number.isInteger(status) && status >= 100 && status <= 599) {
    attributes["http.response.status_code"] = status;
  }
  if (aborted) attributes["error.type"] = "client_aborted";
  return attributes;
}

// Keep existing local access logs, without URLs, IPs, headers or response bodies.
export const safeAccessLog: FormatFn<Request, Response> = (tokens, request, response) => {
  const duration = Number(tokens["response-time"]?.(request, response));
  return JSON.stringify({
    ...httpAttributes(
      request.method,
      approvedRoute(request),
      response.headersSent ? response.statusCode : undefined,
    ),
    duration_ms: Number.isFinite(duration) ? duration : 0,
  });
};
