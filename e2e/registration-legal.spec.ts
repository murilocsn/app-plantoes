import { expect, test } from "@playwright/test";
import { PRIVACY_SHA256, PRIVACY_VERSION, TERMS_SHA256, TERMS_VERSION } from "../apps/web/src/lib/legal";

test.beforeEach(async ({ page }) => {
  // Never contact Auth, send email or create a real account in these UI tests.
  await page.route("**/auth/v1/**", (route) => route.abort());
  await page.route("**/api/**", (route) => route.abort());
});

test("documentos publicos podem ser lidos sem autenticar em tela estreita e tema escuro", async ({ page }) => {
  const authRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/auth/v1/")) authRequests.push(request.method());
  });
  await page.setViewportSize({ width: 320, height: 740 });
  for (const [path, title] of [["terms", "Termos de Uso"], ["privacy", "Aviso de Privacidade"]]) {
    await page.goto(`/#/${path}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(/MODELO EM REVISÃO/)).toBeVisible();
    await expect(page.getByRole("article")).toContainText("Murilo Chaves Silva Neder");
    await expect(page.getByRole("article")).toContainText("muriloneder39@gmail.com");
    await expect(page.getByRole("article")).not.toContainText("[NOME OU RAZÃO SOCIAL DO RESPONSÁVEL]");
    if (path === "terms") await expect(page.getByRole("article")).toContainText("gratuito, sem cobrança de assinatura ou taxa de acesso");
    await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("link", { name: "Voltar ao aplicativo" })).toBeVisible();
  }
  expect(authRequests).toEqual([]);
});

test("cadastro exige as duas caixas inclusive quando validacao HTML e removida", async ({ page }) => {
  let attempts = 0;
  await page.route("**/auth/v1/signup**", (route) => { attempts += 1; return route.abort(); });
  await page.goto("/#/login");
  await page.getByRole("button", { name: /Você não possui conta/ }).click();
  await page.getByLabel("Nome completo", { exact: true }).fill("Joana de Teste");
  await page.getByLabel("E-mail", { exact: true }).fill("cadastro@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("synthetic-password");
  const terms = page.locator("#signup-terms");
  const privacy = page.locator("#signup-privacy");
  await expect(terms).not.toBeChecked();
  await expect(privacy).not.toBeChecked();
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Criar conta", exact: true })).toBeVisible();
  await page.locator("form").evaluate((form: HTMLFormElement) => { form.noValidate = true; });
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("aceite os Termos de Uso");
  await terms.check();
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("confirme a ciência");
  expect(attempts).toBe(0);
});

test("leitura em outra aba preserva formulario e nao marca ciencia automaticamente", async ({ page }) => {
  await page.goto("/#/login");
  await page.getByRole("button", { name: /Você não possui conta/ }).click();
  await page.getByLabel("Nome completo", { exact: true }).fill("Joana de Teste");
  await page.getByLabel("E-mail", { exact: true }).fill("cadastro@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("synthetic-password");
  const popupPromise = page.waitForEvent("popup");
  await page.locator(".signup-legal").getByRole("link", { name: "Termos de Uso" }).click();
  const popup = await popupPromise;
  await expect(popup.getByRole("heading", { level: 1, name: "Termos de Uso" })).toBeVisible();
  await popup.close();
  await expect(page.getByLabel("Nome completo", { exact: true })).toHaveValue("Joana de Teste");
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue("cadastro@example.test");
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("synthetic-password");
  await expect(page.locator("#signup-terms")).not.toBeChecked();
  await expect(page.locator("#signup-privacy")).not.toBeChecked();
});

test("cadastro envia nome normalizado separado da ciencia e aguarda confirmacao do Auth", async ({ page }) => {
  const declarations: unknown[] = [];
  await page.route("**/auth/v1/signup**", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.email).toBe("cadastro@example.test");
    expect(body.password).toBe("synthetic-password");
    declarations.push(body.data);
    await route.fulfill({ json: { user: {
      id: "00000000-0000-4000-8000-000000000099", aud: "authenticated",
      email: "cadastro@example.test", user_metadata: body.data,
      identities: [], created_at: "2026-10-17T12:00:00Z",
    }, session: null } });
  });
  await page.goto("/#/login");
  await page.getByRole("button", { name: /Você não possui conta/ }).click();
  await page.getByLabel("Nome completo", { exact: true }).fill("  Joana de Teste  ");
  await page.getByLabel("E-mail", { exact: true }).fill("cadastro@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("synthetic-password");
  await page.locator("#signup-terms").check();
  await page.locator("#signup-privacy").check();
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Conta criada");
  expect(declarations).toEqual([{ full_name: "Joana de Teste", legal_acknowledgment: {
    terms_accepted: true, terms_version: TERMS_VERSION, terms_sha256: TERMS_SHA256,
    privacy_acknowledged: true, privacy_version: PRIVACY_VERSION, privacy_sha256: PRIVACY_SHA256,
  } }]);
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Nome completo", { exact: true })).toHaveValue("");
  await expect(page.locator("#signup-terms")).not.toBeChecked();
  await expect(page.locator("#signup-privacy")).not.toBeChecked();
});

test("falha do provedor nao exibe sucesso nem detalhes privados e permite nova tentativa", async ({ page }) => {
  let attempts = 0;
  await page.route("**/auth/v1/signup**", async (route) => {
    attempts += 1;
    await route.fulfill({ status: 503, json: { message: "private-provider-detail", error_code: "unexpected_failure" } });
  });
  await page.goto("/#/login");
  await page.getByRole("button", { name: /Você não possui conta/ }).click();
  await page.getByLabel("Nome completo", { exact: true }).fill("Joana de Teste");
  await page.getByLabel("E-mail", { exact: true }).fill("cadastro@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("synthetic-password");
  await page.locator("#signup-terms").check();
  await page.locator("#signup-privacy").check();
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Não foi possível concluir o acesso");
  await expect(page.getByRole("status")).not.toContainText("private-provider-detail");
  await expect(page.getByRole("status")).not.toContainText("Conta criada");
  await expect(page.getByRole("button", { name: "Criar conta", exact: true })).toBeEnabled();
  expect(attempts).toBe(1);
});

test("alternar para login e retornar nao reutiliza ciencia anterior", async ({ page }) => {
  await page.goto("/#/login");
  await page.getByRole("button", { name: /Você não possui conta/ }).click();
  await page.locator("#signup-terms").check();
  await page.locator("#signup-privacy").check();
  await page.getByRole("button", { name: /Já tem conta/ }).click();
  await expect(page.getByLabel("Nome completo", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page.getByRole("button", { name: /Você não possui conta/ }).click();
  await expect(page.locator("#signup-terms")).not.toBeChecked();
  await expect(page.locator("#signup-privacy")).not.toBeChecked();
});

test("cadastro rejeita nome vazio ou com espacos mesmo sem validacao HTML", async ({ page }) => {
  let attempts = 0;
  await page.route("**/auth/v1/signup**", (route) => { attempts += 1; return route.abort(); });
  await page.goto("/#/login");
  await page.getByRole("button", { name: /Você não possui conta/ }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("cadastro@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("synthetic-password");
  await page.locator("#signup-terms").check();
  await page.locator("#signup-privacy").check();
  const name = page.getByLabel("Nome completo", { exact: true });
  await expect(name).toHaveAttribute("required", "");
  await expect(name).toHaveAttribute("maxLength", "80");
  await page.locator("form").evaluate((form: HTMLFormElement) => { form.noValidate = true; });
  for (const invalid of ["", "   ", "A"]) {
    await name.fill(invalid);
    await page.getByRole("button", { name: "Criar conta", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Informe seu nome completo");
  }
  expect(attempts).toBe(0);
});

test("nome informado no cadastro aparece no perfil e saudacao apos login", async ({ page }) => {
  let registeredName = "";
  const user = {
    id: "00000000-0000-4000-8000-000000000099", aud: "authenticated", role: "authenticated",
    email: "cadastro@example.test", created_at: "2026-10-17T12:00:00Z", app_metadata: {},
  };
  await page.route("**/auth/v1/signup**", async (route) => {
    registeredName = route.request().postDataJSON().data.full_name;
    await route.fulfill({ json: { user: { ...user, user_metadata: { full_name: registeredName } }, session: null } });
  });
  await page.route("**/auth/v1/token**", (route) => route.fulfill({ json: {
    access_token: "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.test-signature",
    refresh_token: "synthetic-refresh-token", token_type: "bearer", expires_in: 3600,
    user: { ...user, user_metadata: { full_name: registeredName } },
  } }));
  await page.goto("/#/login");
  await page.getByRole("button", { name: /Você não possui conta/ }).click();
  await page.getByLabel("Nome completo", { exact: true }).fill("  João de Teste  ");
  await page.getByLabel("E-mail", { exact: true }).fill("cadastro@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("synthetic-password");
  await page.locator("#signup-terms").check();
  await page.locator("#signup-privacy").check();
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Conta criada");
  await page.getByRole("button", { name: /Já tem conta/ }).click();
  await page.getByLabel("Senha", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/#\/$/);
  await page.goto("/#/profile");
  await expect(page.getByLabel("Nome de exibição", { exact: true })).toHaveValue("João de Teste");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/, João$/);
});
