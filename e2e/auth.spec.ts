import type { AppBootstrap, Location, Shift } from "@financplantoes/shared";
import { expect, test, type Page } from "@playwright/test";

type TestUser = { email: string; label: string; password: string };

const mockedUser: TestUser = {
  email: "teste@example.test",
  label: "usuario mockado",
  password: "test-password",
};

const location: Location = {
  id: "auth-location",
  name: "Hospital Central",
  value12: 1500,
  active: true,
  reference_start_day: 1,
  reference_end_day: 28,
  payment_due_day: 10,
  payment_due_months_after: 1,
};

const shifts: Shift[] = [
  {
    id: "auth-shift-1",
    date: "2026-09-10",
    location_id: location.id,
    location_name: location.name,
    start_time: "07:00",
    duration: 12,
    value: 1500,
    professional: "Ana",
    notes: "Plantao de teste",
  },
];

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
    incomeProjected: 1500,
    received: 0,
    pending: 0,
    expenses: 0,
    net: 0,
    shiftCount: 1,
    shiftHours: 12,
    activeLocationCount: 1,
    nextReceivable: null,
  },
};

const layoutBootstrap: AppBootstrap = {
  ...bootstrap,
  locations: [{ ...location, name: "Unidade de demonstracao com nome extenso" }],
  receivables: [
    { id: "layout-pending", location_id: location.id, description: "Plantao de demonstracao com descricao extensa", amount: 12500, expected_date: "2026-09-30", status: "pending" },
    { id: "layout-paid", location_id: location.id, description: "Recebimento avulso de demonstracao", amount: 1500, expected_date: "2026-09-10", received_date: "2026-09-08", status: "received" },
  ],
  personalExpenses: [{ id: "layout-personal", description: "Material de demonstracao", amount: 320, expense_date: "2026-09-10" }],
  sharedExpenses: [{ id: "layout-shared", description: "Custo compartilhado de demonstracao", amount: 200, expense_date: "2026-09-10" }],
  spaces: [{ id: "layout-space", name: "Equipe de demonstracao com nome extenso", space_type: "team", description: "Ambiente simulado para validar a interface", role: "owner" }],
};

function usersFromEnv(): TestUser[] {
  const users: TestUser[] = [];

  for (const index of [1, 2]) {
    const email = process.env[`E2E_USER_${index}_EMAIL`];
    const password = process.env[`E2E_USER_${index}_PASSWORD`];

    if (email && password) {
      users.push({ email, label: `usuario ${index}`, password });
    }
  }

  return users;
}

async function mockAuthAndApi(page: Page) {
  await page.clock.setFixedTime(new Date("2026-09-10T01:30:00Z"));

  await page.route("**/auth/v1/**", (route) =>
    route.fulfill({
      json: {
        access_token: "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.test-signature",
        refresh_token: "test-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        user: {
          id: "00000000-0000-4000-8000-000000000001",
          aud: "authenticated",
          role: "authenticated",
          email: mockedUser.email,
          user_metadata: { full_name: "Usuario de teste" },
          app_metadata: {},
          created_at: "2026-01-01T00:00:00Z",
        },
      },
    }),
  );

  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/api/receivables") {
      await route.fulfill({ json: { data: bootstrap.receivables } });
      return;
    }

    if (path === "/api/dashboard/bootstrap") {
      await route.fulfill({ json: { data: bootstrap } });
      return;
    }

    if (path === "/api/dashboard/overview") {
      await route.fulfill({
        json: {
          data: {
            summary: bootstrap.summary,
            calendarShifts: shifts,
            upcomingShifts: shifts,
            locations: [location],
            receivables: [],
            spaceCount: 0,
          },
        },
      });
      return;
    }

    await route.abort();
  });
}

