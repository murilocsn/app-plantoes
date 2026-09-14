import type { Shift } from "@financplantoes/shared";

export const calendarColors = [
  "#2563eb",
  "#1d4ed8",
  "#0ea5e9",
  "#06b6d4",
  "#14b8a6",
  "#10b981",
  "#22c55e",
  "#84cc16",
  "#a3e635",
  "#eab308",
  "#facc15",
  "#f59e0b",
  "#fb923c",
  "#f97316",
  "#ef4444",
  "#dc2626",
  "#f43f5e",
  "#e11d48",
  "#ec4899",
  "#db2777",
  "#d946ef",
  "#c026d3",
  "#a855f7",
  "#9333ea",
  "#8b5cf6",
  "#7c3aed",
  "#6366f1",
  "#4f46e5",
  "#64748b",
  "#475569",
  "#0f766e",
  "#15803d",
  "#65a30d",
  "#ca8a04",
  "#c2410c",
  "#be123c",
];
const locationColorsStorageKey = "financplantoes-location-colors";
const fallbackCalendarColor = "#2563eb";

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

  return calendarColors[hash % calendarColors.length] ?? calendarColors[0] ?? fallbackCalendarColor;
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

export function markerColorForShift(shift: Pick<Shift, "location_name" | "marker_color" | "marker_label">) {
  return shift.marker_color || colorFor(shift.marker_label || shift.location_name || "Plantao");
}
