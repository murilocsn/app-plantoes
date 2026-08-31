import { chromium } from "@playwright/test";
import { config } from "dotenv";

config({ quiet: true });

const email = process.env.E2E_USER_1_EMAIL;
const password = process.env.E2E_USER_1_PASSWORD;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { height: 720, width: 1280 } });
page.on("console", (msg) => console.log("[console]", msg.type(), msg.text().slice(0, 200)));

await page.goto("http://localhost:5173/login", { timeout: 60000 });
await page.locator("input[type=email]").fill(email);
await page.locator("input[type=password]").fill(password);
await page.locator("button[type=submit]").click();

await page.waitForTimeout(12000);

console.log("URL:", page.url());
console.log("form-message:", await page.locator(".form-message").allTextContents());
console.log("calendar-grid count:", await page.locator(".calendar-grid").count());
console.log("body classes/text sample:", (await page.locator("body").innerText()).slice(0, 500).replace(/\n/g, " | "));

await browser.close();