async function mockPaymentLayout(page: Page, options: { failReceivables?: boolean; standaloneReceivables?: boolean } = {}) {
  const data: AppBootstrap = {
    ...bootstrap,
    shifts: [12, 14, 15].map((day) => ({
      id: `layout-shift-${day}`, date: `2026-09-${day}`, location_id: location.id,
      location_name: "UPA Centro", marker_label: "Urgência", marker_color: "#27b952",
      start_time: "14:00", duration: 6, value: 500, status: "scheduled",
    })),
    receivables: [12, 14, 15].map((day) => ({
      id: `layout-receipt-${day}`, shift_id: options.standaloneReceivables ? null : `layout-shift-${day}`, location_id: location.id,
      description: "Pagamento do plantão", amount: 500, expected_date: `2026-09-${day}`,
      status: day === 12 ? "received" : "pending",
    })),
  };
  await page.clock.setFixedTime(new Date("2026-09-15T12:00:00Z"));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/dashboard/bootstrap") return route.fulfill({ json: { data } });
    if (path === "/api/dashboard/overview") return route.fulfill({ json: { data: {
      summary: data.summary, calendarShifts: data.shifts, upcomingShifts: data.shifts,
      locations: data.locations, receivables: [], spaceCount: 0,
    } } });
    if (path === "/api/receivables") return route.fulfill(options.failReceivables
      ? { status: 503, json: { error: { message: "Falha simulada" } } }
      : { json: { data: data.receivables } });
    if (path === "/api/receivables/layout-receipt-14/mark-paid" && route.request().method() === "POST") {
      const item = data.receivables.find((receipt) => receipt.id === "layout-receipt-14")!;
      item.status = "received";
      return route.fulfill({ json: { data: item } });
    }
    return route.fallback();
  });
}

async function expectFinancialColors(page: Page) {
  await expect.poll(() => page.locator("[data-entry-type=receivable]").evaluateAll((rows) => {
    const colors = ["paid", "pending", "overdue"].map((state) => {
      const legend = document.querySelector(`.payment-legend-item[data-payment-state="${state}"]`)!;
      return getComputedStyle(legend, "::before").backgroundColor;
    });
    const [paid, pending, overdue] = colors.map((color) => color.match(/[\d.]+/g)!.map(Number));
    const palette = new Map(["paid", "pending", "overdue"].map((state, index) => [state, colors[index]]));
    return {
      matches: rows.every((row) => {
        const color = palette.get(row.getAttribute("data-payment-state")!);
        return getComputedStyle(row.querySelector(".ledger-accent")!).backgroundColor === color
          && getComputedStyle(row.querySelector(".payment-badge")!).backgroundColor === color;
      }),
      distinct: new Set(colors).size === 3,
      green: paid[1] > paid[0] && paid[1] > paid[2],
      yellow: pending[0] > pending[2] && pending[1] > pending[2],
      red: overdue[0] > overdue[1] && overdue[0] > overdue[2],
    };
  })).toEqual({ matches: true, distinct: true, green: true, yellow: true, red: true });
}

async function login(page: Page, user: TestUser) {
  await page.goto("/#/login");
  await page.locator("input[type=email]").fill(user.email);
  const password = page.locator("input[type=password]");
  await password.fill(user.password);
  await password.press("Enter");
}

