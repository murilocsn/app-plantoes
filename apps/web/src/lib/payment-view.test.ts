import type { Receivable, Shift } from "@financplantoes/shared";
import { describe, expect, it, vi } from "vitest";
import {
  adjacentMonthRange,
  indexShiftReceivables,
  monthDateRange,
  receivablePaymentState,
  shiftPaymentState,
  shiftPaymentTotals,
  shiftTimeLabel,
} from "./payment-view";

const receipt = (id: string, shiftId: string | null, status: string, amount = 500): Receivable => ({
  id,
  shift_id: shiftId,
  description: "Demonstração",
  status,
  amount,
});
const shift = (id: string): Shift => ({
  id,
  date: "2026-10-14",
  location_name: "Unidade de teste",
  start_time: "07:00",
  duration: 6,
});

describe("identificação financeira dos plantões", () => {
  it("separa pago, pendente e atrasado pela data prevista, sem reabrir recebimentos pagos ou cancelados", () => {
    const today = "2026-09-15";
    expect(receivablePaymentState("pending", "2026-09-14", today)).toBe("overdue");
    expect(receivablePaymentState("pending", "2026-09-15", today)).toBe("pending");
    expect(receivablePaymentState("pending", "2026-09-16", today)).toBe("pending");
    expect(receivablePaymentState("pending", null, today)).toBe("pending");
    expect(receivablePaymentState("pending", "data inválida", today)).toBe("pending");
    expect(receivablePaymentState("received", "2026-09-14", today)).toBe("paid");
    expect(receivablePaymentState("cancelled", "2026-09-14", today)).toBe("cancelled");
    expect(receivablePaymentState("future-status", "2026-09-14", today)).toBe("unknown");
    expect(receivablePaymentState("overdue", null, today)).toBe("overdue");
  });

  it("considera o dia local e somente marca atraso depois do vencimento", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 8, 15, 23, 30));
      expect(receivablePaymentState("pending", "2026-09-15")).toBe("pending");
      vi.setSystemTime(new Date(2026, 8, 16, 0, 0));
      expect(receivablePaymentState("pending", "2026-09-15")).toBe("overdue");
    } finally {
      vi.useRealTimers();
    }
  });

  it("usa apenas o vínculo explícito e mantém ausências neutras", () => {
    const index = indexShiftReceivables([
      receipt("paid", "other", "received"),
      receipt("free", null, "received"),
    ]);
    expect(shiftPaymentState("other", index)).toBe("paid");
    expect(shiftPaymentState("shift", index)).toBe("unlinked");
    expect(shiftPaymentState("shift")).toBe("unknown");
    expect(index.size).toBe(1);
  });

  it("distingue pendências, parcelas pagas, cancelamentos e estados desconhecidos", () => {
    const state = (...statuses: string[]) =>
      shiftPaymentState(
        "shift",
        indexShiftReceivables(
          statuses.map((status, index) => receipt(String(index), "shift", status)),
        ),
      );
    expect(state("pending", "overdue")).toBe("unpaid");
    expect(state("received", "pending")).toBe("partial");
    expect(state("received", "received")).toBe("paid");
    expect(state("received", "cancelled")).toBe("paid");
    expect(state("cancelled")).toBe("cancelled");
    expect(state("received", "future-status")).toBe("unknown");
    expect(receivablePaymentState("future-status")).toBe("unknown");
  });

  it("soma somente recebíveis dos plantões filtrados, sem incluir avulsos ou cancelados", () => {
    expect(
      shiftPaymentTotals(
        [shift("first"), shift("second"), shift("third")],
        [
          receipt("a", "first", "received", 200),
          receipt("b", "first", "pending", 300),
          receipt("c", "second", "overdue", 500),
          receipt("d", "second", "cancelled", 900),
          receipt("e", "outside", "received", 1000),
          receipt("f", null, "received", 1000),
        ],
      ),
    ).toEqual({ received: 200, pending: 800, unlinked: 1 });
  });
});

describe("horários e navegação mensal", () => {
  it("exibe término, frações de hora e virada do dia sem mudar a data do plantão", () => {
    expect(shiftTimeLabel({ start_time: "07:00:00", duration: 6 })).toBe("07:00 – 13:00");
    expect(shiftTimeLabel({ start_time: "19:00", duration: 12 })).toBe("19:00 – 07:00 (+1d)");
    expect(shiftTimeLabel({ start_time: "23:45", duration: 1.5 })).toBe("23:45 – 01:15 (+1d)");
  });

  it("não inventa horários para dados ausentes ou inválidos", () => {
    for (const value of [null, "25:00", "12:99", "texto"]) {
      expect(shiftTimeLabel({ start_time: value, duration: 6 })).toBe("Horário não informado");
    }
    expect(shiftTimeLabel({ start_time: "07:00", duration: 0 })).toBe("Horário não informado");
  });

  it("respeita limites de meses locais, anos bissextos e virada do ano", () => {
    expect(monthDateRange(new Date(2028, 1, 29))).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(adjacentMonthRange("2026-12-15", "2026-12-31", 1)).toEqual({
      from: "2027-01-01",
      to: "2027-01-31",
    });
    expect(adjacentMonthRange("", "2026-03-31", -1)).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(adjacentMonthRange("", "", -1, new Date(2026, 0, 10))).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });
});
