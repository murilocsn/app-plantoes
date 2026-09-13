import type { Shift } from "@financplantoes/shared";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { CalendarMonth } from "../components/CalendarMonth";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { ShiftCrudModals, type ShiftModalState } from "../components/ShiftCrudModals";
import { useDashboardOverview } from "../hooks/useBootstrap";
import { colorForLocation } from "../lib/calendar";
import { dateLabel } from "../lib/formatters";

function monthParam(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

export function DashboardPage() {
  const [shiftModal, setShiftModal] = useState<ShiftModalState>(null);
  const [viewDate, setViewDate] = useState(() => new Date());
  const monthKey = monthParam(viewDate);
  const dashboard = useDashboardOverview(monthKey);
  const upcomingByLocation = useMemo(() => {
    const byLocation = new Map<string, Shift[]>();

    for (const shift of dashboard.data?.upcomingShifts ?? []) {
      const key = shift.location_name || "Local";
      byLocation.set(key, [...(byLocation.get(key) ?? []), shift]);
    }

    return [...byLocation.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "pt-BR"))
      .map(([location, shifts]) => ({
        location,
        shifts: [...shifts].sort((left, right) => left.date.localeCompare(right.date)),
      }));
  }, [dashboard.data?.upcomingShifts]);

  if (dashboard.isLoading) {
    return <LoadingBlock />;
  }

  if (dashboard.error || !dashboard.data) {
    return <ErrorBlock error={dashboard.error} />;
  }

  const { calendarShifts, locations } = dashboard.data;

  function editShift(shift: Shift) {
    setShiftModal({ type: "edit", shift });
  }

  return (
    <>
      <CalendarMonth
        onCreate={(date) => setShiftModal({ type: "create", date })}
        onDelete={(shift) => setShiftModal({ type: "delete", shift })}
        onEdit={editShift}
        onViewDateChange={setViewDate}
        shifts={calendarShifts}
        viewDate={viewDate}
      />

      {upcomingByLocation.length > 0 && (
        <section className="page-section dashboard-upcoming" data-testid="dashboard-upcoming-shifts">
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
                  <i style={{ backgroundColor: colorForLocation(group.location) }} aria-hidden="true" />
                  <strong>{group.location}</strong>
                  <small>{group.shifts.length} {group.shifts.length === 1 ? "plantao" : "plantoes"}</small>
                </header>
                <div className="table-list">
                  {group.shifts.map((shift) => (
                    <article className="table-row shift-row" key={shift.id}>
                      <div>
                        <strong>{dateLabel(shift.date)}</strong>
                        <span>{String(shift.start_time ?? "--:--").slice(0, 5)} · {shift.duration}h</span>
                      </div>
                      <div className="row-actions">
                        <Button aria-label="Editar plantao" onClick={() => editShift(shift)} size="icon" title="Editar">
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

      <ShiftCrudModals
        locations={locations}
        modal={shiftModal}
        onClose={() => setShiftModal(null)}
      />
    </>
  );
}
