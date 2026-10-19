import {
  Bell,
  ChevronDown,
  Plus,
  Receipt,
  RefreshCw,
  SlidersHorizontal,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import {
  expenseCardAvailable,
  type ExpenseLocationCard,
  type SharedExpenseCard,
} from "@financplantoes/shared";
import { lazy, Suspense, useRef, useState } from "react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ExpenseInbox } from "../components/ExpenseInbox";
import { ExpenseLedger } from "../components/ExpenseLedger";
import { ExpenseLocations, ExpenseLocationDetails } from "../components/ExpenseLocations";
import { ExpenseLocationForm } from "../components/forms/ExpenseLocationForm";
import { ExpenseInviteForm } from "../components/forms/ExpenseInviteForm";
import { Field } from "../components/Field";
import { DateField } from "../components/DateField";
import { Modal } from "../components/Modal";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { StatCard } from "../components/StatCard";
import { PeriodNavigation } from "../components/PeriodNavigation";
import { useAppMutation, useExpenses } from "../hooks/useBootstrap";
import { domainApi } from "../lib/domain-api";
import { money } from "../lib/formatters";
import { adjacentMonthRange, monthDateRange } from "../lib/payment-view";
import { inDateRange, sumMoney } from "../lib/monthly-finance";

const ExpenseForm = lazy(() =>
  import("../components/forms/ExpenseForm").then((module) => ({ default: module.ExpenseForm })),
);
type ExpenseMode = "personal" | "shared";
type ExpenseModal =
  | { type: "expense"; mode?: ExpenseMode; locationId?: string }
  | { type: "new-location" }
  | { type: "location" | "edit-location"; id: string }
  | { type: "invite"; card: SharedExpenseCard | ExpenseLocationCard }
  | { type: "inbox" }
  | null;
const PAGE_SIZE = 20;

export function ExpensesPage() {
  const query = useExpenses();
  const [modal, setModal] = useState<ExpenseModal>(null);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [formError, setFormError] = useState("");
  const [period, setPeriod] = useState(() => monthDateRange(new Date()));
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [notice, setNotice] = useState("");
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const openModal = (value: ExpenseModal, trigger?: HTMLElement) => {
    returnFocusTo.current =
      trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setFormError("");
    setNotice("");
    setCreatingLocation(false);
    setModal(value);
  };
  const showError = (error: Error) => setFormError(error.message);
  const onSuccess = () => {
    setModal(null);
    setFormError("");
  };
  const createPersonal = useAppMutation(domainApi.createPersonalExpense, {
    onSuccess,
    onError: showError,
  });
  const createShared = useAppMutation(domainApi.addLocatedSharedExpense, {
    onSuccess,
    onError: showError,
  });
  const createLocation = useAppMutation(domainApi.createExpenseLocation, {
    onSuccess: () => {
      setFormError("");
      if (modal?.type === "expense") {
        setCreatingLocation(false);
        setNotice("Local criado. Selecione-o no formulário.");
      } else {
        setModal(null);
        setNotice("Local criado.");
      }
    },
    onError: showError,
  });
  const renameLocation = useAppMutation(domainApi.renameExpenseLocation, {
    onSuccess,
    onError: showError,
  });
  const sendLegacyInvite = useAppMutation(domainApi.inviteExpenseParticipant, {
    onSuccess: () => {
      onSuccess();
      setNotice("Convite enviado.");
    },
    onError: showError,
  });
  const sendLocationInvite = useAppMutation(domainApi.inviteExpenseLocation, {
    onSuccess: () => {
      onSuccess();
      setNotice("Convite enviado. O acesso será liberado após o aceite.");
    },
    onError: showError,
  });
  const replyInvite = useAppMutation(domainApi.respondExpenseInvitation, {
    onSuccess: () => {
      setFormError("");
      setNotice("Resposta registrada.");
    },
    onError: showError,
  });
  const cancelInvite = useAppMutation(domainApi.cancelExpenseInvitation, {
    onSuccess: () => {
      setFormError("");
      setNotice("Convite cancelado.");
    },
    onError: showError,
  });
  const busy = [
    createPersonal,
    createShared,
    createLocation,
    renameLocation,
    sendLegacyInvite,
    sendLocationInvite,
    replyInvite,
    cancelInvite,
  ].some((mutation) => mutation.isPending);
  const closeModal = () => {
    if (!busy) {
      setModal(null);
      setFormError("");
    }
  };

  if (query.isLoading) return <LoadingBlock />;
  if (!query.data) return <ErrorBlock error={query.error} />;
  const { personal, shared, expenseSharing: sharing } = query.data;
  const locations = sharing.locations ?? [];
  const locationsAvailable = sharing.available && Array.isArray(sharing.locations);
  const locationsById = new Map(locations.map((location) => [location.id, location]));
  const entries = [
    ...personal.map((expense) => ({ ...expense, type: "personal" as const })),
    ...shared.map((expense) => ({ ...expense, type: "shared" as const })),
  ]
    .filter((expense) => inDateRange(expense.expense_date, period))
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date) || a.id.localeCompare(b.id));
  const personalTotal = sumMoney(
    entries.filter((item) => item.type === "personal"),
    (item) => item.amount,
  );
  const sharedTotal = sumMoney(
    entries.filter((item) => item.type === "shared"),
    (item) => item.amount,
  );
  const filtered = entries.filter(
    (expense) =>
      (!type || expense.type === type) &&
      (!category || expense.category === category) &&
      (!locationFilter || expense.location_card_id === locationFilter),
  );
  const categories = [
    ...new Set(
      [...personal, ...shared]
        .map((expense) => expense.category)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
  const currentMonth = monthDateRange(new Date());
  const hasActiveFilters = Boolean(
    type ||
    category ||
    locationFilter ||
    period.from !== currentMonth.from ||
    period.to !== currentMonth.to,
  );
  const activeLocation =
    modal && (modal.type === "location" || modal.type === "edit-location")
      ? locationsById.get(modal.id)
      : undefined;
  const invitations = sharing.invitations;
  const title =
    modal?.type === "expense"
      ? modal.mode
        ? `Nova despesa ${modal.mode === "personal" ? "pessoal" : "compartilhada"}`
        : "Nova despesa"
      : modal?.type === "inbox"
        ? "Convites recebidos"
        : modal?.type === "invite"
          ? "Convidar pessoa"
          : modal?.type === "edit-location"
            ? "Editar local"
            : modal?.type === "location"
              ? (activeLocation?.name ?? "Local")
              : "Novo local";
  const cancelInvitation = (id: string) => {
    setFormError("");
    cancelInvite.mutate(id);
  };
  const refreshError = query.isRefetchError ? (
    <p className="form-message" role="alert">
      Não foi possível atualizar as despesas. {query.error.message}
    </p>
  ) : null;
  const availabilityNotice = !locationsAvailable ? (
    <div className="section-head" role="status">
      <p className="muted">
        O cadastro de locais está indisponível no momento. Você pode continuar registrando despesas
        pessoais sem local.
      </p>
      <Button size="sm" disabled={query.isFetching || busy} onClick={() => void query.refetch()}>
        <RefreshCw aria-hidden="true" size={16} className={query.isFetching ? "spin" : undefined} />
        <span>{query.isFetching ? "Verificando..." : "Verificar disponibilidade"}</span>
      </Button>
    </div>
  ) : null;

  return (
    <>
      <header className="section-head expenses-page-head">
        <div>
          <p className="eyebrow">Controle do mês</p>
          <h2>Despesas</h2>
          <p className="muted">Seus gastos pessoais e sua parte nas despesas compartilhadas.</p>
        </div>
        <Button
          onClick={(event) => {
            openModal({ type: "inbox" }, event.currentTarget);
            void query.refetch();
          }}
          disabled={!sharing.available}
          variant="secondary"
        >
          <Bell size={17} />
          <span>Convites ({invitations.length})</span>
        </Button>
      </header>
      <PeriodNavigation
        {...period}
        label="das despesas"
        onCurrentMonth={() => {
          setPeriod(monthDateRange(new Date()));
          setVisibleCount(PAGE_SIZE);
        }}
        onNavigate={(offset) => {
          setPeriod((current) => adjacentMonthRange(current.from, current.to, offset));
          setVisibleCount(PAGE_SIZE);
        }}
      />
      <section aria-label="Resumo financeiro" className="stat-grid expense-summary">
        <StatCard icon={Receipt} label="Pessoal" tone="coral" value={money(personalTotal)} />
        <StatCard icon={UsersRound} label="Compartilhado" tone="amber" value={money(sharedTotal)} />
        <StatCard
          icon={Wallet}
          label="Total no período"
          tone="blue"
          value={money(sumMoney(entries, (item) => item.amount))}
        />
      </section>
      {notice && !modal && (
        <p className="muted" role="status">
          {notice}
        </p>
      )}
      {!modal && refreshError}
      {!modal && availabilityNotice}
      {formError && !modal && (
        <p className="form-message" role="alert">
          {formError}
        </p>
      )}
      <section
        className="page-section ledger-page expense-section expense-ledger-page"
        aria-label="Despesas cadastradas"
      >
        <header className="section-head">
          <div>
            <p className="eyebrow">Por local e referência</p>
            <h2>Despesas cadastradas</h2>
          </div>
          <Button
            onClick={(event) => openModal({ type: "expense" }, event.currentTarget)}
            variant="primary"
          >
            <Plus size={18} />
            <span>Nova despesa</span>
          </Button>
        </header>
        <details className="ledger-filters expense-filter-toggle">
          <summary>
            <SlidersHorizontal aria-hidden="true" size={16} />
            <span>Filtros</span>
            <small>
              {filtered.length} {filtered.length === 1 ? "despesa" : "despesas"}
              {hasActiveFilters ? " · Filtrado" : ""}
            </small>
            <ChevronDown aria-hidden="true" className="filter-chevron" size={16} />
          </summary>
          <div className="finance-filter-panel">
            <div className="expense-filters">
              <DateField
                label="De"
                name="expense-filter-from"
                value={period.from}
                onBlur={() => undefined}
                onChange={(from) => {
                  setPeriod((current) => ({
                    from,
                    to: current.to && from && current.to < from ? from : current.to,
                  }));
                  setVisibleCount(PAGE_SIZE);
                }}
              />
              <DateField
                label="Até"
                name="expense-filter-to"
                value={period.to}
                onBlur={() => undefined}
                onChange={(to) => {
                  setPeriod((current) => ({
                    from: current.from && to && to < current.from ? current.from : to,
                    to,
                  }));
                  setVisibleCount(PAGE_SIZE);
                }}
              />
              <Field label="Tipo de despesa">
                <select
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                >
                  <option value="">Todos os tipos</option>
                  <option value="personal">Pessoal</option>
                  <option value="shared">Compartilhada</option>
                </select>
              </Field>
              <Field label="Categoria">
                <select
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                >
                  <option value="">Todas as categorias</option>
                  {categories.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
              <Field label="Local">
                <select
                  value={locationFilter}
                  onChange={(event) => {
                    setLocationFilter(event.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                >
                  <option value="">Todos os locais</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Button
              className="expense-filter-clear"
              variant="ghost"
              disabled={!hasActiveFilters}
              onClick={() => {
                setType("");
                setCategory("");
                setLocationFilter("");
                setPeriod(currentMonth);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              <X size={15} />
              <span>Limpar filtros</span>
            </Button>
          </div>
        </details>
        <div className="expense-ledger-caption">
          <span>Despesas por local</span>
          <small>Valores da sua parte no período</small>
        </div>
        {filtered.length ? (
          <ExpenseLedger
            entries={filtered}
            locations={locations}
            legacyCards={sharing.cards}
            visibleCount={visibleCount}
            busy={busy}
            onInvite={(card, trigger) => openModal({ type: "invite", card }, trigger)}
            onCancelInvitation={cancelInvitation}
          />
        ) : (
          <EmptyState
            icon={Receipt}
            title="Nenhuma despesa encontrada"
            text="Cadastre uma despesa ou ajuste os filtros do período."
          />
        )}
        {filtered.length > visibleCount && (
          <Button onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            Mostrar mais despesas ({filtered.length - visibleCount})
          </Button>
        )}
      </section>
      <ExpenseLocations
        locations={locations}
        expenses={entries}
        sharedCards={sharing.cards}
        available={locationsAvailable}
        onCreate={(trigger) => openModal({ type: "new-location" }, trigger)}
        onOpen={(id, trigger) => openModal({ type: "location", id }, trigger)}
      />
      {modal && (
        <Modal
          title={creatingLocation ? "Novo local" : title}
          manageFocus
          closeDisabled={busy}
          returnFocusTo={returnFocusTo.current}
          onClose={closeModal}
        >
          {refreshError}
          {availabilityNotice}
          {notice && (
            <p className="muted" role="status">
              {notice}
            </p>
          )}
          {modal.type === "expense" && (
            <>
              {!modal.mode ? (
                <div className="expense-mode-choices">
                  <p className="muted">Como deseja cadastrar esta despesa?</p>
                  <Button
                    variant="secondary"
                    onClick={() => setModal({ ...modal, mode: "personal" })}
                  >
                    <Receipt size={20} />
                    <span>
                      Despesa pessoal<small>Somente você tem acesso.</small>
                    </span>
                  </Button>
                  <Button
                    disabled={!locationsAvailable}
                    variant="secondary"
                    onClick={() => setModal({ ...modal, mode: "shared" })}
                  >
                    <UsersRound size={20} />
                    <span>
                      Despesa compartilhada<small>Vinculada a um local com participantes.</small>
                    </span>
                  </Button>
                </div>
              ) : (
                <>
                  <div hidden={creatingLocation}>
                    <Suspense fallback={<LoadingBlock />}>
                      <ExpenseForm
                        key={modal.mode}
                        mode={modal.mode}
                        locations={locations}
                        canCreateLocation={locationsAvailable}
                        active={!creatingLocation}
                        initialLocationId={modal.locationId}
                        error={formError}
                        onCancel={closeModal}
                        onCreateLocation={() => {
                          setFormError("");
                          setCreatingLocation(true);
                        }}
                        onSubmit={(values) => {
                          if (modal.mode === "personal") createPersonal.mutate(values);
                          else if (values.location_card_id)
                            createShared.mutate({
                              ...values,
                              location_card_id: values.location_card_id,
                            });
                        }}
                        submitting={busy}
                      />
                    </Suspense>
                  </div>
                  {creatingLocation && (
                    <ExpenseLocationForm
                      initialVisibility={modal.mode}
                      error={formError}
                      submitting={busy}
                      onCancel={() => {
                        setCreatingLocation(false);
                        setFormError("");
                      }}
                      onSubmit={(input) => createLocation.mutate(input)}
                    />
                  )}
                </>
              )}
            </>
          )}
          {(modal.type === "new-location" ||
            (modal.type === "edit-location" && activeLocation?.is_owner)) && (
            <ExpenseLocationForm
              location={activeLocation}
              error={formError}
              submitting={busy}
              onCancel={closeModal}
              onSubmit={(input) =>
                activeLocation
                  ? renameLocation.mutate({ id: activeLocation.id, name: input.name })
                  : createLocation.mutate(input)
              }
            />
          )}
          {modal.type === "location" && activeLocation && (
            <ExpenseLocationDetails
              location={activeLocation}
              expenses={entries}
              busy={busy}
              error={formError}
              onCancelInvitation={cancelInvitation}
              onCreateExpense={() =>
                setModal({
                  type: "expense",
                  mode: activeLocation.visibility,
                  locationId: activeLocation.id,
                })
              }
              onEdit={() => setModal({ type: "edit-location", id: activeLocation.id })}
              onInvite={() => setModal({ type: "invite", card: activeLocation })}
            />
          )}
          {modal.type === "invite" && (
            <>
              <div className="expense-invite-context">
                <strong>{"name" in modal.card ? modal.card.name : modal.card.description}</strong>
              </div>
              <ExpenseInviteForm
                forLocation={"name" in modal.card}
                available={"name" in modal.card ? 0 : expenseCardAvailable(modal.card)}
                error={formError}
                submitting={busy}
                onCancel={closeModal}
                onSubmit={(input) => {
                  if ("name" in modal.card)
                    sendLocationInvite.mutate({ id: modal.card.id, email: input.email });
                  else sendLegacyInvite.mutate({ id: modal.card.id, ...input });
                }}
              />
            </>
          )}
          {modal.type === "inbox" && (
            <>
              {query.isFetching && (
                <p className="muted" role="status">
                  Atualizando convites…
                </p>
              )}
              {formError && (
                <p className="form-message" role="alert">
                  {formError}
                </p>
              )}
              <ExpenseInbox
                invitations={invitations}
                busy={busy || query.isFetching}
                onReply={(id, action) => replyInvite.mutate({ id, action })}
              />
            </>
          )}
        </Modal>
      )}
    </>
  );
}
