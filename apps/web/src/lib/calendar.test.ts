import type { Shift } from "@financplantoes/shared";
import { describe, expect, it } from "vitest";
import { colorFor, dateKey, isNightShift, monthDays } from "./calendar";

describe("calendar helpers", () => {
  it("gera chave de data no formato yyyy-MM-dd", () => {
    expect(dateKey(new Date(2026, 8, 9))).toBe("2026-09-09");
  });

  it("monta uma grade mensal com 42 dias iniciando no domingo", () => {
    const days = monthDays(new Date(2026, 8, 1));

    expect(days).toHaveLength(42);
    expect(dateKey(days[0]!)).toBe("2026-08-30");
    expect(dateKey(days[41]!)).toBe("2026-10-10");
  });

  it("identifica plantoes noturnos", () => {
    expect(isNightShift({ start_time: "19:00" } as Shift)).toBe(true);
    expect(isNightShift({ start_time: "05:30" } as Shift)).toBe(true);
    expect(isNightShift({ start_time: "08:00" } as Shift)).toBe(false);
  });

  it("gera cor estavel para o mesmo texto", () => {
    expect(colorFor("Hospital Central")).toBe(colorFor("hospital central"));
  });
});
