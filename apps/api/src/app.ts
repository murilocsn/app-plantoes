import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import type { Request, Response } from "express";
import { env } from "./config/env";
import { HttpError } from "./lib/http-error";
import { safeAccessLog, trackRoutePrefix } from "./observability/http-attributes";
import { httpMetricsMiddleware } from "./observability/http-middleware";
import { disabledTelemetry } from "./observability/metrics";
import type { HttpTelemetry } from "./observability/metrics";
import { errorHandler } from "./middleware/error-handler";
import { requireAuth } from "./middleware/auth";
import { dashboardRouter } from "./routes/dashboard";
import { expensesRouter } from "./routes/expenses";
import { locationsRouter } from "./routes/locations";
import { receivablesRouter } from "./routes/receivables";
import { reportsRouter } from "./routes/reports";
import { settingsRouter } from "./routes/settings";
import { shiftsRouter } from "./routes/shifts";
import { spacesRouter } from "./routes/spaces";

export function createApp(telemetry: HttpTelemetry = disabledTelemetry) {
  const app = express();

  app.use(httpMetricsMiddleware(telemetry));
  app.use(morgan<Request, Response>(safeAccessLog));
  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_request, response) => {
    response.json({
      data: {
        name: "FinancPlantões API",
        status: "online",
        application: "https://murilocsn.github.io/app-plantoes/",
        health: "/health",
      },
    });
  });

  app.get("/health", (_request, response) => {
    response.json({ data: { status: "ok" } });
  });

  app.use("/api", requireAuth);
  // Keep the implementation in routes/ai.ts dormant until the feature is reactivated.
  app.use("/api/ai", (_request, _response, next) => {
    next(new HttpError(404, "Assistente IA indisponivel.", "FEATURE_DISABLED"));
  });
  app.use("/api/dashboard", trackRoutePrefix("/api/dashboard"), dashboardRouter);
  app.use("/api/locations", trackRoutePrefix("/api/locations"), locationsRouter);
  app.use("/api/shifts", trackRoutePrefix("/api/shifts"), shiftsRouter);
  app.use("/api/receivables", trackRoutePrefix("/api/receivables"), receivablesRouter);
  app.use("/api/expenses", trackRoutePrefix("/api/expenses"), expensesRouter);
  app.use("/api/spaces", trackRoutePrefix("/api/spaces"), spacesRouter);
  app.use("/api/settings", trackRoutePrefix("/api/settings"), settingsRouter);
  app.use("/api/reports", trackRoutePrefix("/api/reports"), reportsRouter);

  app.use(errorHandler);

  return app;
}
