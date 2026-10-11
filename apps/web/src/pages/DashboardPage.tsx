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

  const { calendarShifts, locations, summary } = dashboard.data;

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
          shifts={calendarShifts}
          viewDate={viewDate}
        />

        {upcomingByLocation.length > 0 && (
          <section
            className="page-section dashboard-upcoming"
            data-testid="dashboard-upcoming-shifts"
          >
            <header className="section-head">
              <div>
                <p className="eyebrow">Proximos</p>
                <h2>Plantoes por unidade</h2>
              </div>
            </header>
            <div className="shift-groups">
              {upcomingByLocation.map((group) => (
                <section className="shift-group" key={group.location}>
                  <header className="shift-group-head">
                    <strong>{group.location}</strong>
                    <small>
                      {group.shifts.length} {group.shifts.length === 1 ? "plantao" : "plantoes"}
                    </small>
                  </header>
                  <div className="table-list">
                    {group.shifts.map((shift) => (
                      <article className="table-row shift-row" key={shift.id}>
                        <div>
                          <strong>{dateLabel(shift.date)}</strong>
                          <span className="shift-row-meta">
                            {String(shift.start_time ?? "--:--").slice(0, 5)} · {shift.duration}h
                            {shift.marker_label && (
                              <em
                                className="shift-marker-inline"
                                style={{ backgroundColor: markerColorForShift(shift) }}
                                title={shift.marker_label}
                              >
                                {shift.marker_label}
                              </em>
                            )}
                          </span>
                        </div>
                        <div className="row-actions">
                          <Button
                            aria-label="Editar plantao"
                            onClick={() => editShift(shift)}
                            size="icon"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            aria-label="Excluir plantao"
                            onClick={() => setShiftModal({ type: "delete", shift })}
                            size="icon"
                            title="Excluir"
                            variant="danger"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        )}
      </div>

      <ShiftCrudModals
        locations={locations}
        modal={shiftModal}
        onClose={() => setShiftModal(null)}
      />
    </>
  );
}
