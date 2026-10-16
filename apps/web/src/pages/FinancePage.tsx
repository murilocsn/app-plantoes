import type { Receivable } from "@financplantoes/shared";
import { Banknote, Check, ChevronDown, Pencil, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { DateField } from "../components/DateField";
import { EmptyState } from "../components/EmptyState";
import { Field } from "../components/Field";
import { LedgerRow } from "../components/LedgerRow";
import { PaymentSummary } from "../components/PaymentSummary";
import { MarkPaidForm } from "../components/forms/MarkPaidForm";
import { ReceivableForm } from "../components/forms/ReceivableForm";
import { Modal } from "../components/Modal";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { useAppMutation, useBootstrap } from "../hooks/useBootstrap";
import { domainApi } from "../lib/domain-api";
import { dateKey } from "../lib/calendar";
import { dateGroupLabel, money } from "../lib/formatters";
import {
  adjacentMonthRange,
  monthDateRange,
  receivablePaymentState,
  shiftTimeLabel,
} from "../lib/payment-view";

function isOpenReceivable(item: Receivable) {
  return item.status !== "received" && item.status !== "cancelled";
}

type ReceivableStatusFilter = "all" | "pending" | "received" | "overdue";

type ReceivableFilters = {
  query: string;
  from: string;
  to: string;
  locationId: string;
  status: ReceivableStatusFilter;
};

const emptyReceivableFilters: ReceivableFilters = {
  query: "",
  from: "",
  to: "",
  locationId: "",
  status: "all",
};

const statusFilterOptions: Array<{ value: ReceivableStatusFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "received", label: "Pagos" },
  { value: "overdue", label: "Atrasados" },
];

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type ReceivableModal =
  | { type: "create" }
  | { type: "edit"; receivable: Receivable }
  | { type: "paid"; receivable: Receivable }
  | { type: "bulk-paid"; receivables: Receivable[] }
  | null;

