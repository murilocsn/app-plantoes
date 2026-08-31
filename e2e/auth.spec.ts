import { expect, test, type Page } from "@playwright/test";

type TestUser = { email: string; label: string; password: string };

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

async function login(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.locator("input[type=email]").fill(user.email);
  await page.locator("input[type=password]").fill(user.password);
  await page.locator("button[type=submit]").click();
}

for (const user of usersFromEnv()) {
  test.describe(`Login E2E - ${user.email}`, () => {
    test("faz login e chega ao painel (desktop e mobile)", async ({ page }) => {
      await login(page, user);

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });
    });

    test("lista de plantoes aparece agrupada por unidade e data", async ({ page }) => {
      await login(page, user);
      await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });

      await page.goto("/shifts");

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
