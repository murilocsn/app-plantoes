import { supabase } from "./supabase";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function accessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new ApiError(error.message, 401, "AUTH_SESSION_ERROR");
  }

  if (!data.session?.access_token) {
    throw new ApiError("Sessao expirada. Entre novamente.", 401, "AUTH_REQUIRED");
  }

  return data.session.access_token;
}

function buildRequest(path: string, options: ApiOptions, token: string) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function unwrap<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? "Falha na comunicacao com a API.",
      response.status,
      payload?.error?.code,
      payload?.error?.details,
    );
  }

  return payload.data as T;
}

async function renewSession() {
  const { error } = await supabase.auth.refreshSession();

  if (error) {
    throw new ApiError("Sessao expirada. Entre novamente.", 401, "AUTH_SESSION_ERROR");
  }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await buildRequest(path, options, await accessToken());

  // Respostas rapidas: apenas decodifica.
  if (response.status !== 401) {
    return unwrap<T>(response);
  }

  // Token pode ter expirado em voo (a API responde 401 em PGRST301/PGRST302).
  // Renova a sessao Supabase e repete a chamada uma unica vez antes de reportar erro.
  await renewSession();

  return unwrap<T>(await buildRequest(path, options, await accessToken()));
}

export async function download(path: string) {
  const token = await accessToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new ApiError("Nao foi possivel baixar o arquivo.", response.status);
  }

  return response.blob();
}
