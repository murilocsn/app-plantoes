import type { Shift } from "@financplantoes/shared";
import { describe, expect, it } from "vitest";
import { orderLocationReport, reportByLocation, summarizeWork } from "./reports";

const shift = (id: string, locationId: string | null, duration: number, value: number): Shift => ({
  id,
  location_id: locationId,
  location_name: "Hospital",
  date: "2026-10-15",
  duration,
  value,
});

describe("work report", () => {
  it("uses weighted value per hour and sums fractional money without floating point drift", () => {
    expect(summarizeWork([shift("a", "a", 12, 720), shift("b", "b", 6, 300)])).toMatchObject({
      value: 1020,
      hours: 18,
      count: 2,
      hourly: 1020 / 18,
    });
    expect(summarizeWork([shift("a", "a", 1.5, 0.1), shift("b", "b", 0.5, 0.2)])).toMatchObject({
      value: 0.3,
      hours: 2,
      hourly: 0.15,
    });
  });

  it("does not invent an hourly value without valid registered hours", () => {
    expect(summarizeWork([])).toMatchObject({ count: 0, hours: 0, value: 0, hourly: null });
    expect(summarizeWork([shift("a", "a", 0, 100), shift("b", "a", 6, 500)])).toMatchObject({
      hours: 6,
      value: 600,
      missingHours: 1,
      hourly: null,
    });
    expect(summarizeWork([shift("a", "a", 6, 0)])).toMatchObject({ value: 0, hourly: 0 });
  });

  it("keeps different units with the same name separate and preserves every shift", () => {
    const input = [
      shift("late", "a", 12, 500),
      { ...shift("early", "a", 6, 300), date: "2026-10-01" },
      shift("other", "b", 6, 400),
      shift("legacy", null, 6, 200),
    ];
    const snapshot = JSON.stringify(input);
    const rows = reportByLocation(input, []);
    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.key === "id:a")?.shifts.map((item) => item.id)).toEqual([
      "early",
      "late",
    ]);
    expect(rows.reduce((total, row) => total + row.count, 0)).toBe(4);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("orders by value, hourly rate and hours without changing the original rows", () => {
    const rows = reportByLocation(
      [shift("a", "a", 48, 2880), shift("b", "b", 36, 2700), shift("c", "c", 12, 600)],
      [],
    );
    expect(orderLocationReport(rows, "value").map((row) => row.key)).toEqual([
      "id:a",
      "id:b",
      "id:c",
    ]);
    expect(orderLocationReport(rows, "hourly").map((row) => row.key)).toEqual([
      "id:b",
      "id:a",
      "id:c",
    ]);
    expect(orderLocationReport(rows, "hours").map((row) => row.key)).toEqual([
      "id:a",
      "id:b",
      "id:c",
    ]);
    expect(rows.map((row) => row.key)).toEqual(["id:a", "id:b", "id:c"]);
  });

  it("shows every unit, including units beyond the previous eight-row limit", () => {
    const rows = reportByLocation(
      Array.from({ length: 10 }, (_, index) => shift(String(index), String(index), 6, 100)),
      [],
    );
    expect(rows).toHaveLength(10);
    expect(rows.reduce((total, row) => total + row.value, 0)).toBe(1000);
  });
});
