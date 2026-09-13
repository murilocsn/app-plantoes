# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shift-dates.spec.ts >> edita datas existentes e preserva o seletor de calendario
- Location: e2e\shift-dates.spec.ts:151:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForRequest: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - main [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - paragraph [ref=e7]: Rotina profissional
        - heading "Boa noite, Usuario" [level=1] [ref=e8]
        - paragraph [ref=e9]: teste@example.test
      - button [ref=e11] [cursor=pointer]
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]:
          - paragraph [ref=e16]: Agenda
          - heading "Plantoes" [level=2] [ref=e17]
        - button "Novo plantao" [ref=e18] [cursor=pointer]
      - generic "Filtros de plantoes" [ref=e22]:
        - generic [ref=e23]:
          - generic [ref=e24]:
            - generic [ref=e25]: De
            - generic [ref=e26]:
              - textbox "De" [ref=e27]:
                - /placeholder: DD/MM/AAAA
                - text: 08/09/2026
              - generic "Escolher de no calendario" [ref=e28]:
                - textbox "Escolher de no calendario" [ref=e31] [cursor=pointer]: 2026-09-08
          - generic [ref=e32]:
            - generic [ref=e33]: Até
            - generic [ref=e34]:
              - textbox "Até" [ref=e35]:
                - /placeholder: DD/MM/AAAA
                - text: 08/09/2026
              - generic "Escolher até no calendario" [ref=e36]:
                - textbox "Escolher até no calendario" [ref=e39] [cursor=pointer]: 2026-09-08
          - generic [ref=e40]:
            - generic [ref=e41]: Unidade
            - combobox "Filtrar por unidade" [ref=e42]:
              - option "Todas" [selected]
              - option "Hospital Central"
          - button "Limpar" [ref=e43] [cursor=pointer]
        - paragraph [ref=e47]: 1 plantao encontrado
      - generic [ref=e49]:
        - generic [ref=e50]:
          - strong [ref=e52]: Hospital Central
          - generic [ref=e53]: 1 plantao
        - generic [ref=e54]:
          - generic [ref=e55]: 08/09/2026
          - article [ref=e57]:
            - generic [ref=e58]:
              - strong [ref=e59]: 07:00
              - generic [ref=e60]: 12h
            - generic [ref=e61]:
              - button "Editar" [ref=e62] [cursor=pointer]
              - button "Excluir" [ref=e66] [cursor=pointer]
    - dialog [ref=e70]:
      - generic [ref=e71]:
        - generic [ref=e72]:
          - paragraph [ref=e73]: Plantao
          - heading "Editar plantao" [level=2] [ref=e74]
        - button "Fechar" [ref=e75] [cursor=pointer]
      - generic [ref=e80]:
        - generic [ref=e81]:
          - generic [ref=e82]: Data
          - generic [ref=e83]:
            - textbox "Data" [ref=e84]:
              - /placeholder: DD/MM/AAAA
              - text: 31/12/2026
            - generic "Escolher data no calendario" [ref=e85]:
              - textbox "Escolher data no calendario" [active] [ref=e88] [cursor=pointer]: 2026-12-31
        - generic [ref=e89]:
          - generic [ref=e90]: Inicio
          - textbox "Inicio" [ref=e91]: 07:00
        - generic [ref=e92]:
          - generic [ref=e93]: Local
          - combobox "Local" [ref=e94]:
            - option "Hospital Central" [selected]
        - generic [ref=e95]:
          - generic [ref=e96]: Duracao em horas
          - spinbutton "Duracao em horas" [ref=e97]: "12"
        - generic [ref=e98]:
          - generic [ref=e99]: Valor
          - spinbutton "Valor" [ref=e100]: "1500"
        - generic [ref=e101]:
          - generic [ref=e102]: Profissional
          - textbox "Profissional" [ref=e103]: Ana
        - generic [ref=e104]:
          - generic [ref=e105]: Observacoes
          - textbox "Observacoes" [ref=e106]: Emergencia
        - generic [ref=e107]:
          - button "Cancelar" [ref=e108] [cursor=pointer]
          - button "Salvar" [ref=e109] [cursor=pointer]
  - navigation "Navegacao mobile" [ref=e115]:
    - link "Painel" [ref=e116] [cursor=pointer]:
      - /url: "#/"
    - link "Plantoes" [ref=e120] [cursor=pointer]:
      - /url: "#/shifts"
    - button "Novo plantao" [ref=e125] [cursor=pointer]
    - link "Financeiro" [ref=e127] [cursor=pointer]:
      - /url: "#/finance"
    - link "Despesas" [ref=e132] [cursor=pointer]:
      - /url: "#/expenses"
