# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Login E2E - muriloneder39@gmail.com >> lista de plantoes aparece agrupada por unidade e data
- Location: e2e\auth.spec.ts:36:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.calendar-grid')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for locator('.calendar-grid')
  - Test timeout of 30000ms exceeded.

```

# Test source

```ts
  1  | import { expect, test, type Page } from "@playwright/test";
  2  | 
  3  | type TestUser = { email: string; label: string; password: string };
  4  | 
  5  | function usersFromEnv(): TestUser[] {
  6  |   const users: TestUser[] = [];
  7  | 
  8  |   for (const index of [1, 2]) {
  9  |     const email = process.env[`E2E_USER_${index}_EMAIL`];
  10 |     const password = process.env[`E2E_USER_${index}_PASSWORD`];
  11 | 
  12 |     if (email && password) {
  13 |       users.push({ email, label: `usuario ${index}`, password });
  14 |     }
  15 |   }
  16 | 
  17 |   return users;
  18 | }
  19 | 
  20 | async function login(page: Page, user: TestUser) {
  21 |   await page.goto("/login");
  22 |   await page.locator("input[type=email]").fill(user.email);
  23 |   await page.locator("input[type=password]").fill(user.password);
  24 |   await page.locator("button[type=submit]").click();
  25 | }
  26 | 
  27 | for (const user of usersFromEnv()) {
  28 |   test.describe(`Login E2E - ${user.email}`, () => {
  29 |     test("faz login e chega ao painel (desktop e mobile)", async ({ page }) => {
  30 |       await login(page, user);
  31 | 
  32 |       await expect(page).not.toHaveURL(/\/login/);
  33 |       await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });
  34 |     });
  35 | 
  36 |     test("lista de plantoes aparece agrupada por unidade e data", async ({ page }) => {
  37 |       await login(page, user);
> 38 |       await expect(page.locator(".calendar-grid")).toBeVisible({ timeout: 30000 });
     |                                                    ^ Error: expect(locator).toBeVisible() failed
  39 | 
  40 |       await page.goto("/shifts");
  41 | 
  42 |       const emptyState = page.getByText("Sem plantoes");
  43 | 
  44 |       if (await emptyState.isVisible()) {
  45 |         test.skip();
  46 |       }
  47 | 
  48 |       await expect(page.locator(".shift-group-head").first()).toBeVisible({ timeout: 30000 });
  49 |       await expect(page.locator(".shift-day-label").first()).toBeVisible({ timeout: 30000 });
  50 |     });
  51 |   });
  52 | }
  53 | 
```