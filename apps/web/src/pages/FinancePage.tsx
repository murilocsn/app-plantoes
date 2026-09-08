import type { Receivable } from "@financplantoes/shared";
import { Banknote, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { DateField } from "../components/DateField";
import { EmptyState } from "../components/EmptyState";
import { MarkPaidForm } from "../components/forms/MarkPaidForm";
import { ReceivableForm } from "../components/forms/ReceivableForm";
import { Modal } from "../components/Modal";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { StatCard } from "../components/StatCard";
import { useAppMutation, useBootstrap } from "../hooks/useBootstrap";
import { dateKey } from "../lib/calendar";
import { domainApi } from "../lib/domain-api";
import { dateLabel, money } from "../lib/formatters";

function isOverdue(item: Receivable) {
  if (item.status === "received" || item.status === "cancelled") {
    return false;
  }

  return Boolean(item.expected_date && item.expected_date < dateKey(new Date()));
}

function statusLabel(item: Receivable) {
  if (item.status === "cancelled") {
    return "Cancelado";
  }

  if (isOverdue(item)) {
    return "Atrasado";
  }

  return item.status === "received" ? "Recebido" : "Pendente";
}

function isOpenReceivable(item: Receivable) {
  return item.status === "pending" || item.status === "overdue" || isOverdue(item);
}

type ReceivableModal =
  | { type: "create" }
  | { type: "edit"; receivable: Receivable }
  | { type: "paid"; receivable: Receivable }
  | null;

export function FinancePage() {
  const bootstrap = useBootstrap();
  const [modal, setModal] = useState<ReceivableModal>(null);
  const [formError, setFormError] = useState("");
  const [locationId, setLocationId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const showError = (error: Error) => setFormError(error.message);
  const onSuccess = () => {
    setModal(null);
    setFormError("");
  };

  const createReceivable = useAppMutation(domainApi.createReceivable, {
    onSuccess,
    onError: showError,
  });
  const updateReceivable = useAppMutation(
    (input: { id: string; payload: unknown }) => domainApi.updateReceivable(input.id, input.payload),
    { onSuccess, onError: showError },
  );
  const markPaid = useAppMutation(
    (input: { id: string; payload: unknown }) => domainApi.markReceivablePaid(input.id, input.payload),
    { onSuccess, onError: showError },
  );
  const deleteReceivable = useAppMutation((id: string) => domainApi.deleteReceivable(id), {
    onSuccess: () => setFormError(""),
    onError: showError,
  });

  if (bootstrap.isLoading) {
    return <LoadingBlock />;
  }

  if (bootstrap.error || !bootstrap.data) {
    return <ErrorBlock error={bootstrap.error} />;
  }

  // Ordena recebiveis: pendentes/atrasados primeiro (por data), recebidos por ultimo.
  const locationNames = new Map(bootstrap.data.locations.map((location) => [location.id, location.name]));
  const receivables = [...bootstrap.data.receivables]
    .filter((item) => {
      return (
        (!locationId || item.location_id === locationId) &&
        (!from || String(item.expected_date ?? "") >= from) &&
        (!to || String(item.expected_date ?? "") <= to)
      );
    })
    .sort((left, right) => {
    const leftOpen = left.status !== "received";
    const rightOpen = right.status !== "received";
    if (leftOpen !== rightOpen) return leftOpen ? -1 : 1;
    return String(left.expected_date ?? "").localeCompare(String(right.expected_date ?? ""));
  });
  const received = receivables
    .filter((item) => item.status === "received")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pending = receivables.filter(isOpenReceivable).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const overdue = receivables.filter(isOverdue);
  const receivableGroups = Object.values(
    receivables.reduce<Record<string, { date: string; location: string; items: Receivable[]; total: number }>>(
      (groups, item) => {
        const date = item.expected_date ?? "";
        const location = (item.location_id && locationNames.get(item.location_id)) || "Sem unidade";
        const key = `${item.location_id ?? "none"}:${date}`;
        const group = groups[key] ?? { date, location, items: [], total: 0 };
        group.items.push(item);
        group.total += Number(item.amount || 0);
        groups[key] = group;

        return groups;
      },
      {},
    ),
  ).sort((left, right) => {
    const dateOrder = left.date.localeCompare(right.date);
    return dateOrder || left.location.localeCompare(right.location);
  });

  return (
    <>
      <section className="stat-grid two">
        <StatCard icon={Check} label="Recebido" tone="green" value={money(received)} />
        <StatCard icon={Banknote} label="Pendente" tone="amber" value={money(pending)} />
      </section>

      {formError && (
        <p className="form-message" role="alert">
          {formError}
        </p>
      )}

      {overdue.length > 0 && (
        <section className="page-section finance-alert" role="alert">
          <strong>{overdue.length} recebimento{overdue.length === 1 ? "" : "s"} atrasado{overdue.length === 1 ? "" : "s"}</strong>
          <span>O prazo previsto passou. Confira a nota fiscal e registre o pagamento.</span>
        </section>
      )}

      <section className="page-section">
        <header className="section-head">
          <div>
            <p className="eyebrow">Recebimentos</p>
            <h2>Recebiveis por periodo</h2>
          </div>
          <Button onClick={() => setModal({ type: "create" })} variant="primary">
            <Plus size={18} />
            <span>Novo recebivel</span>
          </Button>
        </header>

        <div className="finance-filters">
          <label>
            Unidade
            <select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              <option value="">Todas as unidades</option>
              {bootstrap.data.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <DateField label="Periodo de" name="from" onBlur={() => undefined} onChange={setFrom} value={from} />
          <DateField label="Ate" name="to" onBlur={() => undefined} onChange={setTo} value={to} />
        </div>

        {receivableGroups.length ? (
          <div className="receivable-groups">
            {receivableGroups.map((group) => {
              const groupPending = group.items.filter(isOpenReceivable).length;
              const groupReceived = group.items.length - groupPending;

              return (
                <details className="receivable-period" key={`${group.location}-${group.date}`}>
                  <summary>
                    <div>
                      <strong>{group.location}</strong>
                      <span>
                        {dateLabel(group.date)} - {group.items.length} {group.items.length === 1 ? "recebivel" : "recebiveis"}
                      </span>
                    </div>
                    <div>
                      <b>{money(group.total)}</b>
                      <small>
                        {groupReceived} recebido{groupReceived === 1 ? "" : "s"} / {groupPending} pendente
                        {groupPending === 1 ? "" : "s"}
                      </small>
                    </div>
                  </summary>
                  <div className="table-list">
                    {group.items.map((item) => (
                      <article className="table-row" key={item.id}>
                        <div>
                          <strong>{item.description}</strong>
                          <span>
                            {dateLabel(item.expected_date)} - {statusLabel(item)}
                          </span>
                        </div>
                        <b>{money(item.amount)}</b>
                        <div className="row-actions">
                          {item.status !== "received" && (
                            <Button
                              aria-label="Marcar recebido"
                              onClick={() => setModal({ type: "paid", receivable: item })}
                              size="icon"
                              title="Marcar recebido"
                              variant="primary"
                            >
                              <Check size={16} />
                            </Button>
                          )}
                          <Button
                            aria-label="Editar recebivel"
                            onClick={() => setModal({ type: "edit", receivable: item })}
                            size="icon"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            aria-label="Excluir recebivel"
                            disabled={deleteReceivable.isPending}
                            onClick={() => deleteReceivable.mutate(item.id)}
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
                </details>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Banknote} text="Recebiveis de plantoes e avulsos aparecem aqui." title="Sem recebiveis" />
        )}
      </section>

      {modal?.type === "create" || modal?.type === "edit" ? (
        <Modal
          eyebrow="Recebivel"
          onClose={() => setModal(null)}
          title={modal.type === "create" ? "Novo recebivel" : "Editar recebivel"}
        >
          <ReceivableForm
            locations={bootstrap.data.locations}
            onCancel={() => setModal(null)}
            onSubmit={(values) => {
              if (modal.type === "create") {
                createReceivable.mutate(values);
              } else {
                updateReceivable.mutate({ id: modal.receivable.id, payload: values });
              }
            }}
            receivable={modal.type === "edit" ? modal.receivable : null}
            submitting={createReceivable.isPending || updateReceivable.isPending}
          />
          {formError && <p className="form-message">{formError}</p>}
        </Modal>
      ) : null}

      {modal?.type === "paid" && (
        <Modal eyebrow="Pagamento" onClose={() => setModal(null)} title="Confirmar recebimento">
          <MarkPaidForm
            onCancel={() => setModal(null)}
            onSubmit={(values) => markPaid.mutate({ id: modal.receivable.id, payload: values })}
            submitting={markPaid.isPending}
          />
          {formError && <p className="form-message">{formError}</p>}
        </Modal>
      )}
    </>
  );
}
