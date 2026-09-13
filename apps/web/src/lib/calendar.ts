import type { Shift } from "@financplantoes/shared";

export const calendarColors = ["#2458d3", "#167e62", "#c94c3a", "#9b6a14", "#6f56c9", "#08758f", "#d14d8b", "#5b6472"];
const locationColorsStorageKey = "financplantoes-location-colors";

export function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate(),
  ).padStart(2, "0")}`;
}

export function monthDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const start = new Date(year, month, 1 - new Date(year, month, 1).getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function isNightShift(shift: Shift) {
  const hour = Number(String(shift.start_time || "00:00").slice(0, 2));
  return hour >= 18 || hour < 6;
}

export function colorFor(text: string) {
  let hash = 0;

  for (const char of text.toLowerCase()) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return calendarColors[hash % calendarColors.length];
}

export function readLocationColors() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const value = window.localStorage.getItem(locationColorsStorageKey);
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function colorForLocation(name: string, colors = readLocationColors()) {
  return colors[name] || colorFor(name);
}
