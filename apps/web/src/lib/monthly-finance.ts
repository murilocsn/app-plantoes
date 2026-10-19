import type { Expense, Location, Receivable, Shift } from "@financplantoes/shared";
import { billingPeriod } from "@financplantoes/shared";
import { dateLabel, monthTitle } from "./formatters";

export type DateRange = { from: string; to: string };

export function inDateRange(date: string | null | undefined, range: DateRange) {
  return Boolean(date && (!range.from || date >= range.from) && (!range.to || date <= range.to));
}

export function sumMoney<T>(items: readonly T[], amount: (item: T) => unknown) {
  return (
    items.reduce((cents, item) => {
      const value = Number(amount(item));
      return cents + (Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 100) : 0);
    }, 0) / 100
  );
}

export type ExpenseLedgerEntry = Expense & { type: "personal" | "shared" };

/** Keep distinct locations and personal/shared records separate, even with equal names. */
export function groupExpenseStatements(
  items: readonly ExpenseLedgerEntry[],
  locations: readonly { id: string; name: string }[],
) {
  const names = new Map(locations.map((location) => [location.id, location.name]));
  const groups = new Map<
    string,
    {
      key: string;
      name: string;
      month: string;
      reference: string;
      items: ExpenseLedgerEntry[];
    }
  >();
  for (const item of items) {
    const month = item.expense_date.slice(0, 7);
    const key = JSON.stringify([item.location_card_id || null, item.type, month]);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        name: item.location_card_id
          ? (names.get(item.location_card_id) ?? "Local da despesa")
          : item.type === "personal"
            ? "Pessoais sem local"
            : "Compartilhadas sem local",
        month,
        reference: `Referência: ${monthTitle(new Date(`${month}-01T12:00:00`))}`,
        items: [],
      };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      total: sumMoney(group.items, (item) => item.amount),
      items: [...group.items].sort(
        (left, right) =>
          right.expense_date.localeCompare(left.expense_date) || left.id.localeCompare(right.id),
      ),
    }))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name, "pt-BR") ||
        right.month.localeCompare(left.month) ||
        left.key.localeCompare(right.key),
    );
}

export function reportPeriodTotals(
  data: {
    shifts: readonly Shift[];
    receivables: readonly Receivable[];
    personalExpenses: readonly Expense[];
    sharedExpenses: readonly Expense[];
  },
  range: DateRange,
  locationId = "",
) {
  const shifts = data.shifts.filter(
    (item) => inDateRange(item.date, range) && (!locationId || item.location_id === locationId),
  );
  const paid = data.receivables.filter(
    (item) => item.status === "received" && (!locationId || item.location_id === locationId),
  );
  const expenses = [...data.personalExpenses, ...data.sharedExpenses].filter((item) =>
    inDateRange(item.expense_date, range),
  );
  return {
    shifts,
    projected: sumMoney(shifts, (item) => item.value ?? item.value12 ?? 0),
    received: sumMoney(
      paid.filter((item) => inDateRange(item.received_date, range)),
      (item) => item.amount,
    ),
    expenses: locationId ? null : sumMoney(expenses, (item) => item.amount),
    paidWithoutDate: paid.filter((item) => !item.received_date).length,
  };
}

export function groupBillingReceivables(
  items: readonly Receivable[],
  locations: readonly Location[],
  shifts: readonly Shift[],
) {
  const locationsById = new Map(locations.map((item) => [item.id, item]));
  const shiftsById = new Map(shifts.map((item) => [item.id, item]));
  const groups = new Map<
    string,
    { key: string; name: string; reference: string; items: Receivable[] }
  >();
  for (const item of items) {
    const shift = item.shift_id ? shiftsById.get(item.shift_id) : undefined;
    const locationId = item.location_id || shift?.location_id;
    const location = locationId ? locationsById.get(locationId) : undefined;
    const period = shift && location ? billingPeriod(shift.date, location) : undefined;
    const kind = item.shift_id ? "shifts" : "standalone";
    // Use recorded dates; changing a location must not silently rewrite past bills.
    // Unassigned entries stay separate; equal display names never merge distinct units.
    const key = JSON.stringify([
      item.expected_date || "",
      locationId || item.id,
      kind,
      period?.to || "",
    ]);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        name: location?.name || shift?.location_name || "Sem unidade",
        reference: item.shift_id
          ? period
            ? `Referência: ${dateLabel(period.from)} a ${dateLabel(period.to)}`
            : "Plantões vinculados"
          : "Recebimentos avulsos",
        items: [],
      };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort((left, right) => {
        const leftShift = left.shift_id ? shiftsById.get(left.shift_id) : undefined;
        const rightShift = right.shift_id ? shiftsById.get(right.shift_id) : undefined;
        return (
          (leftShift?.date || "").localeCompare(rightShift?.date || "") ||
          (leftShift?.start_time || "").localeCompare(rightShift?.start_time || "")
        );
      }),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}
