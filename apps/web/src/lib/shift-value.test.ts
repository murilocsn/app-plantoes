import { describe, expect, it } from "vitest";
import { shiftValueFromDuration } from "./shift-value";

describe("shiftValueFromDuration", () => {
  it("calcula o valor proporcional ao padrao de 12h", () => {
    expect(shiftValueFromDuration(1000, 6)).toBe(500);
    expect(shiftValueFromDuration(1200, 12)).toBe(1200);
    expect(shiftValueFromDuration(1200, 24)).toBe(2400);
  });

  it("arredonda o resultado em centavos", () => {
    expect(shiftValueFromDuration(1000, 7)).toBe(583.33);
  });

  it("retorna zero para entradas invalidas", () => {
    expect(shiftValueFromDuration("abc", 6)).toBe(0);
    expect(shiftValueFromDuration(1000, 0)).toBe(0);
  });
});
