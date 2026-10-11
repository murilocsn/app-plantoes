import { describe, expect, it } from "vitest";
import { HttpError } from "./http-error";
import {
  expectedPaymentDate,
  recurrenceDates,
  recurrenceForDatabase,
  type PaymentLocation,
} from "./shift-rules";

const location: PaymentLocation = {
  id: "loc-1",
  name: "Hospital Central",
  value12: 1200,
  active: true,
  reference_start_day: 1,
  reference_end_day: 28,
  payment_due_day: 10,
  payment_due_months_after: 1,
};

describe("shift recurrence rules", () => {
  it("gera ocorrencias semanais incluindo a data inicial", () => {
    expect(
      recurrenceDates("2026-03-10", {
        frequency: "weekly",
        interval_value: 1,
        occurrences: 3,
      }),
    ).toEqual(["2026-03-10", "2026-03-17", "2026-03-24"]);
  });

  it("limita recorrencia pela data final", () => {
    expect(
      recurrenceDates("2026-03-10", {
        frequency: "daily",
        interval_value: 2,
        end_date: "2026-03-15",
      }),
    ).toEqual(["2026-03-10", "2026-03-12", "2026-03-14"]);
  });

  it("exige data final ou quantidade de repeticoes", () => {
    expect(() =>
      recurrenceDates("2026-03-10", {
        frequency: "weekly",
        interval_value: 1,
      }),
    ).toThrow(HttpError);
  });

  it("gera recorrencia semanal em dias da semana selecionados", () => {
    expect(
      recurrenceDates("2026-03-09", {
        frequency: "weekly",
        interval_value: 1,
        occurrences: 5,
        weekdays: [1, 2, 3, 4, 5],
      }),
    ).toEqual(["2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13"]);
  });

  it("ignora dias anteriores a data inicial na primeira semana", () => {
    expect(
      recurrenceDates("2026-03-11", {
        frequency: "weekly",
        interval_value: 1,
        occurrences: 4,
        weekdays: [1, 3, 5],
      }),
    ).toEqual(["2026-03-11", "2026-03-13", "2026-03-16", "2026-03-18"]);
  });

  it("gera recorrencia quinzenal em dias da semana selecionados", () => {
    expect(
      recurrenceDates("2026-03-10", {
        frequency: "biweekly",
        interval_value: 1,
        occurrences: 4,
        weekdays: [2, 4],
      }),
    ).toEqual(["2026-03-10", "2026-03-12", "2026-03-24", "2026-03-26"]);
  });

  it("salva quinzenal como semanal com intervalo dobrado", () => {
    expect(
      recurrenceForDatabase({
        frequency: "biweekly",
        interval_value: 1,
        occurrences: 4,
        weekdays: [4, 2],
      }),
    ).toEqual({
      frequency: "weekly",
      interval_value: 2,
      weekdays: [2, 4],
    });
  });
});

describe("expectedPaymentDate", () => {
  it("usa o mes seguinte quando o plantao esta dentro do periodo de referencia", () => {
    expect(expectedPaymentDate("2026-01-15", location)).toBe("2026-02-10");
  });

  it("avanca o periodo quando o dia fica depois do fim da referencia", () => {
    expect(expectedPaymentDate("2026-01-29", location)).toBe("2026-03-10");
  });

  it("volta o periodo quando o dia fica antes do inicio da referencia", () => {
    expect(
      expectedPaymentDate("2026-02-04", {
        ...location,
        reference_start_day: 5,
        reference_end_day: 20,
      }),
    ).toBe("2026-02-10");
  });

  it("limita vencimento ao ultimo dia do mes quando necessario", () => {
    expect(
      expectedPaymentDate("2026-01-15", {
        ...location,
        payment_due_day: 31,
      }),
    ).toBe("2026-02-28");
  });
});
