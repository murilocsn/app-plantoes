import type { Shift } from "@financplantoes/shared";
import { CalendarPlus, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { colorFor, dateKey, isNightShift, monthDays } from "../lib/calendar";
import { dateLabel, money, monthTitle } from "../lib/formatters";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

type CalendarMonthProps = {
  shifts: Shift[];
  viewDate?: Date;
  onViewDateChange?: (date: Date) => void;
  onCreate: (date?: string) => void;
  onEdit: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
};

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export function CalendarMonth({
  shifts,
  viewDate: controlledViewDate,
  onViewDateChange,
  onCreate,
  onEdit,
  onDelete,
}: CalendarMonthProps) {
  const [internalViewDate, setInternalViewDate] = useState(() => new Date());
  const viewDate = controlledViewDate ?? internalViewDate;
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const days = useMemo(() => monthDays(viewDate), [viewDate]);
  const shiftsByDay = useMemo(() => {
    return shifts.reduce<Record<string, Shift[]>>((acc, shift) => {
      acc[shift.date] = [...(acc[shift.date] ?? []), shift];
      return acc;
    }, {});
  }, [shifts]);
  const selectedShifts = shiftsByDay[selectedDate] ?? [];
  const legends = [...new Set(shifts.map((shift) => shift.location_name || "Local"))];

  function changeMonth(offset: number) {
    const next = new Date(viewDate);
    next.setMonth(viewDate.getMonth() + offset);
    if (onViewDateChange) {
      onViewDateChange(next);
    } else {
      setInternalViewDate(next);
    }
  }

  function updateViewDate(next: Date) {
    if (onViewDateChange) {
      onViewDateChange(next);
    } else {
      setInternalViewDate(next);
    }
  }

  return (
    <section className="calendar-tool">
      <header className="section-head">
        <div>
          <p className="eyebrow">Agenda</p>
          <h2>{monthTitle(viewDate)}</h2>
        </div>
        <div className="inline-actions">
          <Button aria-label="Mes anterior" onClick={() => changeMonth(-1)} size="icon" title="Mes anterior">
            <ChevronLeft size={18} />
          </Button>
          <Button onClick={() => updateViewDate(new Date())}>Hoje</Button>
          <Button aria-label="Proximo mes" onClick={() => changeMonth(1)} size="icon" title="Proximo mes">
            <ChevronRight size={18} />
          </Button>
        </div>
      </header>

      <div className="calendar-grid">
        {weekdays.map((weekday) => (
          <span className="calendar-weekday" key={weekday}>
            {weekday}
          </span>
        ))}
        {days.map((day) => {
          const key = dateKey(day);
          const items = shiftsByDay[key] ?? [];
          const muted = day.getMonth() !== viewDate.getMonth();

          return (
            <button
              className={[
                "calendar-day",
                muted ? "muted-day" : "",
                key === selectedDate ? "selected-day" : "",
                key === dateKey(new Date()) ? "today" : "",
              ].join(" ")}
              key={key}
              onClick={() => setSelectedDate(key)}
              type="button"
            >
              <strong>{day.getDate()}</strong>
              <span className="day-dots">
                {items.slice(0, 5).map((shift) => (
                  <i
                    className={isNightShift(shift) ? "night-dot" : ""}
                    key={shift.id}
                    style={{ backgroundColor: colorFor(shift.location_name || "Local") }}
                    title={shift.location_name}
                  />
                ))}
              </span>
              {items.length > 5 && <small>+{items.length - 5}</small>}
            </button>
          );
        })}
      </div>

      <div className="calendar-footer">
        <div className="legend">
          {legends.length ? (
            legends.map((name) => (
              <span key={name}>
                <i style={{ backgroundColor: colorFor(name) }} />
                {name}
              </span>
            ))
          ) : (
            <span className="muted">Sem locais no calendario</span>
          )}
        </div>

        <section className="day-detail">
          <header className="day-detail-head">
            <div>
              <p className="eyebrow">Dia selecionado</p>
              <h3>{dateLabel(selectedDate)}</h3>
            </div>
            <Button onClick={() => onCreate(selectedDate)} variant="ghost">
              <Plus size={18} />
              <span>Plantao</span>
            </Button>
          </header>
          {selectedShifts.length ? (
            <div className="stack">
              {selectedShifts.map((shift) => (
                <article className="row-item" key={shift.id}>
                  <i
                    className={isNightShift(shift) ? "row-dot night-dot" : "row-dot"}
                    style={{ backgroundColor: colorFor(shift.location_name || "Local") }}
                  />
                  <div>
                    <strong>{shift.location_name}</strong>
                    <span>
                      {String(shift.start_time ?? "--:--").slice(0, 5)} - {shift.duration}h
                    </span>
                  </div>
                  <b>{money(shift.value ?? shift.value12)}</b>
                  <div className="row-actions">
                    <Button aria-label="Editar plantao" onClick={() => onEdit(shift)} size="icon" title="Editar">
                      <Pencil size={16} />
                    </Button>
                    <Button
                      aria-label="Excluir plantao"
                      onClick={() => onDelete(shift)}
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
          ) : (
            <EmptyState icon={CalendarPlus} text="Nenhum plantao neste dia." title="Dia livre" />
          )}
        </section>
      </div>
    </section>
  );
}
