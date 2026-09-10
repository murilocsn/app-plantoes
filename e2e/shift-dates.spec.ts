import type { AppBootstrap, Location, Shift } from "@financplantoes/shared";
import { expect, test } from "@playwright/test";

test.use({ locale: "en-US", timezoneId: "America/Sao_Paulo" });

const location: Location = {
  id: "test-location",
  name: "Hospital Central",
  value12: 1500,
  active: true,
  reference_start_day: 1,
  reference_end_day: 28,
  payment_due_day: 10,
  payment_due_months_after: 1,
};

const shifts: Shift[] = ["2026-09-08", "2026-08-09", "2026-09-09"].map((date, index) => ({
  id: `test-shift-${index}`,
  date,
  location_id: location.id,
  location_name: location.name,
  start_time: "07:00",
  duration: 12,
  value: 1500,
  professional: "Ana",
  notes: index === 0 ? "Emergencia" : "",
}));

const bootstrap: AppBootstrap = {
  locations: [location],
  shifts,
  receivables: [],
  personalExpenses: [],
  sharedExpenses: [],
  spaces: [],
  plans: [],
  summary: {
    monthKey: "2026-09",
    incomeProjected: 4500,
    received: 0,
    pending: 0,
    expenses: 0,
    net: 0,
    shiftCount: 3,
    shiftHours: 36,
    activeLocationCount: 1,
    nextReceivable: null,
  },
};

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-09T01:30:00Z"));

  // Autenticacao e dados simulados: estes testes nunca gravam no Supabase.
  await page.route("**/auth/v1/**", (route) => route.fulfill({
    json: {
      access_token: "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.test-signature",
      refresh_token: "test-refresh-token",
      token_type: "bearer",
      expires_in: 3600,
      user: {
        id: "00000000-0000-4000-8000-000000000001",
        aud: "authenticated",
        role: "authenticated",
        email: "teste@example.test",
        user_metadata: { full_name: "Usuario de teste" },
        app_metadata: {},
        created_at: "2026-01-01T00:00:00Z",
      },
    },
  }));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === "/api/dashboard/bootstrap") {
      await route.fulfill({ json: { data: bootstrap } });
    } else if (path === "/api/dashboard/overview") {
      await route.fulfill({ json: { data: {
        summary: bootstrap.summary,
        calendarShifts: shifts,
        upcomingShifts: shifts,
        locations: [location],
        receivables: [],
        spaceCount: 0,
      } } });
    } else if (path === "/api/shifts" && request.method() === "POST") {
      await route.fulfill({ status: 201, json: { data: [] } });
    } else if (path.startsWith("/api/shifts/") && request.method() === "PATCH") {
      await route.fulfill({ json: { data: request.postDataJSON() } });
    } else {
      await route.abort();
    }
  });

  await page.goto("/#/login");
  await page.getByLabel("E-mail").fill("teste@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).not.toHaveURL(/#\/login/);
  await page.goto("/#/shifts");
  await expect(page.locator(".table-row")).toHaveCount(3);
});

test("busca datas brasileiras completas e parciais sem inverter dia e mes", async ({ page }) => {
  const search = page.getByRole("textbox", { name: "Buscar plantoes" });

  for (const term of ["08/09/2026", "08/09", "2026-09-08", "emergencia"]) {
    await search.fill(term);
    await expect(page.locator(".table-row")).toHaveCount(1);
    await expect(page.locator(".shift-day-label")).toHaveText("08/09/2026");
  }

  await search.fill("09/08/2026");
  await expect(page.locator(".shift-day-label")).toHaveText("09/08/2026");
  await search.fill("09/2026");
  await expect(page.locator(".table-row")).toHaveCount(2);
  for (const term of ["hospital central", "ANA", ""]) {
    await search.fill(term);
    await expect(page.locator(".table-row")).toHaveCount(3);
  }
  await search.fill("31/12/2030");
  await expect(page.locator(".table-row")).toHaveCount(0);
});

test("cadastra data e repeticao em formato brasileiro e envia datas ISO para a API", async ({ page }, testInfo) => {
  await page.locator(".page-section").getByRole("button", { name: "Novo plantao" }).click();
  const dialog = page.getByRole("dialog");
  const date = dialog.getByRole("textbox", { name: "Data", exact: true });
  await expect(date).toHaveValue("08/09/2026");
  await date.fill("10092026");
  await expect(date).toHaveValue("10/09/2026");
  await dialog.getByLabel("Repetir plantao").check();
  await dialog.getByRole("textbox", { name: "Data final", exact: true }).fill("30/09/2026");

  const overflow = await dialog.evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("datas-brasileiras.png"), fullPage: true });

  const submitted = page.waitForRequest((request) => request.url().endsWith("/api/shifts") && request.method() === "POST");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  expect((await submitted).postDataJSON()).toMatchObject({
    shift: { date: "2026-09-10" },
    recurrence: { end_date: "2026-09-30" },
  });
  await expect(dialog).not.toBeVisible();
});

test("edita datas existentes e preserva o seletor de calendario", async ({ page }) => {
  await page.getByRole("textbox", { name: "Buscar plantoes" }).fill("08/09/2026");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const date = dialog.getByRole("textbox", { name: "Data", exact: true });
  await expect(date).toHaveValue("08/09/2026");
  await dialog.getByLabel("Escolher data no calendario", { exact: true }).fill("2026-12-31");
  await expect(date).toHaveValue("31/12/2026");

  const submitted = page.waitForRequest((request) => request.url().includes("/api/shifts/") && request.method() === "PATCH");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  expect((await submitted).postDataJSON()).toMatchObject({ date: "2026-12-31" });
  await expect(dialog).not.toBeVisible();
});

test("valida datas impossiveis e permite ano bissexto e repeticao sem data final", async ({ page }) => {
  await page.locator(".page-section").getByRole("button", { name: "Novo plantao" }).click();
  const dialog = page.getByRole("dialog");
  const date = dialog.getByRole("textbox", { name: "Data", exact: true });
  const save = dialog.getByRole("button", { name: "Salvar" });

  for (const invalidDate of ["31/02/2026", "29/02/2026", "08/09/", ""]) {
    await date.fill(invalidDate);
    await save.click();
    await expect(date).toHaveAttribute("aria-invalid", "true");
    await expect(dialog.getByText("Informe uma data valida")).toBeVisible();
  }

  await date.fill("29/02/2028");
  await dialog.getByLabel("Repetir plantao").check();
  const endDate = dialog.getByRole("textbox", { name: "Data final", exact: true });
  await endDate.fill("31/04/2028");
  await save.click();
  await expect(endDate).toHaveAttribute("aria-invalid", "true");
  await endDate.fill("");
  await dialog.getByLabel("Quantidade").fill("3");
  const submitted = page.waitForRequest((request) => request.url().endsWith("/api/shifts") && request.method() === "POST");
  await save.click();
  expect((await submitted).postDataJSON()).toMatchObject({
    shift: { date: "2028-02-29" },
    recurrence: { end_date: null, occurrences: 3 },
  });
  await expect(dialog).not.toBeVisible();
});