```

# Test source

```ts
  61  |       user: {
  62  |         id: "00000000-0000-4000-8000-000000000001",
  63  |         aud: "authenticated",
  64  |         role: "authenticated",
  65  |         email: "teste@example.test",
  66  |         user_metadata: { full_name: "Usuario de teste" },
  67  |         app_metadata: {},
  68  |         created_at: "2026-01-01T00:00:00Z",
  69  |       },
  70  |     },
  71  |   }));
  72  |   await page.route("**/api/**", async (route) => {
  73  |     const request = route.request();
  74  |     const path = new URL(request.url()).pathname;
  75  | 
  76  |     if (path === "/api/dashboard/bootstrap") {
  77  |       await route.fulfill({ json: { data: bootstrap } });
  78  |     } else if (path === "/api/dashboard/overview") {
  79  |       await route.fulfill({ json: { data: {
  80  |         summary: bootstrap.summary,
  81  |         calendarShifts: shifts,
  82  |         upcomingShifts: shifts,
  83  |         locations: [location],
  84  |         receivables: [],
  85  |         spaceCount: 0,
  86  |       } } });
  87  |     } else if (path === "/api/shifts" && request.method() === "POST") {
  88  |       await route.fulfill({ status: 201, json: { data: [] } });
  89  |     } else if (path.startsWith("/api/shifts/") && request.method() === "PATCH") {
  90  |       await route.fulfill({ json: { data: request.postDataJSON() } });
  91  |     } else {
  92  |       await route.abort();
  93  |     }
  94  |   });
  95  | 
  96  |   await page.goto("/#/login");
  97  |   await page.getByLabel("E-mail").fill("teste@example.test");
  98  |   await page.getByLabel("Senha", { exact: true }).fill("test-password");
  99  |   await page.getByRole("button", { name: "Entrar", exact: true }).click();
  100 |   await expect(page).not.toHaveURL(/#\/login/);
  101 |   await page.goto("/#/shifts");
  102 |   await expect(page.locator(".table-row")).toHaveCount(3);
  103 | });
  104 | 
  105 | test("filtra por data brasileira, intervalo e unidade sem inverter dia e mes", async ({ page }) => {
  106 |   const from = page.getByRole("textbox", { name: "De", exact: true });
  107 |   const to = page.getByRole("textbox", { name: "Até", exact: true });
  108 |   const locationFilter = page.getByRole("combobox", { name: "Filtrar por unidade" });
  109 | 
  110 |   await from.fill("08/09/2026");
  111 |   await to.fill("08/09/2026");
  112 |   await expect(page.locator(".table-row")).toHaveCount(1);
  113 |   await expect(page.locator(".shift-day-label")).toHaveText("08/09/2026");
  114 | 
  115 |   await from.fill("08/09/2026");
  116 |   await to.fill("09/09/2026");
  117 |   await expect(page.locator(".table-row")).toHaveCount(2);
  118 | 
  119 |   await locationFilter.selectOption(location.id);
  120 |   await expect(page.locator(".table-row")).toHaveCount(2);
  121 | 
  122 |   await from.fill("31/12/2030");
  123 |   await expect(page.locator(".table-row")).toHaveCount(0);
  124 | });
  125 | 
  126 | test("cadastra data e repeticao em formato brasileiro e envia datas ISO para a API", async ({ page }, testInfo) => {
  127 |   await page.locator(".page-section").getByRole("button", { name: "Novo plantao" }).click();
  128 |   const dialog = page.getByRole("dialog");
  129 |   const date = dialog.getByRole("textbox", { name: "Data", exact: true });
  130 |   await expect(date).toHaveValue("08/09/2026");
  131 |   await date.fill("10092026");
  132 |   await expect(date).toHaveValue("10/09/2026");
  133 |   const repeat = dialog.getByLabel("Repetir plantao");
  134 |   await repeat.scrollIntoViewIfNeeded();
  135 |   await repeat.check();
  136 |   await dialog.getByRole("textbox", { name: "Data final", exact: true }).fill("30/09/2026");
  137 | 
  138 |   const overflow = await dialog.evaluate((element) => element.scrollWidth > element.clientWidth);
  139 |   expect(overflow).toBe(false);
  140 |   await page.screenshot({ path: testInfo.outputPath("datas-brasileiras.png"), fullPage: true });
  141 | 
  142 |   const submitted = page.waitForRequest((request) => request.url().endsWith("/api/shifts") && request.method() === "POST");
  143 |   await dialog.getByRole("button", { name: "Salvar" }).click();
  144 |   expect((await submitted).postDataJSON()).toMatchObject({
  145 |     shift: { date: "2026-09-10" },
  146 |     recurrence: { end_date: "2026-09-30" },
  147 |   });
  148 |   await expect(dialog).not.toBeVisible();
  149 | });
  150 | 
  151 | test("edita datas existentes e preserva o seletor de calendario", async ({ page }) => {
  152 |   await page.getByRole("textbox", { name: "De", exact: true }).fill("08/09/2026");
  153 |   await page.getByRole("textbox", { name: "Até", exact: true }).fill("08/09/2026");
  154 |   await page.getByRole("button", { name: "Editar", exact: true }).click();
  155 |   const dialog = page.getByRole("dialog");
  156 |   const date = dialog.getByRole("textbox", { name: "Data", exact: true });
  157 |   await expect(date).toHaveValue("08/09/2026");
  158 |   await dialog.getByLabel("Escolher data no calendario", { exact: true }).fill("2026-12-31");
  159 |   await expect(date).toHaveValue("31/12/2026");
  160 | 
> 161 |   const submitted = page.waitForRequest((request) => request.url().includes("/api/shifts/") && request.method() === "PATCH");
      |                          ^ Error: page.waitForRequest: Test timeout of 30000ms exceeded.
  162 |   const save = dialog.getByRole("button", { name: "Salvar" });
  163 |   await save.scrollIntoViewIfNeeded();
  164 |   await save.click();
  165 |   expect((await submitted).postDataJSON()).toMatchObject({ date: "2026-12-31" });
  166 |   await expect(dialog).not.toBeVisible();
  167 | });
  168 | 
  169 | test("valida datas impossiveis e permite ano bissexto e repeticao sem data final", async ({ page }) => {
  170 |   await page.locator(".page-section").getByRole("button", { name: "Novo plantao" }).click();
  171 |   const dialog = page.getByRole("dialog");
  172 |   const date = dialog.getByRole("textbox", { name: "Data", exact: true });
  173 |   const save = dialog.getByRole("button", { name: "Salvar" });
  174 | 
  175 |   for (const invalidDate of ["31/02/2026", "29/02/2026", "08/09/", ""]) {
  176 |     await date.fill(invalidDate);
  177 |     await save.scrollIntoViewIfNeeded();
  178 |     await save.click();
  179 |     await expect(date).toHaveAttribute("aria-invalid", "true");
  180 |     await expect(dialog.getByText("Informe uma data valida")).toBeVisible();
  181 |   }
  182 | 
  183 |   await date.fill("29/02/2028");
  184 |   const repeat = dialog.getByLabel("Repetir plantao");
  185 |   await repeat.scrollIntoViewIfNeeded();
  186 |   await repeat.check();
  187 |   const endDate = dialog.getByRole("textbox", { name: "Data final", exact: true });
  188 |   await endDate.fill("31/04/2028");
  189 |   await save.scrollIntoViewIfNeeded();
  190 |   await save.click();
  191 |   await expect(endDate).toHaveAttribute("aria-invalid", "true");
  192 |   await endDate.fill("");
  193 |   await dialog.getByLabel("Quantidade").fill("3");
  194 |   const submitted = page.waitForRequest((request) => request.url().endsWith("/api/shifts") && request.method() === "POST");
  195 |   await save.scrollIntoViewIfNeeded();
  196 |   await save.click();
  197 |   expect((await submitted).postDataJSON()).toMatchObject({
  198 |     shift: { date: "2028-02-29" },
  199 |     recurrence: { end_date: null, occurrences: 3 },
  200 |   });
  201 |   await expect(dialog).not.toBeVisible();
  202 | });
  203 | 
```