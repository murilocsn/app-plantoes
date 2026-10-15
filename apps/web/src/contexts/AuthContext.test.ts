import { AuthError } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../lib/supabase";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("../lib/supabase", () => ({
  supabase: { auth: { signUp: vi.fn() } },
}));

function authFromProvider() {
  let auth: ReturnType<typeof useAuth> | undefined;

  function Consumer() {
    auth = useAuth();
    return null;
  }

  renderToString(
    createElement(QueryClientProvider, {
      client: new QueryClient(),
      children: createElement(AuthProvider, { children: createElement(Consumer) }),
    }),
  );

  if (!auth) {
    throw new Error("O contexto de autenticacao nao foi inicializado.");
  }

  return auth;
}

describe("cadastro pelo AuthProvider", () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.signUp).mockReset();
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
  });

  it("aceita o cadastro atual com e-mail e senha, sem exigir perfil", async () => {
    await expect(
      authFromProvider().signUp("teste@example.test", "test-password"),
    ).resolves.toBeUndefined();

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "teste@example.test",
      password: "test-password",
    });
  });

  it("preserva os metadados quando o perfil e informado", async () => {
    await authFromProvider().signUp("teste@example.test", "test-password", {
      fullName: "  Ana Maria  ",
      birthDate: "1990-05-20",
    });

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "teste@example.test",
      password: "test-password",
      options: {
        data: {
          birth_date: "1990-05-20",
          first_name: "Ana",
          full_name: "Ana Maria",
        },
      },
    });
  });

  it("propaga falhas de cadastro para o formulario", async () => {
    const error = new AuthError("Falha de cadastro simulada");
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: { user: null, session: null },
      error,
    });

    await expect(authFromProvider().signUp("teste@example.test", "test-password")).rejects.toBe(
      error,
    );
  });
});
