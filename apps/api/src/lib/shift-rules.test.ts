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

  it("salva quinzenal como semanal com intervalo dobrado", () => {
    expect(
      recurrenceForDatabase({
        frequency: "biweekly",
        interval_value: 1,
        occurrences: 4,
      }),
    ).toEqual({
      frequency: "weekly",
      interval_value: 2,
    });
  });
});

describe("expectedPaymentDate", () => {
  it("conta o mes seguinte a partir do fechamento em ciclos entre dois meses", () => {
    const cycle = { ...location, reference_start_day: 26, reference_end_day: 25 };
    expect(expectedPaymentDate("2026-08-26", cycle)).toBe("2026-10-10");
    expect(expectedPaymentDate("2026-09-25", cycle)).toBe("2026-10-10");
    expect(expectedPaymentDate("2026-09-26", cycle)).toBe("2026-11-10");
    expect(expectedPaymentDate("2026-12-31", cycle)).toBe("2027-02-10");
  });

  it("inclui todos os dias de meses curtos e longos sem pular referencia", () => {
    const cycle = { ...location, reference_end_day: 31 };
    for (const [month, lastDay, payment] of [["2026-01", 31, "2026-02-10"], ["2026-02", 28, "2026-03-10"], ["2028-02", 29, "2028-03-10"], ["2026-04", 30, "2026-05-10"]] as const) {
      for (let day = 1; day <= lastDay; day += 1) {
        expect(expectedPaymentDate(`${month}-${String(day).padStart(2, "0")}`, cycle)).toBe(payment);
      }
    }
  });

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

  it("ajusta tambem o inicio de referencia ao ultimo dia de fevereiro", () => {
    expect(expectedPaymentDate("2026-02-28", { ...location, reference_start_day: 31, reference_end_day: 30 })).toBe("2026-04-10");
  });
});
