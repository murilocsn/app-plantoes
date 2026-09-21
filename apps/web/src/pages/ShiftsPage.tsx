import type { Shift } from "@financplantoes/shared";
import { CalendarPlus, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/Button";
import { DateField } from "../components/DateField";
import { EmptyState } from "../components/EmptyState";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { ShiftCrudModals, type ShiftModalState } from "../components/ShiftCrudModals";
import { useBootstrap } from "../hooks/useBootstrap";
import { dateLabel } from "../lib/formatters";

const MINUTES_PER_DAY = 24 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

function dateToDayIndex(date: string) {
  const [yearText, monthText, dayText] = date.split("-");
  return Math.floor(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)) / DAY_MS);
}

function timeToMinutes(time?: string | null) {
  const match = time?.match(/^(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function shiftInterval(shift: Pick<Shift, "date" | "start_time" | "duration">) {
  const startMinutes = timeToMinutes(shift.start_time);
  const duration = Number(shift.duration);

  if (startMinutes === null || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  const start = dateToDayIndex(shift.date) * MINUTES_PER_DAY + startMinutes;
  return { start, end: start + duration * 60 };
}

function shiftsOverlap(first: Shift, second: Shift) {
  const firstInterval = shiftInterval(first);
  const secondInterval = shiftInterval(second);

  if (!firstInterval || !secondInterval) {
    return false;
  }

  return firstInterval.start < secondInterval.end && firstInterval.end > secondInterval.start;
}

function endTimeLabel(shift: Shift) {
  const interval = shiftInterval(shift);

  if (!interval) {
    return "--:--";
  }

  const endMinutes = interval.end % MINUTES_PER_DAY;
  const hour = Math.floor(endMinutes / 60);
  const minute = endMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function ShiftsPage() {
  const bootstrap = useBootstrap();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({ from: "", to: "", locationId: "" });
  const [shiftModal, setShiftModal] = useState<ShiftModalState>(null);

  useEffect(() => {
    if (params.get("new")) {
      setShiftModal({ type: "create" });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const filtered = useMemo(() => {
    const shifts = bootstrap.data?.shifts ?? [];

    return shifts.filter((shift) => {
      if (filters.from && shift.date < filters.from) {
        return false;
      }

      if (filters.to && shift.date > filters.to) {
        return false;
      }

      return !filters.locationId || shift.location_id === filters.locationId;
    });
  }, [bootstrap.data?.shifts, filters]);

  // ⚠️ Regras dos Hooks: este useMemo precisa rodar em TODAS as renderizações,
  // antes de qualquer return condicional (mesmo padrão da correção do Dashboard).
  const grouped = useMemo(() => {
    const byDate = new Map<string, Shift[]>();

    for (const shift of filtered) {
      byDate.set(shift.date, [...(byDate.get(shift.date) ?? []), shift]);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, shifts]) => ({
        date,
        shifts: [...shifts].sort((a, b) => {
          const timeCompare = String(a.start_time ?? "").localeCompare(String(b.start_time ?? ""));
          return timeCompare || String(a.location_name ?? "").localeCompare(String(b.location_name ?? ""), "pt-BR");
        }),
      }));
  }, [filtered]);

  const conflictIds = useMemo(() => {
    const ids = new Set<string>();

    for (let index = 0; index < filtered.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < filtered.length; nextIndex += 1) {
        const current = filtered[index];
        const next = filtered[nextIndex];

        if (current && next && shiftsOverlap(current, next)) {
          ids.add(current.id);
          ids.add(next.id);
        }
      }
    }

    return ids;
  }, [filtered]);

  if (bootstrap.isLoading) {
    return <LoadingBlock />;
  }

  if (bootstrap.error || !bootstrap.data) {
    return <ErrorBlock error={bootstrap.error} />;
  }

  function edit(shift: Shift) {
    setShiftModal({ type: "edit", shift });
  }

  return (
    <>
      <section className="page-section">
        <header className="section-head">
          <div>
            <p className="eyebrow">Agenda</p>
            <h2>Plantoes</h2>
          </div>
          <Button onClick={() => setShiftModal({ type: "create" })} variant="primary">
            <CalendarPlus size={18} />
            <span>Novo plantao</span>
          </Button>
        </header>

        <div aria-label="Filtros de plantoes" className="shift-filter-panel">
          <div className="shift-filter-grid">
            <DateField
              label="De"
              name="shift-filter-from"
              onBlur={() => undefined}
              onChange={(from) =>
                setFilters((current) => ({
                  ...current,
                  from,
                  to: current.to && from && current.to < from ? from : current.to,
                }))
              }
              value={filters.from}
            />
            <DateField
              label="Até"
              name="shift-filter-to"
              onBlur={() => undefined}
              onChange={(to) =>
                setFilters((current) => ({
                  ...current,
                  to: current.from && to && to < current.from ? current.from : to,
                }))
              }
              value={filters.to}
            />
            <label className="field">
              <span>Unidade</span>
              <select
                aria-label="Filtrar por unidade"
                value={filters.locationId}
                onChange={(event) => setFilters((current) => ({ ...current, locationId: event.target.value }))}
              >
                <option value="">Todas</option>
                {bootstrap.data.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              className="shift-filter-clear"
              disabled={!filters.from && !filters.to && !filters.locationId}
              onClick={() => setFilters({ from: "", to: "", locationId: "" })}
              variant="ghost"
            >
              <X size={16} />
              <span>Limpar</span>
            </Button>
          </div>
          <p className="filter-summary">
            {filtered.length} {filtered.length === 1 ? "plantao encontrado" : "plantoes encontrados"}
          </p>
        </div>

        {grouped.length ? (
          <div className="shift-date-list">
            {grouped.map((group) => (
              <section className="shift-date-group" key={group.date}>
                <header className="shift-date-head">
                  <strong>{dateLabel(group.date)}</strong>
                  <small>
                    {group.shifts.length} {group.shifts.length === 1 ? "plantao" : "plantoes"}
                  </small>
                </header>
                <div className="shift-card-grid">
                  {group.shifts.map((shift) => (
                    <article className={conflictIds.has(shift.id) ? "shift-card shift-card-conflict" : "shift-card"} key={shift.id}>
                      <div className="shift-card-main">
                        <strong>{shift.location_name || "Local"}</strong>
                        <span>
                          {String(shift.start_time ?? "--:--").slice(0, 5)} - {endTimeLabel(shift)} · {shift.duration}h
                        </span>
                        {conflictIds.has(shift.id) && <em>Conflito de horario</em>}
                      </div>
                      <div className="row-actions">
                        <Button aria-label="Editar" onClick={() => edit(shift)} size="icon" title="Editar">
                          <Pencil size={16} />
                        </Button>
                        <Button
                          aria-label="Excluir"
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
        ) : (
          <EmptyState icon={CalendarPlus} text="Crie seu primeiro plantao para iniciar a agenda." title="Sem plantoes" />
        )}
      </section>

      <ShiftCrudModals
        locations={bootstrap.data.locations}
        modal={shiftModal}
        onClose={() => setShiftModal(null)}
      />
    </>
  );
}
