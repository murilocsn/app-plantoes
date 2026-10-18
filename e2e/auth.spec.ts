import type { AppBootstrap, Location, Shift } from "@financplantoes/shared";
import { expect, test, type Page } from "@playwright/test";

type TestUser = { email: string; label: string; password: string };

const mockedUser: TestUser = {
  email: "teste@example.test",
  label: "usuario mockado",
  password: "test-password",
};

const mockedAuthUser = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: mockedUser.email,
  user_metadata: { full_name: "Usuario de teste" },
  app_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
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
        user: mockedAuthUser,
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

  test("perfil exige login antes de exibir dados da conta", async ({ page }) => {
    await page.goto("/#/profile");
    await expect(page).toHaveURL(/#\/login$/);
    await expect(page.getByRole("heading", { name: "Entrar na conta", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Meu perfil", exact: true })).toHaveCount(0);
  });

  test("perfil fica acessivel no menu e preserva layout compacto e tema escuro", async ({ page, isMobile }, testInfo) => {
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    if (isMobile) await page.getByRole("button", { name: "Menu", exact: true }).click();
    const menu = page.getByRole("navigation", { name: isMobile ? "Navegacao principal mobile" : "Navegacao principal", exact: true });
    await expect(menu.getByRole("link").first()).toHaveText("Meu perfil");
    await menu.getByRole("link", { name: "Meu perfil", exact: true }).click();
    await expect(page).toHaveURL(/#\/profile$/);
    await expect(page.getByRole("heading", { name: "Meu perfil", exact: true })).toBeVisible();
    await expect(page.locator('input[autocomplete="username"]')).toHaveValue(mockedUser.email);
    await expect(page.getByLabel("Nome de exibição")).toHaveValue("Usuario de teste");
    await expect(page.getByLabel("Novo e-mail")).toHaveValue(mockedUser.email);
    await expect(page.getByRole("button", { name: "Salvar nome", exact: true })).toBeDisabled();
    if (isMobile) await page.getByRole("button", { name: "Menu", exact: true }).click();
    const theme = page.getByRole("button", { name: "Tema escuro", exact: true }).filter({ visible: true });
    await theme.click();
    if (isMobile) await page.getByRole("button", { name: "Fechar menu", exact: true }).last().click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    if (isMobile) await page.setViewportSize({ width: 320, height: 568 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("perfil-compacto.png"), fullPage: true });
  });

  test("perfil salva somente o nome e atualiza a saudacao e a sessao persistida", async ({ page }) => {
    let updates = 0;
    await page.route("**/auth/v1/user", async (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      updates++;
      expect(route.request().postDataJSON()).toEqual({ code_challenge: null, code_challenge_method: null, data: { full_name: "Marina de Teste" } });
      return route.fulfill({ json: { ...mockedAuthUser, user_metadata: { full_name: "Marina de Teste" } } });
    });
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.goto("/#/profile");
    await page.getByLabel("Nome de exibição").fill("  Marina de Teste  ");
    await page.getByRole("button", { name: "Salvar nome", exact: true }).click();
    await expect(page.locator(".profile-page").getByRole("status")).toHaveText("Nome atualizado.");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Marina");
    await page.reload();
    await expect(page.getByLabel("Nome de exibição")).toHaveValue("Marina de Teste");
    expect(updates).toBe(1);
  });

  test("perfil solicita troca de email sem antecipar confirmacao ou alterar outros dados", async ({ page }) => {
    await page.route("**/auth/v1/user?*", async (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      expect(route.request().postDataJSON()).toEqual({ code_challenge: null, code_challenge_method: null, email: "novo@example.test" });
      expect(new URL(route.request().url()).searchParams.get("redirect_to")).toBe(new URL("/", page.url()).href);
      return route.fulfill({ json: { ...mockedAuthUser, new_email: "novo@example.test" } });
    });
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.goto("/#/profile");
    await page.getByLabel("Novo e-mail").fill("novo@example.test");
    await page.getByRole("button", { name: "Solicitar alteração de e-mail", exact: true }).click();
    await expect(page.locator(".profile-page").getByRole("status")).toContainText("Confira seus e-mails");
    await expect(page.locator(".topbar-copy")).toContainText(mockedUser.email);
    await expect(page.locator(".profile-summary")).toContainText("aguardando confirmação");
  });

  test("perfil so informa email atualizado quando o Auth confirma o novo endereco", async ({ page }) => {
    await page.route("**/auth/v1/user?*", async (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      return route.fulfill({ json: { ...mockedAuthUser, email: "novo@example.test" } });
    });
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.goto("/#/profile");
    await page.getByLabel("Novo e-mail").fill("Novo@example.test");
    await page.getByRole("button", { name: "Solicitar alteração de e-mail", exact: true }).click();
    await expect(page.locator(".profile-page").getByRole("status")).toHaveText("E-mail atualizado.");
    await expect(page.locator(".topbar-copy")).toContainText("novo@example.test");
    await expect(page.locator(".profile-summary")).not.toContainText("aguardando confirmação");
  });

  test("perfil valida dados antes de enviar alteracoes de conta", async ({ page }) => {
    let updates = 0;
    let verifications = 0;
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.route("**/auth/v1/user*", async (route) => { updates++; return route.abort(); });
    await page.route("**/auth/v1/token?*", async (route) => { verifications++; return route.abort(); });
    await page.goto("/#/profile");
    await page.getByLabel("Nome de exibição").fill(" ");
    await page.getByRole("button", { name: "Salvar nome", exact: true }).click();
    await expect(page.getByText("Informe pelo menos 2 caracteres.", { exact: true })).toBeVisible();
    await page.getByLabel("Novo e-mail").fill("invalid-address");
    await page.getByRole("button", { name: "Solicitar alteração de e-mail", exact: true }).click();
    await expect(page.getByText("Informe um e-mail válido.", { exact: true })).toBeVisible();
    await page.getByLabel("Senha atual", { exact: true }).fill(mockedUser.password);
    await page.getByLabel("Nova senha", { exact: true }).fill("New test password 42!");
    await page.getByLabel("Confirmar nova senha", { exact: true }).fill("Different test password");
    await page.getByRole("button", { name: "Alterar senha", exact: true }).click();
    await expect(page.getByText("As senhas precisam ser iguais.", { exact: true })).toBeVisible();
    expect(updates).toBe(0);
    expect(verifications).toBe(0);
  });

  test("perfil verifica senha atual antes da troca e limpa campos secretos apos sucesso", async ({ page }) => {
    let verifications = 0;
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.route("**/auth/v1/token?*", async (route) => {
      expect(route.request().postDataJSON().password).toBe(mockedUser.password);
      verifications++;
      return route.fallback();
    });
    await page.route("**/auth/v1/user", async (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      expect(verifications).toBe(1);
      expect(route.request().postDataJSON()).toEqual({ code_challenge: null, code_challenge_method: null, password: "New test password 42!", current_password: mockedUser.password });
      return route.fulfill({ json: mockedAuthUser });
    });
    await page.goto("/#/profile");
    await page.getByLabel("Senha atual", { exact: true }).fill(mockedUser.password);
    await page.getByLabel("Nova senha", { exact: true }).fill("New test password 42!");
    await page.getByLabel("Confirmar nova senha", { exact: true }).fill("New test password 42!");
    await page.getByRole("button", { name: "Alterar senha", exact: true }).click();
    await expect(page.locator(".profile-page").getByRole("status")).toContainText("Senha alterada.");
    for (const input of await page.locator('input[type="password"]').all()) await expect(input).toHaveValue("");
    expect(verifications).toBe(1);
  });

  test("perfil bloqueia troca com senha atual incorreta e permite tentar novamente", async ({ page }) => {
    let updates = 0;
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.route("**/auth/v1/token?*", (route) => route.fulfill({ status: 400, headers: { "X-Supabase-Api-Version": "2024-01-01", "Access-Control-Expose-Headers": "X-Supabase-Api-Version" }, json: { code: "invalid_credentials", msg: "Invalid login credentials" } }));
    await page.route("**/auth/v1/user", async (route) => { updates++; return route.abort(); });
    await page.goto("/#/profile");
    await page.getByLabel("Senha atual", { exact: true }).fill("Wrong test password");
    await page.getByLabel("Nova senha", { exact: true }).fill("New test password 42!");
    await page.getByLabel("Confirmar nova senha", { exact: true }).fill("New test password 42!");
    await page.getByRole("button", { name: "Alterar senha", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("senha atual está incorreta");
    for (const input of await page.locator('input[type="password"]').all()) await expect(input).toHaveValue("");
    expect(updates).toBe(0);
    await expect(page.getByLabel("Senha atual", { exact: true })).toBeEnabled();
  });

  test("perfil informa falha sem mostrar mensagens privadas ou confirmar sucesso", async ({ page }) => {
    await page.route("**/auth/v1/user", (route) => route.fulfill({ status: 500, json: { code: "unexpected_failure", msg: "PRIVATE_TOKEN PRIVATE_EMAIL@example.test" } }));
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.goto("/#/profile");
    await page.getByLabel("Nome de exibição").fill("Nome de teste");
    await page.getByRole("button", { name: "Salvar nome", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("Não foi possível salvar a alteração. Tente novamente em alguns instantes.");
    await expect(page.locator(".profile-page").getByRole("status")).toHaveCount(0);
    await expect(page.getByText(/PRIVATE_/)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Usuario");
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

  test("atalhos inferiores navegam entre calendario, plantoes e faturamento no celular", async ({ page, isMobile }) => {
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });
    const navigation = page.getByRole("navigation", { name: "Navegação inferior" });

    if (!isMobile) {
      await expect(navigation).toBeHidden();
      const sidebar = page.getByRole("navigation", { name: "Navegacao principal", exact: true });
      await expect(sidebar).toBeVisible();
      await sidebar.getByRole("link", { name: "Faturamento", exact: true }).click();
      await expect(page).toHaveURL(/#\/finance$/);
      await expect(page.getByRole("heading", { name: "Faturamento e pendências", exact: true })).toBeVisible();
      return;
    }

    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("link")).toHaveText(["Calendário", "Plantões", "Faturamento"]);
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

    await navigation.getByRole("link", { name: "Faturamento", exact: true }).click();
    await expect(page).toHaveURL(/#\/finance$/);
    await expect(page.getByRole("heading", { name: "Faturamento e pendências", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Faturamento", exact: true })).toHaveAttribute("aria-current", "page");
    await newShift.click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Novo plantao", exact: true })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();

    await navigation.getByRole("link", { name: "Calendário", exact: true }).click();
    await expect(page).toHaveURL(/\/#\/$/);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await navigation.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(page.getByRole("complementary", { name: "Menu mobile" })).toBeVisible();
    const mobileMenu = page.getByRole("navigation", { name: "Navegacao principal mobile" });
    await expect(mobileMenu).toBeVisible();
    await mobileMenu.getByRole("link", { name: "Faturamento", exact: true }).click();
    await expect(page.getByRole("complementary", { name: "Menu mobile" })).toBeHidden();
    await expect(page.getByRole("heading", { name: "Faturamento e pendências", exact: true })).toBeVisible();
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

  test("menu de acoes preserva foco interno e fecha ao navegar para fora pelo teclado", async ({ page }) => {
    await mockPaymentLayout(page);
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.getByRole("button", { name: "14/09/2026", exact: true }).click();
    const row = page.locator(".day-detail .ledger-row");
    const trigger = row.locator(".ledger-trigger");
    const panel = row.getByRole("group", { name: "Ações do plantão" });

    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "Editar plantao" }).focus();
    await expect(panel).toBeVisible();
    await page.getByRole("button", { name: "Mes anterior", exact: true }).focus();
    await expect(panel).toBeHidden();

    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(panel).toBeVisible();
    for (let index = 0; index < 3; index++) await page.keyboard.press("Tab");
    await expect(panel).toBeHidden();
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

  test("faturamento agrupa unidade e referencia sem esconder datas individuais", async ({ page, isMobile }, testInfo) => {
    const unit = { ...location, reference_start_day: 26, reference_end_day: 25 };
    const data: AppBootstrap = {
      ...bootstrap,
      locations: [unit, { ...unit, id: "other-unit", name: "Outra unidade" }],
      shifts: [
        { ...shifts[0], id: "first", date: "2026-08-26", value: 500 },
        { ...shifts[0], id: "last", date: "2026-09-25", value: 500 },
        { ...shifts[0], id: "next", date: "2026-09-26", value: 500 },
        { ...shifts[0], id: "other", date: "2026-09-12", location_id: "other-unit", location_name: "Outra unidade", value: 500 },
      ],
      receivables: [
        { id: "first", shift_id: "first", location_id: location.id, description: "Primeiro plantao", amount: 500, expected_date: "2026-10-10", status: "pending" },
        { id: "last", shift_id: "last", location_id: location.id, description: "Ultimo plantao", amount: 500, expected_date: "2026-10-10", status: "pending" },
        { id: "next", shift_id: "next", location_id: location.id, description: "Ciclo seguinte", amount: 500, expected_date: "2026-11-10", status: "pending" },
        { id: "other", shift_id: "other", location_id: "other-unit", description: "Outra unidade", amount: 500, expected_date: "2026-10-10", status: "pending" },
      ],
    };
    await page.clock.setFixedTime(new Date("2026-10-15T12:00:00Z"));
    await page.route("**/api/dashboard/bootstrap", route => route.fulfill({ json: { data } }));
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    if (isMobile) await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/#/finance");
    await expect(page.locator(".finance-invoice")).toHaveCount(2);
    const invoice = page.getByRole("region", { name: `Faturamento ${location.name}`, exact: true });
    await expect(invoice.locator(".ledger-row")).toHaveCount(2);
    await expect(invoice.locator(".ledger-date")).toHaveText(["Plantão em 26/08/2026", "Plantão em 25/09/2026"]);
    await expect(invoice).toContainText("26/08/2026 a 25/09/2026");
    await expect(invoice.locator(".finance-invoice-head strong")).toHaveText(/R\$\s*1.000,00/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("faturamento-unidade-referencia.png"), fullPage: true });
    await page.getByRole("button", { name: "Próximo mês do período" }).click();
    await expect(page.locator(".ledger-date")).toHaveText(["Plantão em 26/09/2026"]);
  });

  test.describe("receber faturamento", () => {
    test.use({ timezoneId: "America/Sao_Paulo" });

    for (const failFirstAttempt of [false, true]) {
      test(failFirstAttempt ? "mantem pendencias no erro e permite tentar novamente" : "confirma o grupo inteiro e preserva outros faturamentos", async ({ page, isMobile }, testInfo) => {
        const unit = { ...location, reference_end_day: 31 };
        const data: AppBootstrap = {
          ...bootstrap,
          locations: [unit, { ...unit, id: "other-unit", name: "Outra unidade" }],
          shifts: ["first", "second", "paid", "cancelled", "other", "next"].map((id, index) => ({
            ...shifts[0], id, date: id === "next" ? "2026-09-01" : `2026-08-${String(index + 1).padStart(2, "0")}`,
            location_id: id === "other" ? "other-unit" : unit.id,
            location_name: id === "other" ? "Outra unidade" : unit.name, value: 500,
          })),
          receivables: ["first", "second", "paid", "cancelled", "other", "next"].map(id => ({
            id, shift_id: id, location_id: id === "other" ? "other-unit" : unit.id,
            description: id === "first" ? "Primeiro plantao" : id, amount: 500, expected_date: "2026-09-10",
            status: id === "paid" ? "received" : id === "cancelled" ? "cancelled" : "pending",
            received_date: id === "paid" ? "2026-08-01" : null, payment_method: id === "paid" ? "cash" : null,
          })),
        };
        const originalPaid = JSON.stringify(data.receivables.find(item => item.id === "paid"));
        const submissions: Array<{ ids: string[]; received_date: string; payment_method: string }> = [];
        let releasePayment: () => void = () => undefined;
        const paymentReleased = new Promise<void>(resolve => { releasePayment = resolve; });
        await page.clock.setFixedTime(new Date("2026-09-15T01:30:00Z"));
        await page.route("**/api/dashboard/bootstrap", route => route.fulfill({ json: { data } }));
        await page.route("**/api/receivables/mark-paid", async route => {
          const payload = route.request().postDataJSON();
          submissions.push(payload);
          if (failFirstAttempt && submissions.length === 1) return route.fulfill({ status: 503, json: { error: { message: "Falha simulada ao registrar o faturamento" } } });
          await paymentReleased;
          const updated = data.receivables.filter(item => payload.ids.includes(item.id) && item.status === "pending");
          for (const item of updated) Object.assign(item, { status: "received", received_date: payload.received_date, payment_method: payload.payment_method });
          return route.fulfill({ json: { data: updated } });
        });
        await login(page, mockedUser);
        await expect(page).toHaveURL(/#\/$/);
        if (isMobile) await page.setViewportSize({ width: 320, height: 720 });
        await page.goto("/#/finance");
        await page.locator(".ledger-filters > summary").click();
        await page.getByPlaceholder("Descricao ou unidade").fill("Primeiro");
        const invoice = page.getByRole("region", { name: `Faturamento ${unit.name}`, exact: true });
        await expect(invoice.locator(".ledger-row")).toHaveCount(1);
        await expect(invoice).toContainText("1 de 4 lançamentos visíveis");
        await invoice.getByRole("button", { name: "Receber faturamento", exact: true }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByRole("heading", { name: "Receber faturamento" })).toBeVisible();
        await expect(dialog).toContainText("2 recebimentos pendentes");
        await expect(dialog.locator(".bulk-payment-summary")).toContainText(/Total a registrar: R\$\s*1.000,00/);
        await expect(dialog.getByRole("list", { name: "Itens em aberto do faturamento" }).getByRole("listitem")).toHaveCount(2);
        await expect(dialog.getByLabel("Data recebida")).toHaveValue("2026-09-14");
        expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath("receber-faturamento.png"), fullPage: true });
        await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
        await expect(dialog).toBeHidden();
        expect(submissions).toHaveLength(0);
        await invoice.getByRole("button", { name: "Receber faturamento", exact: true }).click();
        if (failFirstAttempt) {
          await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
          await expect(dialog.getByRole("alert")).toHaveText("Falha simulada ao registrar o faturamento");
          await expect(invoice.locator(".ledger-row")).toHaveAttribute("data-payment-state", "overdue");
        }
        const sent = page.waitForRequest(request => request.url().endsWith("/api/receivables/mark-paid") && request.method() === "POST");
        await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
        const payload = (await sent).postDataJSON();
        expect([...payload.ids].sort()).toEqual(["first", "second"]);
        expect(payload).toMatchObject({ received_date: "2026-09-14", payment_method: "pix" });
        await expect(dialog.getByRole("button", { name: "Confirmar", exact: true })).toBeDisabled();
        await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
        await expect(dialog).toBeVisible();
        releasePayment();
        await expect(dialog).toBeHidden();
        await expect(invoice.getByRole("button", { name: "Receber faturamento", exact: true })).toHaveCount(0);
        expect(submissions).toHaveLength(failFirstAttempt ? 2 : 1);
        expect(JSON.stringify(data.receivables.find(item => item.id === "paid"))).toBe(originalPaid);
        await page.getByPlaceholder("Descricao ou unidade").fill("");
        await expect(page.locator('.ledger-row[data-payment-state="paid"]')).toHaveCount(3);
        await expect(page.locator('.ledger-row[data-payment-state="cancelled"]')).toHaveCount(1);
        await expect(page.locator('.ledger-row[data-payment-state="overdue"]')).toHaveCount(2);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      });
    }
  });

  test("resumo mensal separa producao, recebimento e despesas sem acumular historico", async ({ page }) => {
    const data: AppBootstrap = {
      ...layoutBootstrap,
      shifts: [...shifts, { ...shifts[0], id: "previous", date: "2026-08-15", value: 9000 }],
      receivables: [
        { id: "actual", description: "Recebido em setembro", amount: 200, expected_date: "2026-08-10", received_date: "2026-09-05", status: "received" },
        { id: "later", description: "Recebido em outubro", amount: 800, expected_date: "2026-09-10", received_date: "2026-10-01", status: "received" },
      ],
      personalExpenses: [...layoutBootstrap.personalExpenses, { id: "old", description: "Despesa antiga", amount: 9000, expense_date: "2026-08-15" }],
    };
    await page.route("**/api/dashboard/bootstrap", route => route.fulfill({ json: { data } }));
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.goto("/#/reports");
    await expect(page.locator(".reports-summary .stat-card > strong")).toHaveText([/R\$\s*1.500,00/, "12 h", /R\$\s*125,00/]);
    await page.locator(".reports-finance > summary").click();
    await expect(page.locator(".reports-cash-totals dd")).toHaveText([/R\$\s*200,00/, /R\$\s*520,00/]);
    await page.getByRole("button", { name: "Mês anterior dos relatórios" }).click();
    await expect(page.locator(".reports-summary .stat-card > strong")).toHaveText([/R\$\s*9.000,00/, "12 h", /R\$\s*750,00/]);
    await expect(page.locator(".reports-cash-totals dd")).toHaveText([/R\$\s*0,00/, /R\$\s*9.000,00/]);
    await page.goto("/#/expenses");
    await expect(page.locator(".stat-grid .stat-card > strong")).toHaveText([/R\$\s*320,00/, /R\$\s*200,00/]);
    await expect(page.getByText("Despesa antiga", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Mês anterior das despesas" }).click();
    await expect(page.getByText("Despesa antiga", { exact: true })).toBeVisible();
    await expect(page.locator(".stat-grid .stat-card > strong")).toHaveText([/R\$\s*9.000,00/, /R\$\s*0,00/]);
  });

  test.describe("relatorios comparativos", () => {
    const reportLocations: Location[] = [
      { ...location, id: "report-a", name: "CASA DE SAUDE STELLA MARIS (CSSM) - Unidade de demonstracao" },
      { ...location, id: "report-b", name: "Unidade Beta" },
      { ...location, id: "report-c", name: "Unidade Gama" },
      { ...location, id: "report-empty", name: "Local sem plantoes" },
    ];
    const makeShift = (unit: Location, day: number, duration: number, value: number): Shift => ({
      id: `${unit.id}-${day}`, date: `2026-10-${String(day).padStart(2, "0")}`, location_id: unit.id,
      location_name: unit.name, duration, value, start_time: "07:00",
    });
    const data: AppBootstrap = {
      ...bootstrap,
      locations: reportLocations,
      shifts: [
        ...[3, 8, 15, 26].map(day => makeShift(reportLocations[0]!, day, 12, 720)),
        ...[5, 12, 24].map(day => makeShift(reportLocations[1]!, day, 12, 900)),
        ...[9, 20].map(day => makeShift(reportLocations[2]!, day, 6, 300)),
        { ...makeShift(reportLocations[0]!, 15, 10, 1000), id: "report-previous", date: "2026-09-15" },
        { ...makeShift(reportLocations[0]!, 15, 10, 2000), id: "report-next", date: "2026-11-15" },
      ],
    };

    test.beforeEach(async ({ page, isMobile }) => {
      await page.clock.setFixedTime(new Date("2026-10-15T12:00:00Z"));
      await page.route("**/api/dashboard/bootstrap", route => route.fulfill({ json: { data } }));
      await login(page, mockedUser);
      await expect(page).toHaveURL(/#\/$/);
      if (isMobile) await page.setViewportSize({ width: 320, height: 720 });
      await page.goto("/#/reports");
      await expect(page.getByRole("heading", { name: "Comparativo por local", exact: true })).toBeVisible();
    });

    test("compara valores e horas, expande locais e exporta o periodo filtrado", async ({ page }, testInfo) => {
      const cards = page.locator(".reports-summary .stat-card > strong");
      await expect(cards).toHaveText([/R\$\s*6.180,00/, "96 h", /R\$\s*64,38/]);
      await expect(page.locator(".reports-scope")).toContainText("9 plantões · 3 locais");
      await expect(page.locator(".report-location")).toHaveCount(3);
      await expect(page.locator(".report-place small").first()).toHaveText("46,6% do valor previsto");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("relatorios-comparativo.png"), fullPage: true });
      await page.getByRole("combobox", { name: "Ordenar por", exact: true }).selectOption("hourly");
      const first = page.locator(".report-location").first();
      await expect(first.locator(".report-place strong")).toHaveText("Unidade Beta");
      await first.locator("summary").press("Enter");
      await expect(first).toHaveAttribute("open", "");
      await expect(first.locator(".report-shift-details li")).toHaveCount(3);
      await expect(first.locator(".report-shift-date")).toHaveText(["05/10/2026", "12/10/2026", "24/10/2026"]);
      await page.getByRole("combobox", { name: "Local", exact: true }).selectOption("report-b");
      await expect(cards).toHaveText([/R\$\s*2.700,00/, "36 h", /R\$\s*75,00/]);
      await page.getByRole("combobox", { name: "Local", exact: true }).selectOption("");
      await page.getByRole("combobox", { name: "Período dos plantões", exact: true }).selectOption("2026-09");
      await expect(cards).toHaveText([/R\$\s*1.000,00/, "10 h", /R\$\s*100,00/]);
      await page.getByRole("button", { name: "Mês atual dos relatórios", exact: true }).click();
      await expect(cards.first()).toHaveText(/R\$\s*6.180,00/);
      await page.getByRole("combobox", { name: "Local", exact: true }).selectOption("report-b");
      await page.getByRole("combobox", { name: "Período dos plantões", exact: true }).selectOption("custom");
      await page.getByRole("textbox", { name: "De", exact: true }).fill("01/10/2026");
      await page.getByRole("textbox", { name: "Até", exact: true }).fill("15/10/2026");
      await expect(cards).toHaveText([/R\$\s*1.800,00/, "24 h", /R\$\s*75,00/]);
      await page.route("**/api/reports/export.csv*", route => route.fulfill({ contentType: "text/csv", body: 'Tipo;Data;Descricao;Valor;Status\nPlantao;2026-10-05;Unidade Beta;900;' }));
      const outgoing = page.waitForRequest(request => new URL(request.url()).pathname === "/api/reports/export.csv");
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
      const query = new URL((await outgoing).url()).searchParams;
      expect(Object.fromEntries(query)).toEqual({ from: "2026-10-01", to: "2026-10-15", location_id: "report-b" });
      expect((await download).suggestedFilename()).toMatch(/^financplantoes-.*\.csv$/);
    });

    test("mantem estados vazios, valida as datas e informa falhas de exportacao", async ({ page }, testInfo) => {
      await page.getByRole("combobox", { name: "Local", exact: true }).selectOption("report-empty");
      await expect(page.getByText("Sem plantões no período", { exact: true })).toBeVisible();
      await expect(page.locator(".reports-summary .stat-card > strong")).toHaveText([/R\$\s*0,00/, "0 h", "—"]);
      await page.getByRole("combobox", { name: "Período dos plantões", exact: true }).selectOption("custom");
      for (const invalidDate of ["31/02/2026", "2026-1-1"]) {
        await page.getByRole("textbox", { name: "De", exact: true }).fill(invalidDate);
        await expect(page.getByRole("alert")).toHaveText("Informe datas válidas para o início e o fim do período.");
        await expect(page.getByRole("button", { name: "Exportar CSV", exact: true })).toBeDisabled();
        await expect(page.locator(".reports-summary")).toHaveCount(0);
      }
      await page.getByRole("button", { name: "Mês atual dos relatórios", exact: true }).click();
      await page.getByRole("combobox", { name: "Local", exact: true }).selectOption("");
      await page.route("**/api/reports/export.csv*", route => route.fulfill({ status: 503, json: { error: { message: "Synthetic export failure" } } }));
      await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText("baixar o arquivo");
      await expect(page.getByRole("button", { name: "Exportar CSV", exact: true })).toBeEnabled();
      await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("relatorios-escuro.png"), fullPage: true, animations: "disabled" });
    });
  });

  test("faturamento explica mes seguinte e inclui o mes inteiro por padrao", async ({ page }) => {
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.goto("/#/locations");
    await page.getByRole("button", { name: "Novo local", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Dia de fechamento da referência")).toHaveValue("31");
    await expect(dialog.getByRole("combobox", { name: "Em qual mês a empresa costuma pagar?" })).toHaveValue("1");
    await expect(dialog).toContainText("No mês seguinte ao fechamento");
    await expect(dialog).toContainText("26/08 a 25/09");
    await expect(dialog).toContainText("Não é uma contagem de 30 dias");
    await page.route("**/api/locations", route => route.fulfill({ json: { data: { ...location, ...route.request().postDataJSON() } } }));
    await dialog.getByLabel("Nome do local").fill("Nova unidade");
    const saved = page.waitForRequest(request => request.method() === "POST" && request.url().endsWith("/api/locations"));
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    expect((await saved).postDataJSON()).toMatchObject({ reference_start_day: 1, reference_end_day: 31, payment_due_months_after: 1, payment_due_day: 10 });
    await expect(dialog).toBeHidden();
  });

  test("falha no carregamento de uma aba oferece atualizacao sem tela em branco", async ({ page }) => {
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible();
    await page.route("**/src/pages/ShiftsPage.tsx*", route => route.abort());
    await page.goto("/#/shifts");
    await expect(page.getByRole("heading", { name: "Não foi possível abrir esta tela" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Atualizar aplicativo" })).toBeVisible();
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
    // O periodo inicial e o mes vigente.
    await expect(page.getByRole("heading", { name: "Setembro 2026" })).toBeVisible();
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

  test.describe("despesas compartilhadas por card", () => {
    test.use({ timezoneId: "America/Sao_Paulo" });
    const cardId = "40000000-0000-4000-8000-000000000001";
    const inviteId = "40000000-0000-4000-8000-000000000002";
    const makeData = () => ({ ...structuredClone(bootstrap), personalExpenses: [], sharedExpenses: [], expenseSharing: { available: true, cards: [], invitations: [] } } as AppBootstrap);
    const makeCard = () => ({
      id: cardId, owner_id: mockedAuthUser.id, owner_name: "Usuario de teste", description: "Aluguel da equipe e materiais de atendimento",
      expense_date: "2026-09-09", created_at: "2026-09-09", total_amount: 300.01, amount: 300.01,
      is_owner: true, participant_count: 1, invitations: [],
    });
    const enterExpenses = async (page: Page) => {
      await login(page, mockedUser);
      await expect(page).toHaveURL(/\/#\/$/);
      await page.goto("/#/expenses");
      await expect(page.getByRole("heading", { name: "Despesas pessoais", exact: true })).toBeVisible();
    };
    test("criador salva card, confirma email e define valor individual antes de convidar", async ({ page, isMobile }, testInfo) => {
      if (isMobile) await page.setViewportSize({ width: 320, height: 720 });
      const data = makeData();
      const card = makeCard();
      let sent = 0;
      await page.route("**/api/dashboard/bootstrap", route => route.fulfill({ json: { data } }));
      await page.route("**/api/expenses/cards", async route => {
        expect(route.request().postDataJSON()).toMatchObject({ amount: 300.01, expense_date: "2026-09-09" });
        data.expenseSharing!.cards.push(card);
        data.sharedExpenses.push({ id: cardId, sharing_card_id: cardId, description: card.description, amount: 300.01, expense_date: card.expense_date });
        await route.fulfill({ status: 201, json: { data: { id: cardId } } });
      });
      await page.route(`**/api/expenses/cards/${cardId}/invitations`, async route => {
        sent++;
        expect(route.request().postDataJSON()).toEqual({ email: "guest@example.test", amount: 100.01 });
        data.expenseSharing!.cards[0]!.invitations.push({ id: inviteId, card_id: cardId, invited_email: "guest@example.test", amount: 100.01, status: "pending", created_at: "2026-09-09" });
        await route.fulfill({ status: 201, json: { data: { id: inviteId } } });
      });
      await page.route(`**/api/expenses/invitations/${inviteId}/cancel`, async route => {
        data.expenseSharing!.cards[0]!.invitations[0]!.status = "cancelled";
        await route.fulfill({ json: { data: { id: inviteId } } });
      });
      await enterExpenses(page);
      await page.getByRole("button", { name: "Compartilhar", exact: true }).click();
      const modal = page.getByRole("dialog");
      await modal.getByLabel("Descricao", { exact: true }).fill(card.description);
      await modal.getByLabel("Valor", { exact: true }).fill("300.01");
      await expect(modal.getByLabel("Data", { exact: true })).toHaveValue("2026-09-09");
      await modal.getByRole("button", { name: "Salvar", exact: true }).click();
      const expense = page.getByRole("article", { name: `Despesa compartilhada ${card.description}`, exact: true });
      await expect(expense).toBeVisible();
      await expense.getByRole("button", { name: "Convidar pessoa", exact: true }).click();
      await expect(modal.getByLabel("E-mail do convidado", { exact: true })).toBeFocused();
      await modal.getByRole("button", { name: "Enviar convite", exact: true }).focus();
      await page.keyboard.press("Tab");
      await expect(modal.getByRole("button", { name: "Fechar", exact: true })).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(modal.getByRole("button", { name: "Enviar convite", exact: true })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(modal).toBeHidden();
      await expect(expense.getByRole("button", { name: "Convidar pessoa", exact: true })).toBeFocused();
      await expense.getByRole("button", { name: "Convidar pessoa", exact: true }).click();
      await modal.getByLabel("E-mail do convidado", { exact: true }).fill("guest@example.test");
      await modal.getByLabel("Confirme o e-mail", { exact: true }).fill("wrong@example.test");
      await modal.getByLabel("Valor dessa pessoa", { exact: true }).fill("100.01");
      await modal.getByRole("button", { name: "Enviar convite", exact: true }).click();
      await expect(modal.getByRole("alert")).toContainText("Os e-mails precisam ser iguais");
      expect(sent).toBe(0);
      await modal.getByLabel("Confirme o e-mail", { exact: true }).fill("GUEST@example.test");
      await page.screenshot({ path: testInfo.outputPath("convite-popup.png"), fullPage: true, animations: "disabled" });
      await modal.getByRole("button", { name: "Enviar convite", exact: true }).click();
      await expect(modal).toBeHidden();
      await expense.locator("summary").click();
      await expect(expense).toContainText("Aguardando aceite");
      await expect(expense.locator(".expense-card-share")).toContainText("R$ 300,01");
      expect(sent).toBe(1);
      await page.screenshot({ path: testInfo.outputPath("despesa-card.png"), fullPage: true, animations: "disabled" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expense.getByRole("button", { name: "Cancelar convite para guest@example.test", exact: true }).click();
      await expect(expense).toContainText("Cancelado");
      await page.getByRole("button", { name: "Mês anterior das despesas", exact: true }).click();
      await expect(expense).toHaveCount(0);
    });

    test("destinatario aceita ou recusa no app e somente sua parte entra nos gastos", async ({ page, isMobile }, testInfo) => {
      if (isMobile) await page.setViewportSize({ width: 320, height: 720 });
      const data = makeData();
      data.expenseSharing!.invitations = [
        { id: inviteId, card_id: cardId, invited_email: mockedUser.email, amount: 100.01, status: "pending", created_at: "2026-09-09", description: "Materiais da equipe", expense_date: "2026-09-09", total_amount: 300.01, owner_name: "Colega de teste" },
        { id: "40000000-0000-4000-8000-000000000003", card_id: "other", invited_email: mockedUser.email, amount: 50, status: "pending", created_at: "2026-09-09", description: "Despesa recusada", expense_date: "2026-09-09", total_amount: 100, owner_name: "Colega de teste" },
      ];
      let failOnce = true;
      await page.route("**/api/dashboard/bootstrap", route => route.fulfill({ json: { data } }));
      await page.route("**/api/expenses/invitations/*/respond", async route => {
        const pathId = new URL(route.request().url()).pathname.split("/").at(-2)!;
        const { action } = route.request().postDataJSON();
        if (failOnce) { failOnce = false; return route.fulfill({ status: 503, json: { error: { message: "Falha de teste ao registrar resposta" } } }); }
        if (action === "accepted") {
          data.expenseSharing!.cards.push({ ...makeCard(), owner_id: "other-user", owner_name: "Colega de teste", description: "Materiais da equipe", is_owner: false, amount: 100.01, participant_count: 2 });
          data.sharedExpenses.push({ id: cardId, sharing_card_id: cardId, description: "Materiais da equipe", expense_date: "2026-09-09", amount: 100.01 });
        }
        data.expenseSharing!.invitations = data.expenseSharing!.invitations.filter(item => item.id !== pathId);
        await route.fulfill({ json: { data: { id: pathId } } });
      });
      await enterExpenses(page);
      await expect(page.locator(".stat-card").filter({ hasText: "Compartilhado" })).toContainText("R$ 0,00");
      await page.getByRole("button", { name: "Convites (2)", exact: true }).click();
      const modal = page.getByRole("dialog");
      await modal.getByRole("button", { name: "Aceitar convite para Materiais da equipe", exact: true }).click();
      await expect(modal.getByRole("alert")).toContainText("Falha de teste");
      await modal.getByRole("button", { name: "Recusar convite para Despesa recusada", exact: true }).click();
      await expect(modal.getByRole("article", { name: "Convite para Despesa recusada", exact: true })).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath("convites-recebidos.png"), fullPage: true, animations: "disabled" });
      await modal.getByRole("button", { name: "Aceitar convite para Materiais da equipe", exact: true }).click();
      await expect(modal.getByText("Nenhum convite pendente", { exact: true })).toBeVisible();
      await modal.getByRole("button", { name: "Fechar", exact: true }).click();
      const expense = page.getByRole("article", { name: "Despesa compartilhada Materiais da equipe", exact: true });
      await expect(expense).toContainText("R$ 300,01");
      await expect(expense.locator(".expense-card-share")).toContainText("R$ 100,01");
      await expect(expense.getByRole("button", { name: "Convidar pessoa", exact: true })).toHaveCount(0);
      await expect(page.locator(".stat-card").filter({ hasText: "Compartilhado" })).toContainText("R$ 100,01");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test("indisponibilidade do compartilhamento preserva despesas pessoais e registros antigos", async ({ page }) => {
      const data = makeData(); data.expenseSharing!.available = false;
      data.sharedExpenses.push({ id: "legacy", description: "Despesa anterior", amount: 30, expense_date: "2026-09-01" });
      await page.route("**/api/dashboard/bootstrap", route => route.fulfill({ json: { data } }));
      await page.route("**/api/expenses/personal", async route => {
        data.personalExpenses.push({ id: "personal", ...route.request().postDataJSON() });
        await route.fulfill({ status: 201, json: { data: data.personalExpenses[0] } });
      });
      await enterExpenses(page);
      await expect(page.getByRole("button", { name: "Compartilhar", exact: true })).toBeDisabled();
      await expect(page.getByText("Despesa anterior", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Nova", exact: true }).click();
      const modal = page.getByRole("dialog");
      await modal.getByLabel("Descricao", { exact: true }).fill("Transporte pessoal");
      await modal.getByLabel("Valor", { exact: true }).fill("25");
      await modal.getByRole("button", { name: "Salvar", exact: true }).click();
      await expect(page.getByText("Transporte pessoal", { exact: true })).toBeVisible();
      await expect(page.locator(".stat-card").filter({ hasText: "Pessoal" })).toContainText("R$ 25,00");
    });
  });

  for (const screen of [
    { path: "", heading: "Setembro 2026", action: "Plantao", dialog: "Novo plantao" },
    { path: "shifts", heading: "Plantoes", action: "Novo plantao", dialog: "Novo plantao" },
    { path: "finance", heading: "Faturamento e pendências", action: "Novo recebivel", dialog: "Novo recebivel" },
    { path: "locations", heading: "Locais de trabalho", action: "Novo local", dialog: "Novo local" },
    { path: "expenses", heading: "Despesas pessoais", action: "Nova", dialog: "Nova despesa pessoal" },
    { path: "reports", heading: "Comparativo por local", action: null, dialog: null },
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

  test("abas Espacos, Guidelines e Assistente IA ficam inativas nos menus", async ({ page, isMobile }) => {
    await login(page, mockedUser);
    await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });

    if (isMobile) {
      await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    }

    await expect(page.getByRole("link", { name: "Guidelines", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Assistente IA", exact: true })).toHaveCount(0);
    await expect(page.locator('a[href="#/spaces"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Painel", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Plantoes", exact: true })).toBeVisible();

    await page.goto("/#/spaces");
    await expect(page).toHaveURL(/\/#\/expenses$/);
    await expect(page.getByRole("heading", { name: "Despesas pessoais", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Novo espaco", exact: true })).toHaveCount(0);
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
