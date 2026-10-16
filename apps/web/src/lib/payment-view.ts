import type { Receivable, Shift } from "@financplantoes/shared";
import { dateKey } from "./calendar";

export type PaymentState =
  "paid" | "unpaid" | "pending" | "overdue" | "partial" | "cancelled" | "unlinked" | "unknown";

export const paymentLabels: Record<PaymentState, string> = {
  paid: "Pago",
  unpaid: "Não pago",
  pending: "Pendente",
  overdue: "Atrasado",
  partial: "Parcial",
  cancelled: "Cancelado",
  unlinked: "Sem recebível",
  unknown: "Não informado",
};

export function indexShiftReceivables(receivables: readonly Receivable[]) {
  const index = new Map<string, Receivable[]>();
  for (const item of receivables) {
    if (item.shift_id) index.set(item.shift_id, [...(index.get(item.shift_id) ?? []), item]);
  }
  return index;
}

export function receivablePaymentState(
  status: string,
  expectedDate?: string | null,
  today = dateKey(new Date()),
): PaymentState {
  if (status === "received") return "paid";
  if (status === "cancelled") return "cancelled";
  if (status === "overdue") return "overdue";
  if (status === "pending") {
    return expectedDate && /^\d{4}-\d{2}-\d{2}$/.test(expectedDate) && expectedDate < today
      ? "overdue"
      : "pending";
  }
  return "unknown";
}

export function shiftPaymentState(
  shiftId: string,
  index?: ReadonlyMap<string, readonly Receivable[]>,
): PaymentState {
  if (!index) return "unknown";
  const records = index.get(shiftId);
  if (!records?.length) return "unlinked";
  const active = records.filter((item) => item.status !== "cancelled");
  if (!active.length) return "cancelled";
  const states = active.map((item) => receivablePaymentState(item.status));
  if (states.includes("unknown")) return "unknown";
  if (states.every((state) => state === "paid")) return "paid";
  return states.includes("paid") ? "partial" : "unpaid";
}

export function shiftTimeLabel(shift: Pick<Shift, "start_time" | "duration">) {
  const match = shift.start_time?.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  const hours = Number(match?.[1]);
  const minutes = Number(match?.[2]);
  const duration = Number(shift.duration);
  if (!match || hours > 23 || minutes > 59 || !Number.isFinite(duration) || duration <= 0) {
    return "Horário não informado";
  }
  const end = hours * 60 + minutes + Math.round(duration * 60);
  const days = Math.floor(end / 1440);
  const endHour = String(Math.floor((end % 1440) / 60)).padStart(2, "0");
  const endMinute = String(end % 60).padStart(2, "0");
  return `${match[1]}:${match[2]} – ${endHour}:${endMinute}${days ? ` (+${days}d)` : ""}`;
}

export function monthDateRange(date: Date) {
  return {
    from: dateKey(new Date(date.getFullYear(), date.getMonth(), 1)),
    to: dateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

export function adjacentMonthRange(from: string, to: string, offset: number, now = new Date()) {
  const candidate = from || to;
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? new Date(`${candidate}T12:00:00`) : now;
  const date = Number.isNaN(anchor.getTime()) ? now : anchor;
  return monthDateRange(new Date(date.getFullYear(), date.getMonth() + offset, 1));
}

export function shiftPaymentTotals(shifts: readonly Shift[], receivables: readonly Receivable[]) {
  const ids = new Set(shifts.map((shift) => shift.id));
  const linked = receivables.filter((item) => item.shift_id && ids.has(item.shift_id));
  const linkedIds = new Set(linked.map((item) => item.shift_id));
  return {
    received: linked
      .filter((item) => item.status === "received")
      .reduce((sum, item) => sum + Number(item.amount), 0),
    pending: linked
      .filter((item) => item.status === "pending" || item.status === "overdue")
      .reduce((sum, item) => sum + Number(item.amount), 0),
    unlinked: shifts.filter((shift) => !linkedIds.has(shift.id)).length,
  };
}
