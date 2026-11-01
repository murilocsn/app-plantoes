import { once } from "node:events";
import { request } from "node:http";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";

vi.mock("./config/env", () => ({
  env: { NODE_ENV: "test", WEB_ORIGIN: "http://localhost:5173" },
}));

const { getUser, createSupabaseForToken } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createSupabaseForToken: vi.fn(),
}));

vi.mock("./lib/supabase", () => ({
  authSupabase: { auth: { getUser } },
  createSupabaseForToken,
}));

let server: Server | undefined;

async function send(path: string, token?: string, method = "POST") {
  const app = createApp();
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server has no port.");

  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    const outgoing = request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path,
        method,
        agent: false,
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolve({ status: response.statusCode!, body: JSON.parse(body) }));
      },
    );
    outgoing.on("error", reject);
    outgoing.end(method === "POST" ? JSON.stringify({ question: "synthetic test" }) : undefined);
  });
}

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "synthetic-user" } }, error: null });
  createSupabaseForToken.mockReset().mockReturnValue({});
  // Only the loopback HTTP client above is allowed; no model or database calls.
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected external request."));
});

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => {
      server!.closeAllConnections();
      server!.close(() => resolve());
    });
    server = undefined;
  }
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("inactive AI assistant", () => {
  it("blocks chat for an authenticated user without calling external services", async () => {
    const response = await send("/api/ai/chat", "synthetic-token");
    expect(response).toEqual({
      status: 404,
      body: { error: { message: "Assistente IA indisponivel.", code: "FEATURE_DISABLED" } },
    });
    expect(getUser).toHaveBeenCalledWith("synthetic-token");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("preserves the authentication requirement", async () => {
    const response = await send("/api/ai/chat");
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: "AUTH_REQUIRED" } });
    expect(getUser).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("keeps the public health check working", async () => {
    expect(await send("/health", undefined, "GET")).toEqual({
      status: 200,
      body: { data: { status: "ok" } },
    });
    expect(getUser).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("trata falhas inesperadas da autenticação sem deixar a requisição pendente", async () => {
    getUser.mockRejectedValue(new Error("PRIVATE_AUTH_FAILURE"));
    const response = await send("/api/ai/chat", "synthetic-token");
    expect(response).toEqual({
      status: 500,
      body: { error: { message: "Erro interno ao processar a requisicao.", code: "INTERNAL_ERROR" } },
    });
    expect(createSupabaseForToken).not.toHaveBeenCalled();
  });

  it("informa somente o commit e a branch publicados, sem consultar dados da conta", async () => {
    vi.stubEnv("RENDER_GIT_COMMIT", "a".repeat(40));
    vi.stubEnv("RENDER_GIT_BRANCH", "main");
    vi.stubEnv("RENDER_API_KEY", "PRIVATE_SYNTHETIC_KEY");
    expect(await send("/version", undefined, "GET")).toEqual({
      status: 200,
      body: { data: { commit: "a".repeat(40), branch: "main" } },
    });
    expect(getUser).not.toHaveBeenCalled();
    expect(createSupabaseForToken).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("não apresenta uma versão inventada quando os metadados do Render estão ausentes ou inválidos", async () => {
    vi.stubEnv("RENDER_GIT_COMMIT", "invalid-value");
    vi.stubEnv("RENDER_GIT_BRANCH", "invalid branch");
    expect(await send("/version", undefined, "GET")).toEqual({
      status: 200,
      body: { data: { commit: null, branch: null } },
    });
  });
});
