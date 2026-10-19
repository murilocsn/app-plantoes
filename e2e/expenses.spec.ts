import { expect, test, type Page } from "@playwright/test";
import type { Expense, ExpenseLocationCard, ExpenseSharingSnapshot } from "@financplantoes/shared";

const personalId = "20000000-0000-4000-8000-000000000001";
const sharedId = "20000000-0000-4000-8000-000000000002";
const inviteId = "20000000-0000-4000-8000-000000000003";
const newId = "20000000-0000-4000-8000-000000000004";
type State = { personal: Expense[]; shared: Expense[]; expenseSharing: ExpenseSharingSnapshot };
const states = new WeakMap<Page, State>();
const posts = new WeakMap<Page, Array<{ path: string; body: Record<string, unknown> }>>();

function location(
  id: string,
  name: string,
  visibility: "personal" | "shared",
): ExpenseLocationCard {
  return {
    id,
    name,
    visibility,
    is_owner: true,
    owner_name: "Ana",
    participant_count: 1,
    participants: [{ name: "Ana", is_owner: true }],
    invitations: [],
  };
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-18T12:00:00Z"));
  const state: State = {
    personal: [
      {
        id: "personal",
        description: "Comida",
        amount: 230,
        expense_date: "2026-10-18",
        category: "Alimentação",
        location_card_id: personalId,
      },
      { id: "old", description: "Setembro", amount: 40, expense_date: "2026-09-18" },
    ],
    shared: [
      {
        id: "shared",
        sharing_card_id: "shared",
        description: "Internet",
        amount: 50,
        expense_date: "2026-10-18",
        category: "Moradia",
        location_card_id: sharedId,
      },
    ],
    expenseSharing: {
      available: true,
      cards: [
        {
          id: "shared",
          owner_id: personalId,
          owner_name: "Ana",
          created_by_name: "Bruno",
          description: "Internet",
          amount: 50,
          total_amount: 100,
          expense_date: "2026-10-18",
          created_at: "2026-10-18",
          category: "Moradia",
          location_card_id: sharedId,
          is_owner: true,
          participant_count: 2,
          invitations: [],
        },
      ],
      locations: [
        location(personalId, "Consultório", "personal"),
        location(sharedId, "Residência", "shared"),
      ],
      invitations: [
        {
          id: inviteId,
          card_id: newId,
          invited_email: "teste@example.test",
          amount: 0,
          status: "pending",
          created_at: "2026-10-18",
          description: "Escritório",
          expense_date: "2026-10-18",
          total_amount: 0,
          owner_name: "Bruno",
          is_location: true,
        },
      ],
    },
  };
  state.expenseSharing.locations![1].participant_count = 2;
  state.expenseSharing.locations![1].participants.push({ name: "Bruno", is_owner: false });
  states.set(page, state);
  posts.set(page, []);
  await page.route("**/auth/v1/**", (route) =>
    route.fulfill({
      json: {
        access_token: "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.test-signature",
        refresh_token: "test-refresh",
        token_type: "bearer",
        expires_in: 3600,
        user: {
          id: personalId,
          aud: "authenticated",
          role: "authenticated",
          email: "teste@example.test",
          user_metadata: { full_name: "Ana" },
          app_metadata: {},
          created_at: "2026-01-01T00:00:00Z",
        },
      },
    }),
  );
  // All application requests are intercepted; no real data is read or written.
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "GET") {
      if (path === "/api/expenses/overview") return route.fulfill({ json: { data: state } });
      if (path === "/api/receivables") return route.fulfill({ json: { data: [] } });
      if (path === "/api/dashboard/overview")
        return route.fulfill({
          json: {
            data: {
              summary: {
                monthKey: "2026-10",
                incomeProjected: 0,
                received: 0,
                pending: 0,
                expenses: 280,
                net: -280,
                shiftCount: 0,
                shiftHours: 0,
                activeLocationCount: 0,
                nextReceivable: null,
              },
              calendarShifts: [],
              upcomingShifts: [],
              locations: [],
              receivables: [],
              spaceCount: 0,
            },
          },
        });
      return route.abort();
    }
    const body = request.postDataJSON() ?? {};
    posts.get(page)!.push({ path, body });
    if (path === "/api/expenses/personal") state.personal.push({ id: newId, ...body });
    else if (path === `/api/expenses/locations/${sharedId}/expenses`)
      state.shared.push({ id: newId, ...body, location_card_id: sharedId });
    else if (path === "/api/expenses/locations")
      state.expenseSharing.locations!.push(location(newId, body.name, body.visibility));
    else if (path === `/api/expenses/locations/${sharedId}`)
      state.expenseSharing.locations![1].name = body.name;
    else if (path === `/api/expenses/locations/${sharedId}/invitations`)
      state.expenseSharing.locations![1].invitations.push({
        id: inviteId,
        card_id: sharedId,
        invited_email: body.email,
        amount: 0,
        status: "pending",
        created_at: "2026-10-18",
      });
    else if (path === `/api/expenses/invitations/${inviteId}/cancel`)
      state.expenseSharing.locations![1].invitations[0].status = "cancelled";
    else if (path === `/api/expenses/invitations/${inviteId}/respond`) {
      state.expenseSharing.invitations = [];
      if (body.action === "accepted") {
        const accepted = location(newId, "Escritório", "shared");
        accepted.is_owner = false;
        state.expenseSharing.locations!.push(accepted);
      }
    } else return route.abort();
    return route.fulfill({ status: 201, json: { data: { id: newId } } });
  });
  await page.goto("/#/login");
  await page.getByLabel("E-mail").fill("teste@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).not.toHaveURL(/#\/login/);
  await page.goto("/#/expenses");
  await expect(page.getByRole("heading", { name: "Despesas cadastradas" })).toBeVisible({
    timeout: 15000,
  });
});

