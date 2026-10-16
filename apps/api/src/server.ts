import "dotenv/config";
import { initializeHttpTelemetry } from "./observability/metrics";

// Dynamic import is intentional: initialize metrics before evaluating Express/routers.
// This ordering works in tsx and in the ESM bundle emitted by tsup, without patching loaders.
const telemetry = initializeHttpTelemetry();
const { createApp } = await import("./app");
const { env } = await import("./config/env");

const app = createApp(telemetry);

const port = Number(process.env.PORT || env.API_PORT);

const server = app.listen(port, () => {
  console.log(`FinancPlantoes API listening on port ${port}`);
});

let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => server.closeAllConnections(), 10000);
  deadline.unref();
  server.close(() => {
    clearTimeout(deadline);
    void telemetry.shutdown();
  });
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
