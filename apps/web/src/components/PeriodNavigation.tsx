import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { monthDateRange } from "../lib/payment-view";
import { monthTitle } from "../lib/formatters";
import { Button } from "./Button";

type PeriodNavigationProps = {
  from: string;
  to: string;
  label?: string;
  onNavigate: (offset: number) => void;
  onCurrentMonth: () => void;
};

export function PeriodNavigation({
  from,
  to,
  label = "do período",
  onNavigate,
  onCurrentMonth,
}: PeriodNavigationProps) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T12:00:00`) : null;
  const bounds = date && !Number.isNaN(date.getTime()) ? monthDateRange(date) : null;
  const period =
    bounds && bounds.from === from && bounds.to === to
      ? monthTitle(date!)
      : from || to
        ? "Período selecionado"
        : "Todos os períodos";
  return (
    <header className="payment-period">
      <h3>{period}</h3>
      <div className="payment-period-actions">
        <Button
          aria-label={`Mês anterior ${label}`}
          onClick={() => onNavigate(-1)}
          size="icon"
          title="Mês anterior"
          variant="ghost"
        >
          <ChevronLeft size={20} />
        </Button>
        <Button
          aria-label={`Mês atual ${label}`}
          onClick={onCurrentMonth}
          size="icon"
          title="Mês atual"
          variant="ghost"
        >
          <CalendarDays size={17} />
        </Button>
        <Button
          aria-label={`Próximo mês ${label}`}
          onClick={() => onNavigate(1)}
          size="icon"
          title="Próximo mês"
          variant="ghost"
        >
          <ChevronRight size={20} />
        </Button>
      </div>
    </header>
  );
}