test.describe("Login E2E mockado", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthAndApi(page);
  });

  test("faz login e chega ao painel (desktop e mobile)", async ({ page }) => {
    await login(page, mockedUser);

    await expect(page).not.toHaveURL(/#\/login/);
    await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });
  });

  test("lista de plantoes aparece agrupada por unidade e data", async ({ page }) => {
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });

    await page.goto("/#/shifts");

    const firstGroup = page.locator(".shift-date-head").first();

    await expect(firstGroup).toBeVisible({ timeout: 30000 });
    await expect(firstGroup.locator("strong")).toBeVisible({ timeout: 30000 });
  });

  test("atalhos inferiores navegam entre calendario, plantoes e recebimento no celular", async ({ page, isMobile }) => {
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });
    const navigation = page.getByRole("navigation", { name: "Navegação inferior" });

    if (!isMobile) {
      await expect(navigation).toBeHidden();
      await expect(page.getByRole("navigation", { name: "Navegacao principal", exact: true })).toBeVisible();
      return;
    }

    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("link")).toHaveText(["Calendário", "Plantões", "Recebimento"]);
    await expect(navigation.getByRole("link", { name: "Calendário", exact: true })).toHaveAttribute("aria-current", "page");
    const newShift = navigation.getByRole("button", { name: "Novo plantão", exact: true });
    const buttonBounds = await newShift.boundingBox();
    expect(buttonBounds!.x + buttonBounds!.width / 2).toBeCloseTo(page.viewportSize()!.width / 2, 0);
    await newShift.click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Novo plantao", exact: true })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();

    await navigation.getByRole("link", { name: "Plantões", exact: true }).click();
    await expect(page).toHaveURL(/#\/shifts$/);
    await expect(page.getByRole("heading", { name: "Plantoes", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Plantões", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(navigation.getByRole("link", { name: "Calendário", exact: true })).not.toHaveAttribute("aria-current", "page");
    await newShift.click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Novo plantao", exact: true })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();

    await navigation.getByRole("link", { name: "Recebimento", exact: true }).click();
    await expect(page).toHaveURL(/#\/finance$/);
    await expect(page.getByRole("heading", { name: "Recebimentos e pendências", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Recebimento", exact: true })).toHaveAttribute("aria-current", "page");
    await newShift.click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Novo plantao", exact: true })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();

    await navigation.getByRole("link", { name: "Calendário", exact: true }).click();
    await expect(page).toHaveURL(/\/#\/$/);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await navigation.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(page.getByRole("complementary", { name: "Menu mobile" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegacao principal mobile" })).toBeVisible();
  });

  test("barra inferior fica acessivel ao rolar sem cobrir conteudo ou modais em tela estreita", async ({ page, isMobile }, testInfo) => {
    test.skip(!isMobile, "Verificacao especifica para celular.");
    await page.setViewportSize({ width: 320, height: 568 });
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });
    const navigation = page.getByRole("navigation", { name: "Navegação inferior" });
    const bounds = await navigation.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y + bounds!.height).toBeCloseTo(568 - 8, 0);

    for (const control of await navigation.locator("a, button").all()) {
      const target = await control.boundingBox();
      expect(target!.width).toBeGreaterThanOrEqual(44);
      expect(target!.height).toBeGreaterThanOrEqual(44);
    }

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => {
      const lastContent = document.querySelector(".dashboard-upcoming")!.getBoundingClientRect();
      const nav = document.querySelector(".mobile-nav")!.getBoundingClientRect();
      return window.scrollY > 0 && lastContent.bottom <= nav.top;
    })).toBe(true);
    expect((await navigation.boundingBox())!.y).toBeCloseTo(bounds!.y, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("navegacao-inferior.png"), fullPage: true });

    await navigation.getByRole("button", { name: "Novo plantão", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await navigation.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return Boolean(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest(".modal-backdrop"));
    })).toBe(true);
  });

  test("dia selecionado exibe horario, faixa, valor e pagamento com acoes expansíveis", async ({ page }, testInfo) => {
    await mockPaymentLayout(page);
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.getByRole("button", { name: "14/09/2026", exact: true }).click();
    const row = page.locator(".day-detail .ledger-row");
    await expect(row).toHaveAttribute("data-payment-state", "unpaid");
    await expect(row.locator(".ledger-time")).toHaveText("14:00 – 20:00");
    await expect(row.locator(".ledger-title")).toHaveText("UPA Centro");
    await expect(row.locator(".ledger-amount")).toHaveText(/R\$\s*500,00/);
    await expect(row.locator(".payment-badge")).toHaveText("Não pago");
    await expect(row.getByRole("button", { name: "Editar plantao" })).toBeHidden();
    await row.locator(".ledger-trigger").focus();
    await page.keyboard.press("Enter");
    await expect(row.locator(".ledger-trigger")).toHaveAttribute("aria-expanded", "true");
    await row.getByRole("button", { name: "Editar plantao" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Editar plantao" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();
    await row.locator(".ledger-trigger").click();
    await page.screenshot({ path: testInfo.outputPath("calendario-referencia.png"), fullPage: true });
    await page.getByRole("button", { name: "12/09/2026", exact: true }).click();
    await expect(row).toHaveAttribute("data-payment-state", "paid");
  });

  test("acoes flutuantes de plantao preservam altura, cores, teclado e confirmacao", async ({ page, isMobile }, testInfo) => {
    await mockPaymentLayout(page);
    if (isMobile) await page.setViewportSize({ width: 320, height: 720 });
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.getByRole("button", { name: "14/09/2026", exact: true }).click();
    const row = page.locator(".day-detail .ledger-row");
    const trigger = row.locator(".ledger-trigger");
    const panel = row.getByRole("group", { name: "Ações do plantão" });
    const height = (await row.boundingBox())!.height;
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("button")).toHaveCount(2);
    expect((await row.boundingBox())!.height).toBeCloseTo(height, 0);
    await expect(panel).toHaveCSS("position", "absolute");
    const colors = await panel.evaluate((element) => {
      const edit = getComputedStyle(element.querySelector(".button-secondary")!);
      const remove = getComputedStyle(element.querySelector(".button-danger")!);
      const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
      const blue = rgb(edit.backgroundColor);
      const red = rgb(remove.backgroundColor);
      return {
        lightBlue: blue[2] > blue[0] && blue[2] > blue[1],
        red: red[0] > red[1] && red[0] > red[2],
        whiteIcon: remove.color === "rgb(255, 255, 255)",
        shadow: getComputedStyle(element).boxShadow !== "none",
      };
    });
    expect(colors).toEqual({ lightBlue: true, red: true, whiteIcon: true, shadow: true });
    const bounds = (await panel.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    await page.screenshot({ path: testInfo.outputPath("acoes-flutuantes.png") });
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.locator(".day-detail-head h3").click();
    await expect(panel).toBeHidden();
    await trigger.click();
    await panel.getByRole("button", { name: "Editar plantao" }).click();
    await expect(page.getByRole("dialog").getByRole("textbox", { name: "Data", exact: true })).toHaveValue("14/09/2026");
    await expect(panel).toBeHidden();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();
    await trigger.click();
    await panel.getByRole("button", { name: "Excluir plantao" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Excluir plantao" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(row).toBeVisible();
  });

  test("proximos plantoes agrupam acoes por registro e fecham ao abrir outra linha", async ({ page, isMobile }, testInfo) => {
    await mockPaymentLayout(page);
    await login(page, mockedUser);
    const upcoming = page.getByTestId("dashboard-upcoming-shifts");
    const rows = upcoming.locator(".shift-row");
    await expect(rows).toHaveCount(3);
    const first = rows.nth(0);
    const second = rows.nth(1);
    const firstTrigger = first.getByRole("button", { name: "Ações do plantão", exact: true });
    await firstTrigger.click();
    await expect(first.getByRole("group", { name: "Ações do plantão" })).toBeVisible();
    await second.getByRole("button", { name: "Ações do plantão", exact: true }).click();
    await expect(first.getByRole("group", { name: "Ações do plantão" })).toBeHidden();
    await expect(second.getByRole("group", { name: "Ações do plantão" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("proximos-acoes-flutuantes.png") });
    await second.getByRole("button", { name: "Editar plantao" }).click();
    await expect(page.getByRole("dialog").getByRole("textbox", { name: "Data", exact: true })).toHaveValue("14/09/2026");
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();
    await firstTrigger.click();
    if (isMobile) {
      await firstTrigger.dispatchEvent("touchmove");
    } else {
      await page.mouse.wheel(0, -600);
    }
    await expect(first.getByRole("group", { name: "Ações do plantão" })).toBeHidden();
  });

  test("resumo e lista de plantoes seguem os pagamentos vinculados e a navegacao mensal", async ({ page }, testInfo) => {
    await mockPaymentLayout(page);
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    const calendarColor = await page.getByRole("button", { name: "14/09/2026", exact: true })
      .locator(".day-dots i").evaluate((element) => getComputedStyle(element).backgroundColor);
    await page.goto("/#/shifts");
    const rows = page.locator(".ledger-row");
    await expect(rows).toHaveCount(3);
    for (const row of await rows.all()) {
      await expect(row.locator(".ledger-accent")).toHaveCSS("background-color", calendarColor);
    }
    await expect(rows.locator(".payment-badge")).toHaveText(["Pago", "Não pago", "Não pago"]);
    await expect(page.locator(".shift-date-head strong")).toHaveText(["12 de set de 2026", "14 de set de 2026", "15 de set de 2026"]);
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
    await expect(page.locator(".payment-summary dd")).toHaveText([/R\$\s*500,00/, /R\$\s*1.000,00/]);
    await page.screenshot({ path: testInfo.outputPath("plantoes-referencia.png"), fullPage: true });
    await page.getByRole("button", { name: "Próximo mês do período" }).click();
    await expect(rows).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Outubro 2026" })).toBeVisible();
    await page.getByRole("button", { name: "Mês atual do período" }).click();
    await expect(rows).toHaveCount(3);
  });

  test("recebimentos agrupados preservam confirmacao e atualizam o selo no calendario", async ({ page, isMobile }, testInfo) => {
    await mockPaymentLayout(page);
    if (isMobile) await page.setViewportSize({ width: 320, height: 720 });
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.goto("/#/finance");
    const rows = page.locator("[data-entry-type=receivable]");
    await expect(rows).toHaveCount(3);
    await expect(rows.locator(".payment-badge")).toHaveText(["Pago", "Atrasado", "Pendente"]);
    await expectFinancialColors(page);
    await expect(page.locator(".payment-summary dd")).toHaveText([/R\$\s*500,00/, /R\$\s*500,00/, /R\$\s*500,00/]);
    // A tela mantém todos os períodos até o usuário selecionar um mês.
    await expect(page.getByRole("heading", { name: "Todos os períodos" })).toBeVisible();
    await page.getByRole("button", { name: "Mês atual do período" }).click();
    await expect(page.getByRole("heading", { name: "Setembro 2026" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("recebimentos-referencia.png"), fullPage: true });
    const row = rows.nth(1);
    await row.locator(".ledger-trigger").click();
    await row.getByRole("button", { name: "Marcar recebido" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Confirmar recebimento" })).toBeVisible();
    const submitted = page.waitForRequest((request) => request.url().endsWith("/layout-receipt-14/mark-paid"));
    await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
    expect((await submitted).postDataJSON()).toMatchObject({ received_date: "2026-09-15", payment_method: "pix" });
    await expect(dialog).toBeHidden();
    await expect(row).toHaveAttribute("data-payment-state", "paid");
    await expectFinancialColors(page);
    await expect(page.locator(".payment-summary dd")).toHaveText([/R\$\s*1.000,00/, /R\$\s*500,00/, /R\$\s*0,00/]);
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "67");
    await page.goto("/#/");
    await page.getByRole("button", { name: "14/09/2026", exact: true }).click();
    await expect(page.locator(".day-detail .ledger-row")).toHaveAttribute("data-payment-state", "paid");
  });

  test("recebimentos avulsos usam cores financeiras e filtros distintos em temas claro e escuro", async ({ page, isMobile }, testInfo) => {
    await mockPaymentLayout(page, { standaloneReceivables: true });
    if (isMobile) await page.setViewportSize({ width: 320, height: 720 });
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.goto("/#/finance");
    const rows = page.locator("[data-entry-type=receivable]");
    await expect(rows).toHaveCount(3);
    await expect(page.getByRole("group", { name: "Cores dos recebimentos" })).toHaveText(/Pago.*Pendente.*Atrasado/);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      await expect(rows.locator(".payment-badge")).toHaveText(["Pago", "Atrasado", "Pendente"]);
      await expectFinancialColors(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`recebimentos-status-${theme}.png`), fullPage: true });
    }
    await page.locator(".ledger-filters > summary").click();
    for (const [filter, state] of [["Pendentes", "pending"], ["Atrasados", "overdue"], ["Pagos", "paid"]] as const) {
      await page.getByRole("button", { name: filter, exact: true }).click();
      await expect(rows).toHaveCount(1);
      await expect(rows).toHaveAttribute("data-payment-state", state);
    }
    await rows.locator(".ledger-trigger").click();
    await expect(rows.getByRole("button", { name: "Marcar recebido" })).toHaveCount(0);
    await page.getByRole("button", { name: "Todos", exact: true }).click();
    await expect(rows).toHaveCount(3);
  });

  test("falha na consulta financeira nao impede a agenda nem presume pagamento", async ({ page }) => {
    await mockPaymentLayout(page, { failReceivables: true });
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.getByRole("button", { name: "14/09/2026", exact: true }).click();
    const row = page.locator(".day-detail .ledger-row");
    await expect(row).toHaveAttribute("data-payment-state", "unknown");
    await expect(row.locator(".payment-badge")).toHaveText("Não informado");
    await row.locator(".ledger-trigger").click();
    await expect(row.getByRole("button", { name: "Editar plantao" })).toBeVisible();
  });

  for (const screen of [
    { path: "", heading: "Setembro 2026", action: "Plantao", dialog: "Novo plantao" },
    { path: "shifts", heading: "Plantoes", action: "Novo plantao", dialog: "Novo plantao" },
    { path: "finance", heading: "Recebimentos e pendências", action: "Novo recebivel", dialog: "Novo recebivel" },
    { path: "locations", heading: "Locais de trabalho", action: "Novo local", dialog: "Novo local" },
    { path: "expenses", heading: "Despesas pessoais", action: "Nova", dialog: "Nova despesa pessoal" },
    { path: "spaces", heading: "Espacos", action: "Novo espaco", dialog: "Novo espaco" },
    { path: "reports", heading: "Resumo por local", action: null, dialog: null },
  ]) {
    test(`layout compacto: ${screen.path || "calendario"} preserva dados e acoes`, async ({ page, isMobile }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/dashboard/bootstrap", (route) => route.fulfill({ json: { data: layoutBootstrap } }));
      if (isMobile) await page.setViewportSize({ width: 320, height: 720 });
      await login(page, mockedUser);
      await expect(page.locator(".calendar-grid")).toBeVisible();
      await page.goto(`/#/${screen.path}`);
      await expect(page.getByRole("heading", { name: screen.heading, exact: true })).toBeVisible();

      if (isMobile) {
        expect((await page.locator(".topbar").boundingBox())!.height).toBeLessThanOrEqual(64);
        const overflow = await page.evaluate(() => [...document.querySelectorAll(
          ".workspace > section, .workspace .field, .table-row, .entity-card, .ledger-row, .date-input",
        )].filter((element) => element.getBoundingClientRect().width > 0).some((element) => {
          const box = element.getBoundingClientRect();
          return box.left < -1 || box.right > window.innerWidth + 1;
        }));
        expect(overflow).toBe(false);
      }

      if (screen.path === "finance") {
        await expect(page.locator("[data-entry-type=receivable]")).toHaveCount(2);
        await page.locator(".ledger-filters > summary").click();
        if (isMobile) expect((await page.locator(".finance-filter-panel").boundingBox())!.height).toBeLessThan(280);
        await page.getByRole("button", { name: "Pagos", exact: true }).click();
        await expect(page.locator("[data-entry-type=receivable]")).toHaveCount(1);
        await expect(page.getByText("Recebimento avulso de demonstracao", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Limpar", exact: true }).click();
        await page.locator(".finance-advanced-filters > summary").click();
        const from = page.getByRole("textbox", { name: "De", exact: true });
        const to = page.getByRole("textbox", { name: "Até", exact: true });
        await from.fill("01/09/2026");
        await to.fill("15/09/2026");
        await expect(page.locator("[data-entry-type=receivable]")).toHaveCount(1);
        if (isMobile) expect((await from.boundingBox())!.y).toBeCloseTo((await to.boundingBox())!.y, 0);
        await page.getByRole("button", { name: "Limpar", exact: true }).click();
        await page.locator(".finance-advanced-filters > summary").click();
        await expect(page.locator("[data-entry-type=receivable]")).toHaveCount(2);
      }

      await page.screenshot({ path: testInfo.outputPath(`${screen.path || "calendario"}.png`), fullPage: true });
      if (screen.action) {
        await page.locator(".workspace").getByRole("button", { name: screen.action, exact: true }).first().click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByRole("heading", { name: screen.dialog!, exact: true })).toBeVisible();
        expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
        await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
        await expect(dialog).toBeHidden();
      }
      expect(errors).toEqual([]);
    });
  }

  test("layout compacto preserva tema escuro, carregamento, estado vazio e erro", async ({ page, isMobile }, testInfo) => {
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    if (isMobile) await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    await page.getByRole("button", { name: "Tema escuro", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    if (isMobile) await page.getByRole("complementary", { name: "Menu mobile" }).getByRole("button", { name: "Fechar menu", exact: true }).click();

    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/dashboard/bootstrap", async (route) => {
      await pending;
      await route.fulfill({ json: { data: bootstrap } });
    });
    await page.goto("/#/finance");
    await expect(page.getByText("Carregando dados...", { exact: true })).toBeVisible();
    release();
    await expect(page.getByText("Sem recebiveis", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("finance-empty-dark.png"), fullPage: true });

    await page.route("**/api/dashboard/bootstrap", (route) => route.fulfill({ status: 503, json: { error: { message: "Falha simulada de carregamento" } } }));
    await page.reload();
    await expect(page.getByText("Algo saiu do esperado", { exact: true })).toBeVisible();
    await expect(page.getByText("Falha simulada de carregamento", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("finance-error-dark.png"), fullPage: true });
  });

  test("abas Guidelines e Assistente IA ficam inativas nos menus", async ({ page, isMobile }) => {
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });

    if (isMobile) {
      await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    }

    await expect(page.getByRole("link", { name: "Guidelines", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Assistente IA", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Painel", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Plantoes", exact: true })).toBeVisible();
  });

  for (const path of ["ai", "guidelines"]) {
    test(`acesso direto a ${path} redireciona ao painel sem chamar a assistente`, async ({ page }) => {
      let aiRequests = 0;
      page.on("request", (request) => {
        if (new URL(request.url()).pathname.startsWith("/api/ai")) aiRequests++;
      });
      await login(page, mockedUser);
      await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });

      await page.goto(`/#/${path}`);
      await expect(page).toHaveURL(/\/#\/$/);
      await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });
      await expect(page.getByLabel("Pergunta")).toHaveCount(0);
      await expect(page.getByLabel("Buscar guideline")).toHaveCount(0);
      expect(aiRequests).toBe(0);
    });
  }
});

const realAuthUsers = process.env.E2E_REAL_AUTH === "true" ? usersFromEnv() : [];

for (const user of realAuthUsers) {
  test.describe(`Login E2E real - ${user.email}`, () => {
    test("faz login e chega ao painel (desktop e mobile)", async ({ page }) => {
      await login(page, user);

      await expect(page).not.toHaveURL(/#\/login/);
      await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });
    });

    test("lista de plantoes aparece agrupada por unidade e data", async ({ page }) => {
      await login(page, user);
      await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });

      await page.goto("/#/shifts");

      // Espera até a página carregar E mostrar um dos dois estados possíveis
      // (lista com plantoes OU estado vazio), evitando corrida na checagem.
      const emptyState = page.getByText("Sem plantoes");
      const firstGroup = page.locator(".shift-date-head").first();

      await expect(emptyState.or(firstGroup)).toBeVisible({ timeout: 30000 });

      if (await emptyState.isVisible()) {
        test.skip();
      }

      await expect(firstGroup).toBeVisible({ timeout: 30000 });
      await expect(firstGroup.locator("strong")).toBeVisible({ timeout: 30000 });
    });
  });
}
