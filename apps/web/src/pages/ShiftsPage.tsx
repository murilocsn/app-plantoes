import type { Shift } from "@financplantoes/shared";
import { CalendarPlus, Pencil, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { ShiftCrudModals, type ShiftModalState } from "../components/ShiftCrudModals";
import { useBootstrap } from "../hooks/useBootstrap";
import { dateLabel, money } from "../lib/formatters";

export function ShiftsPage() {
  const bootstrap = useBootstrap();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [shiftModal, setShiftModal] = useState<ShiftModalState>(null);

  useEffect(() => {
    if (params.get("new")) {
      setShiftModal({ type: "create" });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const shifts = bootstrap.data?.shifts ?? [];

    if (!term) {
      return shifts;
    }

    return shifts.filter((shift) =>
      [shift.location_name, shift.date, shift.professional, shift.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [bootstrap.data?.shifts, search]);

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

        <div className="toolbar-row">
          <label className="search-box">
            <Search size={18} />
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por local, data ou observacao"
              value={search}
            />
          </label>
        </div>

        {filtered.length ? (
          <div className="table-list">
            {filtered.map((shift) => (
              <article className="table-row" key={shift.id}>
                <div>
                  <strong>{shift.location_name}</strong>
                  <span>
                    {dateLabel(shift.date)} - {String(shift.start_time ?? "--:--").slice(0, 5)}
                  </span>
                </div>
                <span>{shift.duration}h</span>
                <b>{money(shift.value ?? shift.value12)}</b>
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
