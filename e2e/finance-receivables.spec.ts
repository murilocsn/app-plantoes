import type { AppBootstrap, Location, Receivable } from "@financplantoes/shared";
import { expect, test } from "@playwright/test";

test.use({ locale: "pt-BR", timezoneId: "America/Sao_Paulo" });

const locations: Location[] = [
  {
    id: "upa-centro",
    name: "UPA Centro",
    value12: 1000,
    active: true,
    reference_start_day: 1,
    reference_end_day: 28,
    payment_due_day: 10,
    payment_due_months_after: 1,
  },
  {
    id: "upa-norte",
    name: "UPA Norte",
    value12: 900,
    active: true,
    reference_start_day: 1,
    reference_end_day: 28,
    payment_due_day: 10,
    payment_due_months_after: 1,
  },
];

const receivables: Receivable[] = [
  {
    id: "receivable-1",
    shift_id: "shift-1",
    location_id: "upa-centro",
    description: "Plantao - UPA Centro",
    amount: 1000,
    expected_date: "2026-09-10",
    status: "pending",
  },
  {
    id: "receivable-2",
    shift_id: "shift-2",
    location_id: "upa-centro",
    description: "Plantao - UPA Centro",
    amount: 1000,
    expected_date: "2026-09-10",
    status: "pending",
  },
  {
    id: "receivable-3",
    shift_id: "shift-3",
    location_id: "upa-norte",
    description: "Plantao - UPA Norte",
    amount: 900,
    expected_date: "2026-09-27",
    status: "received",
  },
];

const bootstrap: AppBootstrap = {
  locations,
  shifts: [],
  receivables,
  personalExpenses: [],
  sharedExpenses: [],
  spaces: [],
  plans: [],
  summary: {
    monthKey: "2026-09",
    incomeProjected: 0,
    received: 900,
    pending: 2000,
    expenses: 0,
    net: 900,
    shiftCount: 0,
    shiftHours: 0,
    activeLocationCount: 2,
    nextReceivable: receivables[0],
  },
};

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-08T15:00:00Z"));

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
    const path = new URL(route.request().url()).pathname;

    if (path === "/api/dashboard/bootstrap") {
      await route.fulfill({ json: { data: bootstrap } });
    } else if (path === "/api/dashboard/overview") {
      await route.fulfill({ json: { data: {
        summary: bootstrap.summary,
        calendarShifts: [],
        upcomingShifts: [],
        receivables,
        locations,
        spaceCount: 0,
      } } });
    } else if (path.endsWith("/mark-paid") && route.request().method() === "POST") {
      await route.fulfill({
        json: {
          data: {
            ...receivables[0],
            ...route.request().postDataJSON(),
            status: "received",
          },
        },
      });
    } else {
      await route.abort();
    }
  });

  await page.goto("/login");
  await page.getByLabel("E-mail").fill("teste@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto("/finance");
});

test("agrupa recebiveis por unidade e periodo antes de exibir os detalhes", async ({ page }, testInfo) => {
  await expect(page.locator(".receivable-period")).toHaveCount(2);
  await expect(page.getByText("10/09/2026 - 2 recebiveis")).toBeVisible();
  await expect(page.locator(".receivable-period").filter({ hasText: "UPA Centro" }).getByText("R$ 2.000,00")).toBeVisible();
  await expect(page.getByText("27/09/2026 - 1 recebivel")).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("financeiro-periodos.png"), fullPage: true });

  await page.getByLabel("Unidade").selectOption("upa-centro");
  await expect(page.locator(".receivable-period")).toHaveCount(1);
  await expect(page.locator(".receivable-period").filter({ hasText: "UPA Centro" })).toBeVisible();
  await expect(page.locator(".receivable-period").filter({ hasText: "UPA Norte" })).toHaveCount(0);

  await page.getByLabel("Unidade").selectOption("");
  await page.getByRole("textbox", { name: "Periodo de", exact: true }).fill("27/09/2026");
  await expect(page.locator(".receivable-period")).toHaveCount(1);
  await expect(page.locator(".receivable-period").filter({ hasText: "UPA Norte" })).toBeVisible();

  await page.getByLabel("Unidade").selectOption("upa-centro");
  await expect(page.getByText("Sem recebiveis")).toBeVisible();
});

test("mantem acoes individuais dentro do periodo expandido", async ({ page }) => {
  await page.locator(".receivable-period").filter({ hasText: "UPA Centro" }).locator("summary").click();
  await expect(page.getByRole("button", { name: "Marcar recebido" })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Editar recebivel" })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Excluir recebivel" })).toHaveCount(2);
});

test("confirma recebimento enviando data ISO e metodo aceito pelo banco", async ({ page }) => {
  await page.locator(".receivable-period").filter({ hasText: "UPA Centro" }).locator("summary").click();
  await page.getByRole("button", { name: "Marcar recebido" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("textbox", { name: "Data recebida", exact: true })).toHaveValue("08/09/2026");

  const submitted = page.waitForRequest((request) => request.url().endsWith("/mark-paid") && request.method() === "POST");
  await dialog.getByRole("button", { name: "Confirmar" }).click();

  expect((await submitted).postDataJSON()).toMatchObject({
    received_date: "2026-09-08",
    payment_method: "pix",
  });
  await expect(dialog).not.toBeVisible();
});
