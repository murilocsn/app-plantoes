import type { Shift } from "@financplantoes/shared";
import { Banknote, Building2, CalendarDays, Clock, Plus, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { CalendarMonth } from "../components/CalendarMonth";
import { EmptyState } from "../components/EmptyState";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { ShiftCrudModals, type ShiftModalState } from "../components/ShiftCrudModals";
import { StatCard } from "../components/StatCard";
import { useDashboardOverview } from "../hooks/useBootstrap";
import { dateLabel, money } from "../lib/formatters";

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

  const { calendarShifts, upcomingShifts, locations, receivables, spaceCount, summary } =
    dashboard.data;

  function editShift(shift: Shift) {
    setShiftModal({ type: "edit", shift });
  }

  return (
    <>
      <section className="stat-grid" data-testid="dashboard-stats">
        <StatCard
          detail={`${summary.shiftCount} plantoes no mes`}
          icon={TrendingUp}
          label="Projetado"
          tone="blue"
          value={money(summary.incomeProjected)}
        />
        <StatCard
          detail="Recebiveis baixados"
          icon={Banknote}
          label="Recebido"
          tone="green"
          value={money(summary.received)}
        />
        <StatCard
          detail="A receber ou atrasado"
          icon={Clock}
          label="Pendente"
          tone="amber"
          value={money(summary.pending)}
        />
        <StatCard
          detail={`${summary.activeLocationCount} locais ativos`}
          icon={Building2}
          label="Rede"
          tone="coral"
          value={`${summary.shiftHours}h`}
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

      <section className="dashboard-columns" data-testid="dashboard-columns">
        <article className="work-panel" data-testid="upcoming-shifts-panel">
          <header className="section-head">
            <div>
              <p className="eyebrow">Proximos</p>
              <h2>Plantoes</h2>
            </div>
            <Button onClick={() => setShiftModal({ type: "create" })} variant="ghost">
              <Plus size={18} />
              <span>Novo</span>
            </Button>
          </header>
          {upcomingShifts.length ? (
            <div className="stack" data-testid="upcoming-shifts-list">
              {upcomingShifts.map((shift) => (
                <button
                  className="list-button"
                  key={shift.id}
                  onClick={() => editShift(shift)}
                  type="button"
                >
                  <span>
                    <strong>{shift.location_name}</strong>
                    <small>
                      {dateLabel(shift.date)} - {String(shift.start_time ?? "--:--").slice(0, 5)}
                    </small>
                  </span>
                  <b>{money(shift.value ?? shift.value12)}</b>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              text="Sua agenda futura ainda esta livre."
              title="Sem plantoes"
            />
          )}
        </article>

        <article className="work-panel" data-testid="receivables-panel">
          <header className="section-head">
            <div>
              <p className="eyebrow">Financeiro</p>
              <h2>Recebiveis</h2>
            </div>
          </header>
          {receivables.length ? (
            <div className="stack" data-testid="receivables-list">
              {receivables.slice(0, 6).map((item) => (
                <div className="row-item" key={item.id}>
                  <span>
                    <strong>{item.description}</strong>
                    <small>{dateLabel(item.expected_date)}</small>
                  </span>
                  <b>{money(item.amount)}</b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Banknote}
              text="Valores futuros aparecem aqui."
              title="Sem recebiveis"
            />
          )}
        </article>

        <article className="work-panel compact-panel" data-testid="spaces-panel">
          <header className="section-head">
            <div>
              <p className="eyebrow">Contextos</p>
              <h2>Espacos</h2>
            </div>
          </header>
          <div className="mini-grid">
            <span>
              <strong>{locations.length}</strong>
              Locais
            </span>
            <span>
              <strong>{spaceCount}</strong>
              Espacos
            </span>
          </div>
        </article>
      </section>

      <ShiftCrudModals
        locations={locations}
        modal={shiftModal}
        onClose={() => setShiftModal(null)}
      />
    </>
  );
}
