import type { Shift } from "@financplantoes/shared";
import { Banknote, Building2, CalendarDays, Clock, Plus, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { CalendarMonth } from "../components/CalendarMonth";
import { EmptyState } from "../components/EmptyState";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { ShiftCrudModals, type ShiftModalState } from "../components/ShiftCrudModals";
import { StatCard } from "../components/StatCard";
import { useBootstrap } from "../hooks/useBootstrap";
import { dateLabel, money } from "../lib/formatters";

function sumBy<T>(items: T[], getValue: (item: T) => unknown) {
  return items.reduce((sum, item) => sum + Number(getValue(item) || 0), 0);
}

export function DashboardPage() {
  const bootstrap = useBootstrap();
  const [shiftModal, setShiftModal] = useState<ShiftModalState>(null);
  const [viewDate, setViewDate] = useState(() => new Date());

  if (bootstrap.isLoading) {
    return <LoadingBlock />;
  }

  if (bootstrap.error || !bootstrap.data) {
    return <ErrorBlock error={bootstrap.error} />;
  }

  const { shifts, locations, receivables, spaces, personalExpenses } = bootstrap.data;
  const monthKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;

  const summary = useMemo(() => {
    const monthShifts = shifts.filter((shift) => String(shift.date ?? "").startsWith(monthKey));
    const monthReceivables = receivables.filter((item) => String(item.expected_date ?? "").startsWith(monthKey));
    const activeReceivables = monthReceivables.filter((item) => item.status !== "cancelled");
    const received = sumBy(
      activeReceivables.filter((item) => item.status === "received"),
      (item) => item.amount,
    );
    const pending = sumBy(
      activeReceivables.filter((item) => item.status === "pending" || item.status === "overdue"),
      (item) => item.amount,
    );
    const expenses = sumBy(
      personalExpenses.filter((item) => String(item.expense_date ?? "").startsWith(monthKey)),
      (item) => item.amount,
    );
    const incomeProjected = sumBy(monthShifts, (item) => item.value ?? item.value12);
    const nextReceivable =
      activeReceivables
        .filter((item) => item.status === "pending" || item.status === "overdue")
        .sort((left, right) =>
          String(left.expected_date ?? "").localeCompare(String(right.expected_date ?? "")),
        )[0] ?? null;

    return {
      ...bootstrap.data.summary,
      monthKey,
      incomeProjected,
      received,
      pending,
      expenses,
      net: received - expenses,
      shiftCount: monthShifts.length,
      shiftHours: sumBy(monthShifts, (item) => item.duration),
      activeLocationCount: locations.filter((item) => item.active !== false).length,
      nextReceivable,
    };
  }, [bootstrap.data.summary, locations, monthKey, personalExpenses, receivables, shifts]);

  const upcoming = shifts
    .filter((shift) => shift.date >= new Date().toISOString().slice(0, 10))
    .slice(0, 6);

  function editShift(shift: Shift) {
    setShiftModal({ type: "edit", shift });
  }

  return (
    <>
      <section className="stat-grid">
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
        shifts={shifts}
        viewDate={viewDate}
      />

      <section className="dashboard-columns">
        <article className="work-panel">
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
          {upcoming.length ? (
            <div className="stack">
              {upcoming.map((shift) => (
                <button className="list-button" key={shift.id} onClick={() => editShift(shift)} type="button">
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
            <EmptyState icon={CalendarDays} text="Sua agenda futura ainda esta livre." title="Sem plantoes" />
          )}
        </article>

        <article className="work-panel">
          <header className="section-head">
            <div>
              <p className="eyebrow">Financeiro</p>
              <h2>Recebiveis</h2>
            </div>
          </header>
          {receivables.length ? (
            <div className="stack">
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
            <EmptyState icon={Banknote} text="Valores futuros aparecem aqui." title="Sem recebiveis" />
          )}
        </article>

        <article className="work-panel compact-panel">
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
              <strong>{spaces.length}</strong>
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