test("totais por período, filtros e locais sem gastos permanecem corretos", async ({ page }) => {
  const summary = page.getByRole("region", { name: "Resumo financeiro" });
  await expect(summary).toContainText("230,00");
  await expect(summary).toContainText("50,00");
  await expect(summary).toContainText("280,00");
  await expect(page.getByRole("article", { name: "Local Residência" })).toContainText("100,00");
  await expect(page.locator(".expense-filter-toggle")).not.toHaveAttribute("open");
  await expect(page.locator(".expense-statement")).toHaveCount(2);
  await expect(page.locator(".expense-statement").filter({ hasText: "Consultório" })).toContainText(
    "Referência: Outubro 2026",
  );
  await page.locator(".expense-filter-toggle > summary").click();
  await page.getByLabel("Tipo de despesa").selectOption("shared");
  await expect(page.locator("[data-expense-type]")).toHaveCount(1);
  await page.getByRole("combobox", { name: "Categoria", exact: true }).selectOption("Alimentação");
  await expect(page.getByText("Nenhuma despesa encontrada")).toBeVisible();
  await expect(summary).toContainText("280,00");
  await page.getByRole("button", { name: "Mês anterior das despesas" }).click();
  await expect(summary).toContainText("40,00");
  await expect(page.getByRole("article", { name: "Local Residência" })).toContainText("0,00");
  await expect(page.getByRole("article", { name: "Local Consultório" })).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page.locator("[data-expense-type]")).toHaveCount(2);
  await expect(page.getByRole("textbox", { name: "De", exact: true })).toHaveValue("01/10/2026");
});

