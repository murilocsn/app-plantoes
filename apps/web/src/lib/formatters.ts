import { format, isValid, parse, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function money(value: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

export function dateLabel(value?: string | null, fallback = "-") {
  if (!value) {
    return fallback;
  }

  return format(parseISO(value), "dd/MM/yyyy", { locale: ptBR });
}

export function parseDateInput(value: string) {
  const text = value.trim();
  const pattern = /^\d{8}$/.test(text) ? "ddMMyyyy" : "dd/MM/yyyy";

  if (pattern === "dd/MM/yyyy" && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
    return null;
  }

  const date = parse(text, pattern, new Date());
  return isValid(date) ? format(date, "yyyy-MM-dd") : null;
}

export function monthTitle(value: Date) {
  const label = format(value, "MMMM yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function shortMonth(value: Date) {
  return format(value, "MMM", { locale: ptBR }).replace(".", "");
}
