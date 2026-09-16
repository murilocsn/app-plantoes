import type { Shift } from "@financplantoes/shared";

export const calendarColorOptions = [
  { name: "Azul vivo", color: "#2563eb" },
  { name: "Verde folha", color: "#16a34a" },
  { name: "Vermelho", color: "#dc2626" },
  { name: "Amarelo", color: "#eab308" },
  { name: "Roxo", color: "#7c3aed" },
  { name: "Ciano", color: "#0891b2" },
  { name: "Laranja", color: "#ea580c" },
  { name: "Rosa", color: "#db2777" },
  { name: "Teal", color: "#0f766e" },
  { name: "Indigo", color: "#4f46e5" },
  { name: "Lima", color: "#65a30d" },
  { name: "Vinho", color: "#be123c" },
  { name: "Ouro", color: "#ca8a04" },
  { name: "Magenta", color: "#c026d3" },
  { name: "Coral", color: "#f97316" },
  { name: "Esmeralda", color: "#059669" },
  { name: "Azul petroleo", color: "#0e7490" },
  { name: "Grafite", color: "#475569" },
  { name: "Pink", color: "#e11d48" },
  { name: "Verde musgo", color: "#4d7c0f" },
  { name: "Lilas", color: "#8b5cf6" },
  { name: "Tangerina", color: "#fb923c" },
  { name: "Ceu", color: "#0ea5e9" },
  { name: "Jade", color: "#14b8a6" },
  { name: "Lavanda", color: "#a78bfa" },
  { name: "Mostarda", color: "#a16207" },
  { name: "Salmao", color: "#f43f5e" },
  { name: "Ameixa", color: "#9333ea" },
  { name: "Turquesa", color: "#06b6d4" },
  { name: "Grama", color: "#22c55e" },
  { name: "Carvao", color: "#334155" },
  { name: "Marinho", color: "#1d4ed8" },
  { name: "Menta", color: "#10b981" },
  { name: "Cereja", color: "#b91c1c" },
  { name: "Fucsia", color: "#ec4899" },
  { name: "Oliva", color: "#84cc16" },
] as const;

export const calendarColors = calendarColorOptions.map(({ color }) => color);
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
