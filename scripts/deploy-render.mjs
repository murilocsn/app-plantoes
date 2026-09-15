const hooks = [
  ["api", process.env.RENDER_API_DEPLOY_HOOK_URL],
  ["web", process.env.RENDER_WEB_DEPLOY_HOOK_URL],
].filter(([, url]) => url);

if (!hooks.length) {
  console.log("Nenhum deploy hook do Render configurado; nada foi publicado.");
  process.exit(0);
}

for (const [service, url] of hooks) {
  const response = await fetch(url, { method: "POST" });

  if (!response.ok) {
    throw new Error(`Falha ao iniciar deploy do Render para ${service}: HTTP ${response.status}`);
  }

  console.log(`Deploy do Render iniciado para ${service}.`);
}
