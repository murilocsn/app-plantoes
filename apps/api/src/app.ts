import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
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

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  app.get("/health", (_request, response) => {
    response.json({ data: { status: "ok" } });
  });

  app.use("/api", requireAuth);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/locations", locationsRouter);
  app.use("/api/shifts", shiftsRouter);
  app.use("/api/receivables", receivablesRouter);
  app.use("/api/expenses", expensesRouter);
  app.use("/api/spaces", spacesRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/reports", reportsRouter);

  app.use(errorHandler);

  return app;
}
