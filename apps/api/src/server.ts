import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.API_PORT, () => {
  console.log(`FinancPlantoes API listening on http://localhost:${env.API_PORT}`);
});