export function FinancePage() {
  const bootstrap = useBootstrap();
  const [modal, setModal] = useState<ReceivableModal>(null);
  const [formError, setFormError] = useState("");
  const [filters, setFilters] = useState<ReceivableFilters>(emptyReceivableFilters);

  const showError = (error: Error) => setFormError(error.message);
  const onSuccess = () => {
    setModal(null);
    setFormError("");
  };
  const openModal = (nextModal: Exclude<ReceivableModal, null>) => {
    setFormError("");
    setModal(nextModal);
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
  const markFilteredPaid = useAppMutation(
    (input: { ids: string[]; payload: unknown }) =>
      Promise.all(input.ids.map((id) => domainApi.markReceivablePaid(id, input.payload))),
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
  const receivables = [...bootstrap.data.receivables].sort((left, right) => {
    const leftOpen = isOpenReceivable(left);
    const rightOpen = isOpenReceivable(right);
    if (leftOpen !== rightOpen) return leftOpen ? -1 : 1;
    return String(left.expected_date ?? "").localeCompare(String(right.expected_date ?? ""));
  });
  const locationsById = new Map(bootstrap.data.locations.map((location) => [location.id, location.name]));
  const today = dateKey(new Date());
  const paymentStates = new Map(receivables.map((item) => [
    item.id, receivablePaymentState(item.status, item.expected_date, today),
  ]));
  const filteredReceivables = receivables.filter((item) => {
    const expectedDate = item.expected_date ?? "";
    const locationName = item.location_id ? locationsById.get(item.location_id) ?? "" : "";
    const searchTarget = normalizeSearchText(`${item.description} ${locationName}`);
    const query = normalizeSearchText(filters.query.trim());

    if (query && !searchTarget.includes(query)) {
      return false;
    }

    if (filters.from && (!expectedDate || expectedDate < filters.from)) {
      return false;
    }

    if (filters.to && (!expectedDate || expectedDate > filters.to)) {
      return false;
    }

    if (filters.locationId && item.location_id !== filters.locationId) {
      return false;
    }

    if (filters.status === "received" && item.status !== "received") {
      return false;
    }

    if (filters.status === "pending" && (!isOpenReceivable(item) || paymentStates.get(item.id) === "overdue")) {
      return false;
    }

    if (filters.status === "overdue" && paymentStates.get(item.id) !== "overdue") {
      return false;
    }

    return true;
  });
  const filteredOpenReceivables = filteredReceivables.filter(isOpenReceivable);
  const received = filteredReceivables
    .filter((item) => item.status === "received")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pending = filteredOpenReceivables
    .filter((item) => paymentStates.get(item.id) !== "overdue")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const overdue = filteredReceivables.filter((item) => paymentStates.get(item.id) === "overdue");
  const overdueTotal = overdue.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const hasActiveFilters = Boolean(
    filters.query || filters.from || filters.to || filters.locationId || filters.status !== "all",
  );
  const resultLabel =
    filteredReceivables.length === receivables.length
      ? `${receivables.length} ${receivables.length === 1 ? "recebimento" : "recebimentos"}`
      : `${filteredReceivables.length} de ${receivables.length} recebimentos`;
  const bulkActionLabel =
    filteredOpenReceivables.length > 1
      ? `Marcar ${filteredOpenReceivables.length} pagos`
      : "Marcar pago";
  const shiftsById = new Map(bootstrap.data.shifts.map((shift) => [shift.id, shift]));
  const byDate = new Map<string, Receivable[]>();
  for (const item of filteredReceivables) {
    const date = item.expected_date || "";
    byDate.set(date, [...(byDate.get(date) ?? []), item]);
  }
  const dateGroups = [...byDate.entries()].sort(([left], [right]) =>
    left && right ? left.localeCompare(right) : left ? -1 : right ? 1 : 0,
  );

  return (
    <>
      {formError && !modal && (
        <p className="form-message" role="alert">
          {formError}
        </p>
      )}

      <section className="page-section ledger-page">
        <header className="section-head">
          <div>
            <p className="eyebrow">Recebimentos</p>
            <h2>Recebimentos e pendências</h2>
          </div>
          <Button onClick={() => openModal({ type: "create" })} variant="primary">
            <Plus size={18} />
            <span>Novo recebivel</span>
          </Button>
        </header>

        <PaymentSummary
          countLabel={`${filteredReceivables.length} ${filteredReceivables.length === 1 ? "recebimento" : "recebimentos"}`}
          from={filters.from}
          onCurrentMonth={() => setFilters((current) => ({ ...current, ...monthDateRange(new Date()) }))}
          onNavigate={(offset) => setFilters((current) => ({ ...current, ...adjacentMonthRange(current.from, current.to, offset) }))}
          overdue={overdueTotal}
          pending={pending}
          received={received}
          to={filters.to}
          total={received + pending + overdueTotal}
        />

        {overdue.length > 0 && (
          <div className="finance-alert finance-alert-inline" role="alert">
            <strong>{overdue.length} recebimento{overdue.length === 1 ? "" : "s"} atrasado{overdue.length === 1 ? "" : "s"}</strong>
            <span>O prazo previsto passou. Confira a nota fiscal e registre o pagamento.</span>
          </div>
        )}

        <details className="ledger-filters">
          <summary>
            <SlidersHorizontal aria-hidden="true" size={16} />
            <span>Filtros</span>
            <small>{resultLabel}</small>
            <ChevronDown aria-hidden="true" className="filter-chevron" size={16} />
          </summary>
          <div aria-label="Filtros de recebimentos" className="finance-filter-panel">
            <div className="finance-search-row">
              <Field label="Busca">
                <div className="input-icon">
                  <Search size={18} />
                  <input
                    onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                    placeholder="Descricao ou unidade"
                    type="search"
                    value={filters.query}
                  />
                </div>
              </Field>
              <Button
                className="finance-filter-clear"
                disabled={!hasActiveFilters}
                onClick={() => setFilters(emptyReceivableFilters)}
                variant="ghost"
              >
                <X size={16} />
                <span>Limpar</span>
              </Button>
            </div>

            <details className="finance-advanced-filters">
              <summary>
                <SlidersHorizontal aria-hidden="true" size={16} />
                <span>Período e unidade</span>
                {(filters.from || filters.to || filters.locationId) && <small>Ativos</small>}
                <ChevronDown aria-hidden="true" className="filter-chevron" size={16} />
              </summary>
              <div className="finance-filter-grid">
                <DateField
                  label="De"
                  name="receivable-filter-from"
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
                  name="receivable-filter-to"
                  onBlur={() => undefined}
                  onChange={(to) =>
                    setFilters((current) => ({
                      ...current,
                      to: current.from && to && to < current.from ? current.from : to,
                    }))
                  }
                  value={filters.to}
                />
                <Field label="Unidade">
                  <select
                    onChange={(event) => setFilters((current) => ({ ...current, locationId: event.target.value }))}
                    value={filters.locationId}
                  >
                    <option value="">Todas</option>
                    {bootstrap.data.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </details>
            <div className="field">
              <span>Status</span>
              <div aria-label="Status do recebimento" className="finance-status-filter" role="group">
                {statusFilterOptions.map((option) => (
                  <button
                    aria-pressed={filters.status === option.value}
                    className={`finance-status-option${filters.status === option.value ? " active" : ""}`}
                    key={option.value}
                    onClick={() => setFilters((current) => ({ ...current, status: option.value }))}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="finance-result-row">
              <p className="filter-summary">{resultLabel}</p>
              {hasActiveFilters && (
                <Button
                  className="finance-bulk-button"
                  disabled={!filteredOpenReceivables.length || markFilteredPaid.isPending}
                  onClick={() => openModal({ type: "bulk-paid", receivables: filteredOpenReceivables })}
                  variant="primary"
                >
                  <Check size={17} />
                  <span>{bulkActionLabel}</span>
                </Button>
              )}
            </div>
          </div>
        </details>

        <div aria-label="Cores dos recebimentos" className="payment-legend" role="group">
          <span className="payment-legend-item" data-payment-state="paid">Pago</span>
          <span className="payment-legend-item" data-payment-state="pending">Pendente</span>
          <span className="payment-legend-item" data-payment-state="overdue">Atrasado</span>
        </div>

        {filteredReceivables.length ? (
          <div aria-label="Recebimentos por data prevista" className="shift-date-list">
            {dateGroups.map(([date, items]) => (
              <section className="shift-date-group" key={date}>
                <header className="shift-date-head">
                  <strong>{date ? dateGroupLabel(date) : "Sem data prevista"}</strong>
                </header>
                <div className="ledger-list">
                  {items.map((item) => {
                    const shift = item.shift_id ? shiftsById.get(item.shift_id) : undefined;
                    const locationName = item.location_id ? locationsById.get(item.location_id) : undefined;
                    return (
                      <LedgerRow
                        amount={Number(item.amount)}
                        entryType="receivable"
                        key={item.id}
                        paymentState={paymentStates.get(item.id) ?? "unknown"}
                        subtitle={shift?.location_name ? item.description : locationName || "Avulso"}
                        time={shift ? shiftTimeLabel(shift) : "Recebimento avulso"}
                        title={shift?.location_name || item.description}
                      >
                        {isOpenReceivable(item) && (
                          <Button
                            aria-label="Marcar recebido"
                            onClick={() => openModal({ type: "paid", receivable: item })}
                            size="icon"
                            title="Marcar recebido"
                            variant="primary"
                          >
                            <Check size={16} />
                          </Button>
                        )}
                        <Button
                          aria-label="Editar recebivel"
                          onClick={() => openModal({ type: "edit", receivable: item })}
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
                      </LedgerRow>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Banknote}
            text={
              receivables.length
                ? "Ajuste os filtros para ampliar a busca."
                : "Recebiveis de plantoes e avulsos aparecem aqui."
            }
            title={receivables.length ? "Nenhum resultado" : "Sem recebiveis"}
          />
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
              setFormError("");
              if (modal.type === "create") {
                createReceivable.mutate(values);
              } else {
                updateReceivable.mutate({ id: modal.receivable.id, payload: values });
              }
            }}
            receivable={modal.type === "edit" ? modal.receivable : null}
            submitting={createReceivable.isPending || updateReceivable.isPending}
          />
          {formError && (
            <p className="form-message" role="alert">
              {formError}
            </p>
          )}
        </Modal>
      ) : null}

      {modal?.type === "paid" && (
        <Modal eyebrow="Pagamento" onClose={() => setModal(null)} title="Confirmar recebimento">
          <MarkPaidForm
            onCancel={() => setModal(null)}
            onSubmit={(values) => {
              setFormError("");
              markPaid.mutate({ id: modal.receivable.id, payload: values });
            }}
            submitting={markPaid.isPending}
          />
          {formError && (
            <p className="form-message" role="alert">
              {formError}
            </p>
          )}
        </Modal>
      )}

      {modal?.type === "bulk-paid" && (
        <Modal eyebrow="Pagamento" onClose={() => setModal(null)} title="Confirmar recebimentos">
          <div className="bulk-payment-summary">
            <strong>
              {modal.receivables.length} recebimento{modal.receivables.length === 1 ? "" : "s"} pendente
              {modal.receivables.length === 1 ? "" : "s"}
            </strong>
            <span>
              Total: {money(modal.receivables.reduce((sum, item) => sum + Number(item.amount || 0), 0))}
            </span>
          </div>
          <MarkPaidForm
            onCancel={() => setModal(null)}
            onSubmit={(values) => {
              setFormError("");
              markFilteredPaid.mutate({
                ids: modal.receivables.map((item) => item.id),
                payload: values,
              });
            }}
            submitting={markFilteredPaid.isPending}
          />
          {formError && (
            <p className="form-message" role="alert">
              {formError}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
