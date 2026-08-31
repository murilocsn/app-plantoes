import { chromium } from "@playwright/test";
import { config } from "dotenv";

config({ quiet: true });

const email = process.env.E2E_USER_1_EMAIL;
const password = process.env.E2E_USER_1_PASSWORD;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { height: 720, width: 1280 } });

page.on("console", (msg) => console.log("[console]", msg.type(), msg.text().slice(0, 300)));

// Captura TODAS as respostas HTTP com status >= 400
page.on("response", (response) => {
  if (response.status() >= 400) {
    console.log(
      `[HTTP ${response.status()}] ${response.request().method()} ${response.url()}`,
    );
    response
      .text()
      .then((body) => console.log(`  ↳ corpo da resposta: ${body.slice(0, 400)}`))
      .catch(() => {});
  }
});

await page.goto("http://localhost:5173/login", { timeout: 60000 });
await page.locator("input[type=email]").fill(email);
await page.locator("input[type=password]").fill(password);
await page.locator("button[type=submit]").click();

await page.waitForSelector(".calendar-grid", { timeout: 30000 });

// Visita as demais páginas para capturar 400s em cada uma
for (const rota of ["/shifts", "/locations", "/finance", "/expenses", "/spaces", "/reports"]) {
  await page.goto(`http://localhost:5173${rota}`, { timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log(`--- visitado ${rota} ---`);
}

await browser.close();
console.log("diagnostico concluido");

