import type { Expense, Location, Receivable, Shift } from "@financplantoes/shared";
import { describe, expect, it } from "vitest";
import {
  groupBillingReceivables,
  groupExpenseStatements,
  inDateRange,
  reportPeriodTotals,
  sumMoney,
  type ExpenseLedgerEntry,
} from "./monthly-finance";

const unit: Location = {
  id: "a",
  name: "Hospital",
  value12: 500,
  reference_start_day: 26,
  reference_end_day: 25,
  payment_due_day: 10,
  payment_due_months_after: 1,
};
const shift = (id: string, date: string, locationId = "a", value = 500): Shift => ({
  id,
  date,
  location_id: locationId,
  location_name: "Hospital",
  value,
  duration: 6,
  start_time: "07:00",
});
const receipt = (
  id: string,
  date: string,
  shiftId: string | null,
  locationId = "a",
): Receivable => ({
  id,
  shift_id: shiftId,
  location_id: locationId,
  description: id,
  amount: 500,
  status: "pending",
  expected_date: date,
});
const expense = (date: string, amount: number): Expense => ({
  id: date,
  description: "Expense",
  expense_date: date,
  amount,
});

describe("expense statement grouping", () => {
  const entry = (
    id: string,
    date: string,
    amount: number,
    location?: string,
    type: "personal" | "shared" = "personal",
  ): ExpenseLedgerEntry => ({
    id,
    expense_date: date,
    amount,
    description: id,
    location_card_id: location,
    type,
  });
  it("groups by location and reference month, keeping equal location names separate", () => {
    const groups = groupExpenseStatements(
      [
        entry("first", "2026-10-01", 100.01, "a"),
        entry("second", "2026-10-02", 0.02, "a"),
        entry("previous", "2026-09-30", 20, "a"),
        entry("other", "2026-10-01", 50, "b"),
      ],
      [
        { id: "a", name: "Hospital" },
        { id: "b", name: "Hospital" },
      ],
    );
    expect(groups).toHaveLength(3);
    const october = groups.find((group) => group.items.some((item) => item.id === "first"))!;
    expect(october.total).toBe(100.03);
    expect(october.reference).toBe("Referência: Outubro 2026");
    expect(october.items.map((item) => item.id)).toEqual(["second", "first"]);
    expect(groups.find((group) => group.items[0]?.id === "previous")?.reference).toBe(
      "Referência: Setembro 2026",
    );
  });
  it("keeps personal/shared expenses without a location visible in distinct groups", () => {
    const groups = groupExpenseStatements(
      [entry("personal", "2026-10-18", 10), entry("shared", "2026-10-18", 30, undefined, "shared")],
      [],
    );
    expect(groups.map((group) => group.name)).toEqual([
      "Compartilhadas sem local",
      "Pessoais sem local",
    ]);
    expect(sumMoney(groups, (group) => group.total)).toBe(40);
  });
  it("sorts references across years without changing the original records", () => {
    const items = [entry("december", "2026-12-31", 1, "a"), entry("january", "2027-01-01", 2, "a")];
    const groups = groupExpenseStatements(items, [{ id: "a", name: "Casa" }]);
    expect(groups.map((group) => group.month)).toEqual(["2027-01", "2026-12"]);
    expect(items.map((item) => item.id)).toEqual(["december", "january"]);
  });
});

describe("monthly finance", () => {
  it("separates production, actual payment and expense dates without accumulated balances", () => {
    const result = reportPeriodTotals(
      {
        shifts: [
          shift("before", "2026-08-31", "a", 9000),
          shift("start", "2026-09-01"),
          shift("end", "2026-09-30", "b", 300),
          shift("after", "2026-10-01", "a", 8000),
        ],
        receivables: [
          {
            ...receipt("paid", "2026-08-10", "before"),
            status: "received",
            received_date: "2026-09-01",
            amount: 200,
          },
          {
            ...receipt("next", "2026-09-10", "start"),
            status: "received",
            received_date: "2026-10-01",
            amount: 700,
          },
          {
            ...receipt("cancelled", "2026-09-10", null),
            status: "cancelled",
            received_date: "2026-09-01",
            amount: 1000,
          },
          { ...receipt("missing-date", "2026-09-10", null), status: "received", amount: 900 },
        ],
        personalExpenses: [
          expense("2026-08-31", 1000),
          expense("2026-09-01", 0.1),
          expense("2026-09-30", 0.2),
        ],
        sharedExpenses: [expense("2026-09-15", 50), expense("2026-10-01", 3000)],
      },
      { from: "2026-09-01", to: "2026-09-30" },
    );
    expect(result).toMatchObject({
      projected: 800,
      received: 200,
      expenses: 50.3,
      paidWithoutDate: 1,
    });
    expect(result.shifts.map((item) => item.id)).toEqual(["start", "end"]);
  });

  it("applies the unit filter without attributing unrelated expenses to a unit", () => {
    const result = reportPeriodTotals(
      {
        shifts: [shift("a", "2026-09-15"), shift("b", "2026-09-15", "b")],
        receivables: [],
        personalExpenses: [expense("2026-09-15", 20)],
        sharedExpenses: [],
      },
      { from: "2026-09-01", to: "2026-09-30" },
      "b",
    );
    expect(result).toMatchObject({ projected: 500, received: 0, expenses: null });
    expect(inDateRange(null, { from: "", to: "" })).toBe(false);
    expect(sumMoney([0.1, 0.2], (value) => value)).toBe(0.3);
  });

  it("groups the same unit and reference while preserving every individual shift and recorded date", () => {
    const shifts = [
      shift("first", "2026-08-26"),
      shift("last", "2026-09-25"),
      shift("next-cycle", "2026-09-26"),
    ];
    const items = [
      receipt("last", "2026-10-10", "last"),
      receipt("first", "2026-10-10", "first"),
      receipt("next", "2026-11-10", "next-cycle"),
    ];
    const snapshot = JSON.stringify(items);
    const groups = groupBillingReceivables(items, [unit], shifts);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.items.map((item) => item.id)).toEqual(["first", "last"]);
    expect(groups[0]!.reference).toContain("26/08/2026 a 25/09/2026");
    expect(groups[1]!.reference).toContain("26/09/2026 a 25/10/2026");
    expect(JSON.stringify(items)).toBe(snapshot);
  });

  it("keeps distinct units, reference cycles, standalone items and payment overrides separate", () => {
    const date = "2026-10-10";
    const groups = groupBillingReceivables(
      [
        receipt("a", date, "a"),
        receipt("b", date, "b", "b"),
        receipt("free", date, null),
        receipt("later-cycle", date, "next"),
        receipt("override", "2026-10-11", "a"),
      ],
      [unit, { ...unit, id: "b" }],
      [shift("a", "2026-08-26"), shift("b", "2026-08-26", "b"), shift("next", "2026-09-26")],
    );
    expect(groups).toHaveLength(5);
    expect(groups.flatMap((group) => group.items)).toHaveLength(5);
    expect(groups.find((group) => group.items[0]?.id === "free")?.reference).toBe(
      "Recebimentos avulsos",
    );
  });
});