test("cadastra despesa pessoal com local opcional", async ({ page }) => {
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  await page.getByRole("button", { name: "Despesa pessoal" }).click();
  await page.getByLabel("Descrição").fill("Transporte");
  await page.getByLabel("Valor", { exact: true }).fill("20.50");
  await page.getByRole("button", { name: "Salvar despesa" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(posts.get(page)!.at(-1)).toMatchObject({
    path: "/api/expenses/personal",
    body: { description: "Transporte", amount: 20.5 },
  });
  expect(posts.get(page)!.at(-1)!.body.location_card_id).toBeUndefined();
  await expect(page.locator("[data-expense-type]")).toHaveCount(3);
});

test("exige local no cadastro compartilhado e vincula corretamente", async ({ page }) => {
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  await page.getByRole("button", { name: "Despesa compartilhada" }).click();
  await page.getByLabel("Descrição").fill("Energia");
  await page.getByLabel("Valor", { exact: true }).fill("100.01");
  await page.getByRole("button", { name: "Salvar despesa" }).click();
  await expect(page.getByText("Selecione um local", { exact: true }).last()).toBeVisible();
  expect(posts.get(page)).toHaveLength(0);
  await page.getByLabel("Local compartilhado").selectOption(sharedId);
  await page.getByRole("button", { name: "Salvar despesa" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(posts.get(page)!.at(-1)).toMatchObject({
    path: `/api/expenses/locations/${sharedId}/expenses`,
    body: { description: "Energia", amount: 100.01 },
  });
});

test("cria local durante o cadastro sem perder o rascunho da despesa", async ({ page }) => {
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  await page.getByRole("button", { name: "Despesa pessoal" }).click();
  await page.getByLabel("Descrição").fill("Material");
  await page.getByLabel("Valor", { exact: true }).fill("80");
  await page.getByRole("button", { name: "Criar local nesta página" }).click();
  await page.getByLabel("Nome do local").fill("Clínica Central");
  await page.getByRole("button", { name: "Criar local", exact: true }).click();
  await expect(page.getByLabel("Descrição")).toHaveValue("Material");
  await expect(page.getByLabel("Descrição")).toBeFocused();
  await expect(page.getByLabel("Valor", { exact: true })).toHaveValue("80");
  await page.getByLabel("Local pessoal (opcional)").selectOption(newId);
  await page.getByRole("button", { name: "Salvar despesa" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(posts.get(page)!.at(-1)!.body.location_card_id).toBe(newId);
});

test("cria local compartilhado, consulta despesas e edita o nome", async ({ page }) => {
  await page.getByRole("button", { name: "Novo local", exact: true }).click();
  await page.getByLabel("Nome do local").fill("Hospital São Lucas");
  await page.getByLabel("Tipo do local").selectOption("shared");
  await page.getByRole("button", { name: "Criar local", exact: true }).click();
  await expect(page.getByRole("article", { name: "Local Hospital São Lucas" })).toBeVisible();
  await page
    .getByRole("article", { name: "Local Residência" })
    .getByRole("button", { name: "Ver despesas e gerenciar" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Internet");
  await page.getByRole("button", { name: "Editar local", exact: true }).click();
  await page.getByLabel("Nome do local").fill("Casa");
  await page.getByRole("button", { name: "Salvar local" }).click();
  await expect(page.getByRole("article", { name: "Local Casa", exact: true })).toBeVisible();
});

test("lista todos os gastos do local com autor, total e parte individual", async ({
  page,
}, testInfo) => {
  const state = states.get(page)!;
  state.shared.push(
    {
      id: "energy",
      sharing_card_id: "energy",
      location_card_id: sharedId,
      description: "Energia",
      amount: 75,
      expense_date: "2026-10-17",
      notes: "Conta de outubro",
    },
    {
      id: "historical",
      sharing_card_id: "historical",
      location_card_id: sharedId,
      description: "Limpeza anterior ao convite",
      amount: 0,
      expense_date: "2026-10-16",
    },
  );
  state.expenseSharing.cards.push(
    {
      ...state.expenseSharing.cards[0],
      id: "energy",
      description: "Energia",
      amount: 75,
      total_amount: 150,
      expense_date: "2026-10-17",
      created_by_name: "Ana",
    },
    {
      ...state.expenseSharing.cards[0],
      id: "historical",
      description: "Limpeza anterior ao convite",
      amount: 0,
      total_amount: 80,
      expense_date: "2026-10-16",
      created_by_name: null,
    },
  );
  await page.reload();
  await page.getByRole("article", { name: "Local Residência" }).getByRole("button").click();
  const dialog = page.getByRole("dialog");
  const list = dialog.getByRole("list", { name: "Gastos do local" });
  await expect(list.getByRole("listitem")).toHaveCount(3);
  const internet = list.getByRole("listitem").filter({ hasText: "Internet" });
  await expect(internet).toContainText("Publicado por Bruno");
  await expect(internet).toContainText("100,00");
  await expect(internet).toContainText("Sua parte: R$ 50,00");
  const energy = list.getByRole("listitem").filter({ hasText: "Energia" });
  await expect(energy).toContainText("Publicado por Ana");
  await expect(energy).toContainText("17/10/2026");
  await expect(energy).toContainText("Conta de outubro");
  const historical = list.getByRole("listitem").filter({ hasText: "Limpeza anterior" });
  await expect(historical).toContainText("Autor não registrado");
  await expect(historical).not.toContainText("Publicado por Ana");
  await expect(historical).toContainText("80,00");
  await expect(historical).toContainText("Sua parte: R$ 0,00");
  await expect(list).not.toContainText("Comida");
  await expect(dialog.getByLabel("Resumo dos gastos do local")).toContainText("330,00");
  await expect(dialog.getByLabel("Resumo dos gastos do local")).toContainText("125,00");
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("location-expense-list.png"), fullPage: true });
});

test("lista as despesas pessoais do local com o nome do proprietário", async ({ page }) => {
  await page.getByRole("article", { name: "Local Consultório" }).getByRole("button").click();
  const dialog = page.getByRole("dialog");
  const list = dialog.getByRole("list", { name: "Gastos do local" });
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list).toContainText("Comida");
  await expect(list).toContainText("Publicado por Ana");
  await expect(list).toContainText("230,00");
  await expect(list).not.toContainText("Internet");
});

test("envia e cancela convite para o local", async ({ page }) => {
  await page.getByRole("article", { name: "Local Residência" }).getByRole("button").click();
  await page.getByRole("button", { name: "Convidar pessoa" }).click();
  await page.getByLabel("E-mail do convidado").fill("guest@example.test");
  await page.getByLabel("Confirme o e-mail").fill("guest@example.test");
  await expect(page.getByLabel("Valor dessa pessoa")).toHaveCount(0);
  await page.getByRole("button", { name: "Enviar convite" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(posts.get(page)!.at(-1)).toMatchObject({
    path: `/api/expenses/locations/${sharedId}/invitations`,
    body: { email: "guest@example.test" },
  });
  await page.getByRole("article", { name: "Local Residência" }).getByRole("button").click();
  await page.getByText("Participações e convites (1)").click();
  await page.getByRole("button", { name: "Cancelar convite para guest@example.test" }).click();
  await expect(page.getByRole("dialog")).toContainText("Cancelado");
});

for (const action of ["accepted", "declined"] as const)
  test(`${action}: convite libera acesso somente após aceite`, async ({ page }) => {
    await expect(page.getByRole("article", { name: "Local Escritório" })).toHaveCount(0);
    await page.getByRole("button", { name: "Convites (1)" }).click();
    await page
      .getByRole("button", {
        name: `${action === "accepted" ? "Aceitar" : "Recusar"} convite para Escritório`,
      })
      .click();
    await expect(page.getByText("Nenhum convite pendente")).toBeVisible();
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(page.getByRole("article", { name: "Local Escritório" })).toHaveCount(
      action === "accepted" ? 1 : 0,
    );
    if (action === "accepted") {
      await page.getByRole("article", { name: "Local Escritório" }).getByRole("button").click();
      await expect(page.getByRole("button", { name: "Convidar pessoa" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Editar local", exact: true })).toHaveCount(0);
    }
  });

test("interface e modais cabem em celular, tablet e desktop", async ({ page }, testInfo) => {
  // Cover the width matrix on desktop; mobile projects retain their native device viewport.
  test.setTimeout(60000);
  const widths = testInfo.project.name === "desktop" ? [320, 390, 768, 1280] : [390];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
    await page.getByRole("button", { name: "Despesa pessoal" }).click();
    const dialog = await page.getByRole("dialog").boundingBox();
    expect(dialog!.x).toBeGreaterThanOrEqual(0);
    expect(dialog!.width).toBeLessThanOrEqual(width);
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    if (width === 390 || width === 1280)
      await page.screenshot({ path: testInfo.outputPath(`expenses-${width}.png`), fullPage: true });
  }
});

test("carrega despesas progressivamente sem alterar os totais", async ({ page }) => {
  const state = states.get(page)!;
  state.personal = Array.from({ length: 35 }, (_, index) => ({
    id: `page-${index}`,
    description: `Despesa ${index}`,
    amount: 1,
    expense_date: "2026-10-18",
  }));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Despesas cadastradas" })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator("[data-expense-type]")).toHaveCount(20);
  await expect(page.getByRole("region", { name: "Resumo financeiro" })).toContainText("85,00");
  await page.getByRole("button", { name: "Mostrar mais despesas" }).click();
  await expect(page.locator("[data-expense-type]")).toHaveCount(36);
});

test("preserva cadastro pessoal quando a migration de locais não está disponível", async ({
  page,
}) => {
  delete states.get(page)!.expenseSharing.locations;
  await page.reload();
  await expect(page.getByRole("heading", { name: "Despesas cadastradas" })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole("button", { name: "Novo local", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  await expect(page.getByRole("button", { name: "Despesa compartilhada" })).toBeDisabled();
  await page.getByRole("button", { name: "Despesa pessoal" }).click();
  await expect(page.getByLabel("Descrição")).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("button", { name: "Criar local nesta página" })).toBeDisabled();
  await page.getByLabel("Descrição").fill("Táxi");
  await page.getByLabel("Valor", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Salvar despesa" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("reconsulta a disponibilidade e libera a criação do primeiro local", async ({ page }) => {
  const state = states.get(page)!;
  state.expenseSharing.available = false;
  delete state.expenseSharing.locations;
  await page.reload();
  await expect(page.getByRole("button", { name: "Novo local", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  await expect(page.getByRole("button", { name: "Despesa compartilhada" })).toBeDisabled();

  // The migration becomes available while this page and modal remain open.
  state.expenseSharing.available = true;
  state.expenseSharing.locations = [];
  await page.getByRole("button", { name: "Verificar disponibilidade" }).click();
  await expect(page.getByRole("button", { name: "Despesa compartilhada" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Verificar disponibilidade" })).toHaveCount(0);
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Novo local", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Novo local", exact: true }).click();
  await page.getByLabel("Nome do local").fill("Casa");
  await page.getByLabel("Tipo do local").selectOption("shared");
  await page.getByRole("button", { name: "Criar local", exact: true }).click();
  await expect(page.getByRole("article", { name: "Local Casa", exact: true })).toBeVisible();
  expect(posts.get(page)!.at(-1)).toMatchObject({
    path: "/api/expenses/locations",
    body: { name: "Casa", visibility: "shared" },
  });
});

test("verifica novamente os locais ao voltar para a janela", async ({ page }) => {
  const state = states.get(page)!;
  delete state.expenseSharing.locations;
  await page.reload();
  await expect(page.getByRole("button", { name: "Novo local", exact: true })).toBeDisabled();
  state.expenseSharing.locations = [];
  await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByRole("button", { name: "Novo local", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Verificar disponibilidade" })).toHaveCount(0);
});

test("falha na atualização preserva o rascunho e permite tentar novamente", async ({ page }) => {
  const state = states.get(page)!;
  delete state.expenseSharing.locations;
  await page.reload();
  await expect(page.getByRole("button", { name: "Novo local", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  await page.getByRole("button", { name: "Despesa pessoal" }).click();
  await page.getByLabel("Descrição").fill("Material");
  await page.getByLabel("Valor", { exact: true }).fill("80");
  let unavailable = true;
  await page.route("**/api/expenses/overview", (route) =>
    unavailable
      ? route.fulfill({
          status: 503,
          json: { error: { message: "Serviço temporariamente indisponível." } },
        })
      : route.fallback(),
  );
  await page.getByRole("button", { name: "Verificar disponibilidade" }).click();
  await expect(page.getByRole("alert")).toContainText("Serviço temporariamente indisponível");
  await expect(page.getByLabel("Descrição")).toHaveValue("Material");
  await expect(page.getByLabel("Valor", { exact: true })).toHaveValue("80");
  unavailable = false;
  state.expenseSharing.locations = [];
  await page.getByRole("button", { name: "Verificar disponibilidade" }).click();
  await expect(page.getByRole("button", { name: "Criar local nesta página" })).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Descrição")).toHaveValue("Material");
  await expect(page.getByLabel("Valor", { exact: true })).toHaveValue("80");
  expect(posts.get(page)).toHaveLength(0);
});

test("erro de permissão no convite mantém os dados para correção", async ({ page }) => {
  await page.route(`**/api/expenses/locations/${sharedId}/invitations`, (route) =>
    route.fulfill({
      status: 403,
      json: { error: { message: "Você não tem permissão para realizar esta ação." } },
    }),
  );
  await page.getByRole("article", { name: "Local Residência" }).getByRole("button").click();
  await page.getByRole("button", { name: "Convidar pessoa" }).click();
  await page.getByLabel("E-mail do convidado").fill("guest@example.test");
  await page.getByLabel("Confirme o e-mail").fill("guest@example.test");
  await page.getByRole("button", { name: "Enviar convite" }).click();
  await expect(page.getByRole("alert")).toContainText("Você não tem permissão");
  await expect(page.getByLabel("E-mail do convidado")).toHaveValue("guest@example.test");
  await expect(page.getByRole("button", { name: "Enviar convite" })).toBeEnabled();
});
