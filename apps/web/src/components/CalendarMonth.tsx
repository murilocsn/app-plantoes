import type { Shift } from "@financplantoes/shared";
import type { KeyboardEvent } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { dateKey, isNightShift, markerColorForShift, monthDays } from "../lib/calendar";
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

type CalendarView = "month" | "week";

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function dateFromKey(value: string) {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function weekDaysFromKey(value: string) {
  const selected = dateFromKey(value);
  const start = new Date(selected);
  start.setDate(selected.getDate() - selected.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function shiftCountLabel(count: number) {
  if (count === 0) {
    return "sem plantoes";
  }

  return `${count} ${count === 1 ? "plantao" : "plantoes"}`;
}

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
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const dayRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const days = useMemo(() => monthDays(viewDate), [viewDate]);
  const visibleDays = useMemo(
    () => (calendarView === "month" ? days : weekDaysFromKey(selectedDate)),
    [calendarView, days, selectedDate],
  );
  const todayKey = dateKey(new Date());
  const shiftsByDay = useMemo(() => {
    return shifts.reduce<Record<string, Shift[]>>((acc, shift) => {
      acc[shift.date] = [...(acc[shift.date] ?? []), shift];
      return acc;
    }, {});
  }, [shifts]);
  const selectedShifts = shiftsByDay[selectedDate] ?? [];
  const legendItems = useMemo(() => {
    const items = new Map<string, { color: string; label: string }>();

    for (const shift of shifts) {
      const label = shift.marker_label || shift.location_name || "Plantao";
      const color = markerColorForShift(shift);
      items.set(`${label}-${color}`, { color, label });
    }

    return [...items.values()].sort((left, right) =>
      left.label.localeCompare(right.label, "pt-BR"),
    );
  }, [shifts]);
  const hasNightShift = useMemo(() => shifts.some(isNightShift), [shifts]);

  useEffect(() => {
    if (!focusDate) {
      return;
    }

    dayRefs.current[focusDate]?.focus();
    setFocusDate(null);
  }, [focusDate, visibleDays]);

  function updateViewDate(next: Date) {
    if (onViewDateChange) {
      onViewDateChange(next);
    } else {
      setInternalViewDate(next);
    }
  }

  function selectDate(nextDate: Date, shouldFocus = false) {
    const nextKey = dateKey(nextDate);
    setSelectedDate(nextKey);

    if (
      nextDate.getMonth() !== viewDate.getMonth() ||
      nextDate.getFullYear() !== viewDate.getFullYear()
    ) {
      updateViewDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    }

    if (shouldFocus) {
      setFocusDate(nextKey);
    }
  }

  function changeMonth(offset: number) {
    const selected = dateFromKey(selectedDate);
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    const nextDay = Math.min(selected.getDate(), daysInMonth(next.getFullYear(), next.getMonth()));
    const nextSelected = new Date(next.getFullYear(), next.getMonth(), nextDay);

    setSelectedDate(dateKey(nextSelected));
    updateViewDate(nextSelected);
    setFocusDate(dateKey(nextSelected));
  }

  function goToToday() {
    const today = new Date();
    setSelectedDate(dateKey(today));
    updateViewDate(today);
    setFocusDate(dateKey(today));
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, key: string) {
    const current = dateFromKey(key);
    const next = new Date(current);

    if (event.key === "ArrowLeft") {
      next.setDate(current.getDate() - 1);
    } else if (event.key === "ArrowRight") {
      next.setDate(current.getDate() + 1);
    } else if (event.key === "ArrowUp") {
      next.setDate(current.getDate() - 7);
    } else if (event.key === "ArrowDown") {
      next.setDate(current.getDate() + 7);
    } else if (event.key === "Home") {
      next.setDate(current.getDate() - current.getDay());
    } else if (event.key === "End") {
      next.setDate(current.getDate() + (6 - current.getDay()));
    } else {
      return;
    }

    event.preventDefault();
    selectDate(next, true);
  }

  return (
    <section className="calendar-tool">
      <header className="section-head calendar-head">
        <div>
          <p className="eyebrow">Agenda</p>
          <h2>{monthTitle(viewDate)}</h2>
        </div>
        <div className="calendar-head-actions">
          <div
            className="calendar-view-toggle"
            aria-label="Visualizacao do calendario"
            role="group"
          >
            <button
              aria-pressed={calendarView === "month"}
              className={calendarView === "month" ? "active" : ""}
              onClick={() => setCalendarView("month")}
              type="button"
            >
              Mes
            </button>
            <button
              aria-pressed={calendarView === "week"}
              className={calendarView === "week" ? "active" : ""}
              onClick={() => setCalendarView("week")}
              type="button"
            >
              Semana
            </button>
          </div>
          <div className="inline-actions calendar-month-actions">
            <Button
              aria-label="Mes anterior"
              onClick={() => changeMonth(-1)}
              size="icon"
              title="Mes anterior"
            >
              <ChevronLeft size={18} />
            </Button>
            <Button onClick={goToToday}>Hoje</Button>
            <Button
              aria-label="Proximo mes"
              onClick={() => changeMonth(1)}
              size="icon"
              title="Proximo mes"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      </header>

      <div className="calendar-layout">
        <div className="calendar-panel">
          <div className="calendar-grid" aria-label={`Calendario de ${monthTitle(viewDate)}`}>
            {weekdays.map((weekday) => (
              <span className="calendar-weekday" key={weekday}>
                {weekday}
              </span>
            ))}
            {visibleDays.map((day) => {
              const key = dateKey(day);
              const items = shiftsByDay[key] ?? [];
              const muted = day.getMonth() !== viewDate.getMonth();
              const label = [
                dateLabel(key),
                shiftCountLabel(items.length),
                key === todayKey ? "hoje" : "",
                key === selectedDate ? "selecionado" : "",
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <button
                  aria-current={key === todayKey ? "date" : undefined}
                  aria-label={label}
                  aria-pressed={key === selectedDate}
                  className={[
                    "calendar-day",
                    calendarView === "week" ? "week-day" : "",
                    muted ? "muted-day" : "",
                    key === selectedDate ? "selected-day" : "",
                    key === todayKey ? "today" : "",
                  ].join(" ")}
                  key={key}
                  onClick={() => selectDate(day)}
                  onKeyDown={(event) => handleDayKeyDown(event, key)}
                  ref={(node) => {
                    dayRefs.current[key] = node;
                  }}
                  type="button"
                >
                  <strong>{day.getDate()}</strong>
                  <span className="day-dots" aria-hidden="true">
                    {items.slice(0, 5).map((shift) => (
                      <i
                        className={isNightShift(shift) ? "night-dot" : ""}
                        key={shift.id}
                        style={{ backgroundColor: markerColorForShift(shift) }}
                        title={shift.marker_label || shift.location_name || "Plantao"}
                      />
                    ))}
                  </span>
                  {items.length > 5 && <small>+{items.length - 5}</small>}
                </button>
              );
            })}
          </div>

          <div className="calendar-legend" aria-label="Legenda do calendario">
            {legendItems.length > 0 ? (
              <>
                {legendItems.slice(0, 6).map((item) => (
                  <span key={`${item.label}-${item.color}`}>
                    <i style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                ))}
                {legendItems.length > 6 && <small>+{legendItems.length - 6} marcadores</small>}
                {hasNightShift && (
                  <span>
                    <i className="night-dot" />
                    Noturno
                  </span>
                )}
              </>
            ) : (
              <span>Nenhum plantao no periodo.</span>
            )}
          </div>
        </div>

        <section
          aria-live="polite"
          className={selectedShifts.length ? "day-detail" : "day-detail day-detail-free"}
        >
          <header className="day-detail-head">
            <div>
              <p className="eyebrow">Dia selecionado</p>
              <h3>{dateLabel(selectedDate)}</h3>
            </div>
            <Button
              className="day-detail-create"
              onClick={() => onCreate(selectedDate)}
              variant="ghost"
            >
              <Plus size={18} />
              <span>Plantao</span>
            </Button>
          </header>
          {selectedShifts.length ? (
            <div className="stack">
              {selectedShifts.map((shift) => (
                <article className="row-item" key={shift.id}>
                  <i
                    aria-hidden="true"
                    className={isNightShift(shift) ? "row-dot night-dot" : "row-dot"}
                    style={{ backgroundColor: markerColorForShift(shift) }}
                  />
                  <div>
                    <strong>{shift.location_name || "Local"}</strong>
                    <span>
                      {String(shift.start_time ?? "--:--").slice(0, 5)} - {shift.duration}h
                      {shift.marker_label ? ` - ${shift.marker_label}` : ""}
                    </span>
                  </div>
                  <b>{money(shift.value ?? shift.value12)}</b>
                  <div className="row-actions">
                    <Button
                      aria-label="Editar plantao"
                      onClick={() => onEdit(shift)}
                      size="icon"
                      title="Editar"
                    >
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
