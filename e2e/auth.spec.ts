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

    const firstGroup = page.locator(".shift-group-head").first();

    await expect(firstGroup).toBeVisible({ timeout: 30000 });
    await expect(page.locator(".shift-day-label").first()).toBeVisible({ timeout: 30000 });
  });
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
      const firstGroup = page.locator(".shift-group-head").first();

      await expect(emptyState.or(firstGroup)).toBeVisible({ timeout: 30000 });

      if (await emptyState.isVisible()) {
        test.skip();
      }

      await expect(firstGroup).toBeVisible({ timeout: 30000 });
      await expect(page.locator(".shift-day-label").first()).toBeVisible({ timeout: 30000 });
    });
  });
}
