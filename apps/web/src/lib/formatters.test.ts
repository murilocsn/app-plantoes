import { describe, expect, it } from "vitest";
import { dateLabel, money, monthTitle, parseDateInput, shortMonth } from "./formatters";

describe("formatters", () => {
  it("formata valores em reais", () => {
    expect(money(1234.5).replace(/\s/g, " ")).toMatch(/^R\$ ?1\.234,50$/);
  });

  it("formata datas ISO para exibicao brasileira", () => {
    expect(dateLabel("2026-09-09")).toBe("09/09/2026");
  });

  it("retorna fallback quando a data esta ausente", () => {
    expect(dateLabel(null, "sem data")).toBe("sem data");
  });

  it("converte entrada dd/MM/yyyy para yyyy-MM-dd", () => {
    expect(parseDateInput("09/09/2026")).toBe("2026-09-09");
  });

  it("converte entrada ddMMyyyy para yyyy-MM-dd", () => {
    expect(parseDateInput("09092026")).toBe("2026-09-09");
  });

  it("rejeita entrada de data invalida", () => {
    expect(parseDateInput("2026-09-09")).toBeNull();
    expect(parseDateInput("31/02/2026")).toBeNull();
  });

  it("formata nomes de meses em portugues", () => {
    const date = new Date(2026, 8, 1);

    expect(monthTitle(date)).toBe("Setembro 2026");
    expect(shortMonth(date)).toBe("set");
  });
});
