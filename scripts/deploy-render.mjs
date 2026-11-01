import { pathToFileURL } from "node:url";
import { setTimeout } from "node:timers/promises";

export async function deployRender({
  env = process.env,
  fetcher = globalThis.fetch,
  log = console.log,
  wait = setTimeout,
  now = Date.now,
  verificationTimeout = 600_000,
} = {}) {
  const hooks = [
    ["api", env.RENDER_API_DEPLOY_HOOK_URL],
    ["web", env.RENDER_WEB_DEPLOY_HOOK_URL],
  ].filter(([, url]) => url);
  if (!env.RENDER_API_DEPLOY_HOOK_URL) {
    throw new Error("Configure RENDER_API_DEPLOY_HOOK_URL para publicar a API.");
  }

  const commit = env.RENDER_DEPLOY_COMMIT || env.GITHUB_SHA;
  if (!commit || !/^[a-f0-9]{40}$/i.test(commit)) {
    throw new Error("Informe o SHA completo do commit validado em RENDER_DEPLOY_COMMIT.");
  }

  let versionUrl;
  const deployments = [];
  try {
    versionUrl = new URL(env.RENDER_VERIFY_URL);
    for (const [service, secretUrl] of hooks) {
      const url = new URL(secretUrl);
      if (url.protocol !== "https:") throw new Error();
      url.searchParams.set("ref", commit);
      deployments.push([service, url]);
    }
    if (versionUrl.protocol !== "https:") throw new Error();
  } catch {
    throw new Error("Configure URLs HTTPS válidas para o deploy e a verificação da API.");
  }

  for (const [service, url] of deployments) {
    let response;
    try {
      response = await fetcher(url, { method: "POST", signal: AbortSignal.timeout(30_000) });
    } catch {
      throw new Error(`Falha de comunicação ao iniciar deploy do Render para ${service}.`);
    }
    if (!response.ok) {
      throw new Error(`Falha ao iniciar deploy do Render para ${service}: HTTP ${response.status}.`);
    }
    log(`Deploy do Render iniciado para ${service} no commit ${commit}.`);
  }

  const deadline = now() + verificationTimeout;
  let attempts = 0;
  while (now() < deadline) {
    try {
      const response = await fetcher(versionUrl, {
        headers: { "cache-control": "no-cache" },
        signal: AbortSignal.timeout(Math.max(1, Math.min(15_000, deadline - now()))),
      });
      if (response.ok) {
        const body = await response.json();
        if (body?.data?.commit === commit) {
          log(`Publicação da API confirmada no commit ${commit}.`);
          return;
        }
      }
    } catch {
      // A versão anterior ou uma resposta de inicialização não confirma o novo deploy.
    }
    if (++attempts % 6 === 0) log(`Aguardando a API publicar o commit ${commit}.`);
    const remaining = deadline - now();
    if (remaining > 0) await wait(Math.min(10_000, remaining));
  }
  throw new Error(`O Render não confirmou o commit ${commit} dentro do prazo de verificação.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await deployRender();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
