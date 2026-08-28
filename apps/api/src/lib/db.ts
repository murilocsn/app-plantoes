import type { PostgrestError } from "@supabase/supabase-js";
import { HttpError } from "./http-error";

type SupabaseResult = {
  data: unknown;
  error: PostgrestError | null;
};

const optionalCodes = new Set(["42P01", "42703", "PGRST200", "PGRST204", "PGRST205"]);

export function toHttpError(error: PostgrestError, fallbackMessage = "Falha ao acessar os dados.") {
  const status = error.code === "PGRST116" ? 404 : 400;

  return new HttpError(status, error.message || fallbackMessage, error.code, error.details);
}

export async function expectData<T>(result: PromiseLike<SupabaseResult>, fallbackMessage?: string) {
  const { data, error } = await result;

  if (error) {
    throw toHttpError(error, fallbackMessage);
  }

  return data as T;
}

export async function optionalData<T>(
  result: PromiseLike<SupabaseResult>,
  fallback: T,
  optionalErrorCodes = optionalCodes,
) {
  const { data, error } = await result;

  if (!error) {
    return (data ?? fallback) as T;
  }

  if (optionalErrorCodes.has(error.code)) {
    return fallback;
  }

  throw toHttpError(error);
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export function normalizeShiftStatus<T extends Record<string, unknown>>(shift: T): T {
  return {
    status: "scheduled",
    ...shift,
  };
}
