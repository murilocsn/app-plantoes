import type { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { HttpError } from "./http-error";
import { addDays, expectData, normalizeShiftStatus, optionalData, toHttpError } from "./db";

function postgrestError(code: string, message = "Erro do banco"): PostgrestError {
  const error = {
    code,
    details: "detalhes",
    hint: "",
    message,
    name: "PostgrestError",
  };

  return {
    ...error,
    toJSON: () => error,
  };
}

describe("db helpers", () => {
  it("converte erro de sessao do Supabase em 401", () => {
    const error = toHttpError(postgrestError("PGRST301", "JWT expirado"));

    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(401);
    expect(error.code).toBe("PGRST301");
    expect(error.message).toBe("JWT expirado");
  });

  it("expectData retorna os dados quando nao ha erro", async () => {
    await expect(expectData(Promise.resolve({ data: { ok: true }, error: null }))).resolves.toEqual({
      ok: true,
    });
  });

  it("optionalData retorna fallback para erros opcionais conhecidos", async () => {
    await expect(
      optionalData(Promise.resolve({ data: null, error: postgrestError("PGRST205") }), []),
    ).resolves.toEqual([]);
  });

  it("addDays soma dias usando formato yyyy-MM-dd", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("normalizeShiftStatus preserva status existente", () => {
    expect(normalizeShiftStatus({ id: "shift-1", status: "completed" })).toEqual({
      id: "shift-1",
      status: "completed",
    });
  });

  it("normalizeShiftStatus aplica scheduled quando status esta ausente", () => {
    expect(normalizeShiftStatus({ id: "shift-1" })).toEqual({
      id: "shift-1",
      status: "scheduled",
    });
  });
});
