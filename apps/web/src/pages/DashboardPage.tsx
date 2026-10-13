import type { Shift } from "@financplantoes/shared";
import { Banknote, CalendarDays, Clock, MapPin } from "lucide-react";
import { useState } from "react";
import { CalendarMonth } from "../components/CalendarMonth";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { ShiftCrudModals, type ShiftModalState } from "../components/ShiftCrudModals";
import { StatCard } from "../components/StatCard";
import { useDashboardOverview } from "../hooks/useBootstrap";
import { money } from "../lib/formatters";

function monthParam(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

export function DashboardPage() {
  const [shiftModal, setShiftModal] = useState<ShiftModalState>(null);
  const [viewDate, setViewDate] = useState(() => new Date());
  const monthKey = monthParam(viewDate);
  const dashboard = useDashboardOverview(monthKey);

  if (dashboard.isLoading) {
    return <LoadingBlock />;
  }

  if (dashboard.error || !dashboard.data) {
    return <ErrorBlock error={dashboard.error} />;
  }

  const { calendarShifts, locations, receivables, summary } = dashboard.data;

  function editShift(shift: Shift) {
    setShiftModal({ type: "edit", shift });
  }

  return (
    <>
      <div className="dashboard-page">
        <section className="dashboard-summary-grid" aria-label="Resumo do painel">
          <StatCard
            detail={`${summary.shiftCount} ${summary.shiftCount === 1 ? "plantao" : "plantoes"}`}
            icon={Banknote}
            label="Previsto no mes"
            tone="blue"
            value={money(summary.incomeProjected)}
          />
          <StatCard
            detail={summary.pending > 0 ? `Pendente ${money(summary.pending)}` : "Sem pendencias"}
            icon={CalendarDays}
            label="Recebido"
            tone="green"
            value={money(summary.received)}
          />
          <StatCard
            detail={`${summary.shiftHours}h registradas`}
            icon={Clock}
            label="Horas de plantao"
            tone="amber"
            value={summary.shiftHours}
          />
          <StatCard
            detail={`${locations.length} ${locations.length === 1 ? "local cadastrado" : "locais cadastrados"}`}
            icon={MapPin}
            label="Locais ativos"
            tone="coral"
            value={summary.activeLocationCount}
          />
        </section>

        <CalendarMonth
          onCreate={(date) => setShiftModal({ type: "create", date })}
          onDelete={(shift) => setShiftModal({ type: "delete", shift })}
          onEdit={editShift}
          onViewDateChange={setViewDate}
          receivables={receivables}
          shifts={calendarShifts}
          viewDate={viewDate}
        />
      </div>

      <ShiftCrudModals
        locations={locations}
        modal={shiftModal}
        onClose={() => setShiftModal(null)}
      />
    </>
  );
}
