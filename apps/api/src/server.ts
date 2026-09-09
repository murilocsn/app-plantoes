import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

const port = Number(process.env.PORT || env.API_PORT);

app.listen(port, () => {
  console.log(`FinancPlantoes API listening on port ${port}`);
});