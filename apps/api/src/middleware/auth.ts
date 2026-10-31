import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error";
import { authSupabase, createSupabaseForToken } from "../lib/supabase";

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const header = request.header("authorization");
  const [, token] = header?.match(/^Bearer\s+(.+)$/i) ?? [];

  if (!token) {
    next(new HttpError(401, "Sessao nao encontrada.", "AUTH_REQUIRED"));
    return;
  }

  const startedAt = performance.now();
  try {
    const { data, error } = await authSupabase.auth.getUser(token).finally(() => {
      response.append("Server-Timing", `auth;dur=${Math.round(performance.now() - startedAt)}`);
    });

    if (error || !data.user) {
      next(new HttpError(401, "Sessao invalida ou expirada.", "AUTH_INVALID"));
      return;
    }

    request.auth = {
      accessToken: token,
      user: data.user,
      supabase: createSupabaseForToken(token),
    };

    next();
  } catch (error) {
    next(error);
  }
}
