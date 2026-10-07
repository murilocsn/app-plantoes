import { describe, expect, it } from "vitest";
import { hasEmergencySignal, retrieveMedicalSources } from "./medical-rag";

describe("medical-rag", () => {
  it("prioriza fontes de antibiotico quando a pergunta menciona infeccao", () => {
    const sources = retrieveMedicalSources("Conduta para infeccao e uso de antibiotico em plantao");

    expect(sources[0]?.id).toBe("who-antibiotics-aware");
  });

  it("detecta sinais de possivel urgencia", () => {
    expect(hasEmergencySignal("Paciente com dor toracica e dispneia")).toBe(true);
    expect(hasEmergencySignal("Diferenca entre dengue e influenza")).toBe(false);
  });
});
