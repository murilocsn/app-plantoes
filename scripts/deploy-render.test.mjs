import assert from "node:assert/strict";
import { test } from "node:test";
import { deployRender } from "./deploy-render.mjs";

const commit = "b".repeat(40);
const oldCommit = "a".repeat(40);
const env = {
  RENDER_API_DEPLOY_HOOK_URL: "https://api.render.com/deploy/srv-test?key=synthetic-secret&ref=old",
  RENDER_DEPLOY_COMMIT: commit,
  RENDER_VERIFY_URL: "https://example.test/version",
};

function harness(responses) {
  const calls = [];
  const logs = [];
  let clock = 0;
  return {
    calls, logs,
    options: {
      env,
      log: (message) => logs.push(message),
      now: () => clock,
      wait: async (duration) => { clock += duration; },
      fetcher: async (url, options) => {
        calls.push({ url: new URL(url), options });
        const next = responses.shift();
        if (next instanceof Error) throw next;
        if (!next) throw new Error("Resposta de teste ausente");
        return next;
      },
    },
  };
}

const version = (sha) => Response.json({ data: { commit: sha, branch: "main" } });

test("publica o SHA validado e só confirma depois de a API responder com essa versão", async () => {
  const fixture = harness([new Response(null), version(oldCommit), new Response(null, { status: 404 }), version(commit)]);
  await deployRender(fixture.options);
  assert.equal(fixture.calls[0].url.searchParams.get("ref"), commit);
  assert.equal(fixture.calls[0].url.searchParams.get("key"), "synthetic-secret");
  assert.equal(fixture.calls[0].options.method, "POST");
  assert.equal(fixture.calls.length, 4);
  assert.equal(fixture.calls[1].options.headers["cache-control"], "no-cache");
  assert.match(fixture.logs.at(-1), /Publicação da API confirmada/);
  assert.ok(fixture.logs.every((message) => !message.includes("synthetic-secret")));
});

test("aceita deploy enfileirado e verifica a versão sem depender de um ID de deploy", async () => {
  const fixture = harness([new Response(null, { status: 202 }), version(commit)]);
  await deployRender(fixture.options);
  assert.match(fixture.logs.at(-1), /confirmada/);
});

test("falha quando nenhum hook da API está configurado, em vez de informar sucesso", async () => {
  const fixture = harness([]);
  await assert.rejects(deployRender({ ...fixture.options, env: {} }), /RENDER_API_DEPLOY_HOOK_URL/);
  assert.equal(fixture.calls.length, 0);
});

test("recusa SHA ausente ou abreviado antes de iniciar publicação", async () => {
  for (const sha of [undefined, "123abc", "not-a-commit"]) {
    const fixture = harness([]);
    await assert.rejects(deployRender({ ...fixture.options, env: { ...env, RENDER_DEPLOY_COMMIT: sha } }), /SHA completo/);
    assert.equal(fixture.calls.length, 0);
  }
});

test("exige URL de verificação e não reproduz URLs secretas inválidas", async () => {
  for (const overrides of [{ RENDER_VERIFY_URL: undefined }, { RENDER_API_DEPLOY_HOOK_URL: "PRIVATE_INVALID_SECRET" }]) {
    const fixture = harness([]);
    const error = await deployRender({ ...fixture.options, env: { ...env, ...overrides } }).catch((error) => error);
    assert.match(error.message, /URLs HTTPS válidas/);
    assert.ok(!error.message.includes("PRIVATE_INVALID_SECRET"));
    assert.equal(fixture.calls.length, 0);
  }
});

test("propaga falha HTTP do hook sem iniciar a verificação", async () => {
  const fixture = harness([new Response(null, { status: 403 })]);
  await assert.rejects(deployRender(fixture.options), /HTTP 403/);
  assert.equal(fixture.calls.length, 1);
});

test("não expõe a URL secreta quando a rede falha", async () => {
  const fixture = harness([new Error(env.RENDER_API_DEPLOY_HOOK_URL)]);
  const error = await deployRender(fixture.options).catch((error) => error);
  assert.match(error.message, /Falha de comunicação/);
  assert.ok(!error.message.includes("synthetic-secret"));
});

test("não considera uma versão antiga como sucesso e termina dentro do prazo", async () => {
  const fixture = harness([new Response(null), version(oldCommit), version(oldCommit)]);
  await assert.rejects(deployRender({ ...fixture.options, verificationTimeout: 20_000 }), /não confirmou/);
  assert.ok(!fixture.logs.some((message) => message.includes("confirmada")));
  assert.equal(fixture.calls.length, 3);
});

test("tolera respostas transitórias da inicialização antes de confirmar a nova versão", async () => {
  const fixture = harness([new Response(null), new Error("Serviço iniciando"), new Response("Iniciando"), version(commit)]);
  await deployRender(fixture.options);
  assert.match(fixture.logs.at(-1), /confirmada/);
});
