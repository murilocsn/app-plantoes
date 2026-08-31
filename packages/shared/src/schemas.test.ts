import { describe, expect, it } from "vitest";

import {
  dateRangeQuerySchema,
  idParamSchema,
  locationInputSchema,
  planInputSchema,
  recurrenceInputSchema,
  shiftInputSchema,
  spaceInputSchema,
} from "./schemas";

describe("idParamSchema", () => {
  it("aceita um id válido", () => {
    expect(idParamSchema.parse({ id: "abc-123" })).toEqual({ id: "abc-123" });
  });

  it("rejeita id vazio", () => {
    expect(() => idParamSchema.parse({ id: "" })).toThrow();
  });
});

describe("dateRangeQuerySchema", () => {
  it("aceita um intervalo de datas válido", () => {
    const result = dateRangeQuerySchema.parse({
      from: "2026-01-01",
      to: "2026-01-31",
    });

    expect(result).toEqual({ from: "2026-01-01", to: "2026-01-31" });
  });

  it("aceita query sem datas (campos opcionais)", () => {
    expect(dateRangeQuerySchema.parse({})).toEqual({});
  });

  it("rejeita data em formato inválido", () => {
    expect(() => dateRangeQuerySchema.parse({ from: "31/01/2026" })).toThrow();
  });
});

describe("shiftInputSchema", () => {
  const validShift = {
    date: "2026-03-10",
    start_time: "08:00",
    location_id: "loc-1",
    duration: "12",
    value: "1500",
  };

  it("aceita um plantão válido e aplica defaults", () => {
    const result = shiftInputSchema.parse(validShift);

    expect(result.duration).toBe(12);
    expect(result.value).toBe(1500);
    expect(result.status).toBe("scheduled");
    expect(result.createReceivable).toBe(true);
  });

  it("transforma textos opcionais vazios em null", () => {
    const result = shiftInputSchema.parse({ ...validShift, notes: "   " });

    expect(result.notes).toBeNull();
  });

  it("rejeita horário em formato inválido", () => {
    expect(() => shiftInputSchema.parse({ ...validShift, start_time: "8h" })).toThrow();
  });

  it("rejeita duração fora do limite de 1 a 48 horas", () => {
    expect(() => shiftInputSchema.parse({ ...validShift, duration: "0" })).toThrow();
    expect(() => shiftInputSchema.parse({ ...validShift, duration: "49" })).toThrow();
  });

  it("rejeita valor negativo", () => {
    expect(() => shiftInputSchema.parse({ ...validShift, value: "-1" })).toThrow();
  });

  it("rejeita status desconhecido", () => {
    expect(() => shiftInputSchema.parse({ ...validShift, status: "done" })).toThrow();
  });

  it("rejeita data inválida", () => {
    expect(() => shiftInputSchema.parse({ ...validShift, date: "2026-02-30" })).toThrow();
  });
});

describe("locationInputSchema", () => {
  const validLocation = {
    name: "Hospital Santa Casa",
    value12: "1200",
  };

  it("aceita um local válido e aplica defaults", () => {
    const result = locationInputSchema.parse(validLocation);

    expect(result.value12).toBe(1200);
    expect(result.reference_start_day).toBe(1);
    expect(result.reference_end_day).toBe(28);
    expect(result.payment_due_day).toBe(10);
    expect(result.payment_due_months_after).toBe(1);
  });

  it("rejeita nome com menos de 2 caracteres", () => {
    expect(() => locationInputSchema.parse({ ...validLocation, name: "A" })).toThrow();
  });

  it("rejeita dias de referência fora do intervalo de 1 a 31", () => {
    expect(() =>
      locationInputSchema.parse({ ...validLocation, reference_start_day: "0" }),
    ).toThrow();
    expect(() =>
      locationInputSchema.parse({ ...validLocation, reference_end_day: "32" }),
    ).toThrow();
  });
});

describe("recurrenceInputSchema", () => {
  it("aceita recorrência semanal válida", () => {
    const result = recurrenceInputSchema.parse({
      frequency: "weekly",
      interval_value: "2",
    });

    expect(result.frequency).toBe("weekly");
    expect(result.interval_value).toBe(2);
  });

  it("rejeita frequência desconhecida", () => {
    expect(() => recurrenceInputSchema.parse({ frequency: "yearly" })).toThrow();
  });

  it("rejeita menos de 2 ocorrências", () => {
    expect(() =>
      recurrenceInputSchema.parse({ frequency: "daily", occurrences: "1" }),
    ).toThrow();
  });
});

describe("spaceInputSchema", () => {
  it("aceita espaço com tipo default", () => {
    const result = spaceInputSchema.parse({ name: "Clínica Vida" });

    expect(result.space_type).toBe("other");
  });

  it("aceita tipo de espaço conhecido", () => {
    const result = spaceInputSchema.parse({
      name: "Viagem SP",
      space_type: "trip",
    });

    expect(result.space_type).toBe("trip");
  });

  it("rejeita tipo de espaço desconhecido", () => {
    expect(() =>
      spaceInputSchema.parse({ name: "X", space_type: "unknown" }),
    ).toThrow();
  });
});

describe("planInputSchema", () => {
  it("aceita plano válido e aplica defaults de moeda", () => {
    const result = planInputSchema.parse({
      name: "Plano Pro",
      price_cents: "4990",
      billing_interval: "monthly",
    });

    expect(result.price_cents).toBe(4990);
    expect(result.currency).toBe("BRL");
  });

  it("rejeita intervalo de cobrança inválido", () => {
    expect(() =>
      planInputSchema.parse({
        name: "Plano Pro",
        price_cents: 100,
        billing_interval: "weekly",
      }),
    ).toThrow();
  });
});
