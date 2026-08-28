import { format, parseISO } from "date-fns";
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

export function monthTitle(value: Date) {
  const label = format(value, "MMMM yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function shortMonth(value: Date) {
  return format(value, "MMM", { locale: ptBR }).replace(".", "");
}
