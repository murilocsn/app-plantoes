import type { Location, Shift } from "@financplantoes/shared";
import { sumMoney } from "./monthly-finance";

export type ReportOrder = "value" | "hours" | "hourly" | "count" | "name";

export function summarizeWork(shifts: readonly Shift[]) {
  let minutes = 0;
  let missingHours = 0;
  for (const shift of shifts) {
    const duration = Number(shift.duration);
    if (Number.isFinite(duration) && duration > 0) minutes += Math.round(duration * 60);
    else missingHours += 1;
  }
  const hours = minutes / 60;
  const value = sumMoney(shifts, (shift) => shift.value ?? shift.value12 ?? 0);
  return {
    count: shifts.length,
    hours,
    value,
    missingHours,
    hourly: hours > 0 && !missingHours ? value / hours : null,
  };
}

export function reportByLocation(shifts: readonly Shift[], locations: readonly Location[]) {
  const names = new Map(locations.map((location) => [location.id, location.name]));
  const groups = new Map<string, { key: string; name: string; shifts: Shift[] }>();
  for (const shift of shifts) {
    const key = shift.location_id ? `id:${shift.location_id}` : `name:${shift.location_name || ""}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        name:
          (shift.location_id && names.get(shift.location_id)) ||
          shift.location_name ||
          "Local não informado",
        shifts: [],
      };
      groups.set(key, group);
    }
    group.shifts.push(shift);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    ...summarizeWork(group.shifts),
    shifts: [...group.shifts].sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        (left.start_time || "").localeCompare(right.start_time || ""),
    ),
  }));
}

export function orderLocationReport(rows: ReturnType<typeof reportByLocation>, order: ReportOrder) {
  return [...rows].sort((left, right) => {
    if (order !== "name") {
      if (order === "hourly") {
        if (left.hourly === null && right.hourly !== null) return 1;
        if (right.hourly === null && left.hourly !== null) return -1;
      }
      const difference = (right[order] ?? 0) - (left[order] ?? 0);
      if (difference) return difference;
    }
    return left.name.localeCompare(right.name, "pt-BR") || left.key.localeCompare(right.key);
  });
}
