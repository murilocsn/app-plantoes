import { Bell, Check, Plus, Receipt, UserPlus, UsersRound, X } from "lucide-react";
import { expenseCardAvailable, type SharedExpenseCard } from "@financplantoes/shared";
import { useRef, useState } from "react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ExpenseForm } from "../components/forms/ExpenseForm";
import { ExpenseInviteForm } from "../components/forms/ExpenseInviteForm";
import { Modal } from "../components/Modal";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { StatCard } from "../components/StatCard";
import { PeriodNavigation } from "../components/PeriodNavigation";
import { useAppMutation, useBootstrap } from "../hooks/useBootstrap";
import { domainApi } from "../lib/domain-api";
import { dateLabel, money } from "../lib/formatters";
import { adjacentMonthRange, monthDateRange } from "../lib/payment-view";
import { inDateRange, sumMoney } from "../lib/monthly-finance";

type ExpenseModal =
  { type: "personal" | "shared" | "inbox" } | { type: "invite"; card: SharedExpenseCard } | null;
const invitationLabels = {
  pending: "Aguardando aceite",
  accepted: "Aceito",
  declined: "Recusado",
  cancelled: "Cancelado",
};

export function ExpensesPage() {
  const bootstrap = useBootstrap();
  const [modal, setModal] = useState<ExpenseModal>(null);
  const [formError, setFormError] = useState("");
  const [period, setPeriod] = useState(() => monthDateRange(new Date()));
  const [notice, setNotice] = useState("");
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const openModal = (value: ExpenseModal, trigger?: HTMLElement) => {
    returnFocusTo.current =
      trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setFormError("");
    setNotice("");
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
  const createShared = useAppMutation(domainApi.createExpenseCard, {
    onSuccess,
    onError: showError,
  });
  const sendInvite = useAppMutation(domainApi.inviteExpenseParticipant, {
    onSuccess: () => {
      onSuccess();
      setNotice("Convite enviado. A pessoa poderá responder dentro do aplicativo.");
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
  const cancelInvite = useAppMutation(domainApi.cancelExpenseInvitation, { onError: showError });
  const busy =
    createPersonal.isPending ||
    createShared.isPending ||
    sendInvite.isPending ||
    replyInvite.isPending ||
    cancelInvite.isPending;
  const closeModal = () => {
    if (!busy) {
      setModal(null);
      setFormError("");
    }
  };

  if (bootstrap.isLoading) {
    return <LoadingBlock />;
  }

  if (bootstrap.error || !bootstrap.data) {
    return <ErrorBlock error={bootstrap.error} />;
  }

  const sharing = bootstrap.data.expenseSharing;
  const personalExpenses = bootstrap.data.personalExpenses.filter((item) =>
    inDateRange(item.expense_date, period),
  );
  const sharedExpenses = bootstrap.data.sharedExpenses.filter((item) =>
    inDateRange(item.expense_date, period),
  );
  const personalTotal = sumMoney(personalExpenses, (item) => item.amount);
  const sharedTotal = sumMoney(sharedExpenses, (item) => item.amount);
  const cards = (sharing?.cards ?? []).filter((item) => inDateRange(item.expense_date, period));
  const legacyExpenses = sharedExpenses.filter((item) => !item.sharing_card_id);
  const invitations = sharing?.invitations ?? [];

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
            void bootstrap.refetch();
          }}
          disabled={!sharing?.available}
          variant="secondary"
        >
          <Bell size={17} />
          <span>Convites ({invitations.length})</span>
        </Button>
      </header>
      <PeriodNavigation
        {...period}
        label="das despesas"
        onCurrentMonth={() => setPeriod(monthDateRange(new Date()))}
        onNavigate={(offset) =>
          setPeriod((current) => adjacentMonthRange(current.from, current.to, offset))
        }
      />
      <section className="stat-grid two">
        <StatCard icon={Receipt} label="Pessoal" tone="coral" value={money(personalTotal)} />
        <StatCard icon={UsersRound} label="Compartilhado" tone="amber" value={money(sharedTotal)} />
      </section>

      {notice && (
        <p className="muted" role="status">
          {notice}
        </p>
      )}
      {!sharing?.available && (
        <p className="muted">
          O compartilhamento está indisponível no momento. Você pode continuar registrando despesas
          pessoais.
        </p>
      )}
      {formError && !modal && (
        <p className="form-message" role="alert">
          {formError}
        </p>
      )}

      <section className="dashboard-columns two-columns expenses-columns">
        <article className="work-panel">
          <header className="section-head">
            <div>
              <p className="eyebrow">Individual</p>
              <h2>Despesas pessoais</h2>
            </div>
            <Button onClick={(event) => openModal({ type: "personal" }, event.currentTarget)} variant="primary">
              <Plus size={18} />
              <span>Nova</span>
            </Button>
          </header>
          {personalExpenses.length ? (
            <div className="stack">
              {personalExpenses.map((expense) => (
                <div className="row-item" key={expense.id}>
                  <span>
                    <strong>{expense.description}</strong>
                    <small>
                      {dateLabel(expense.expense_date)}{" "}
                      {expense.category ? `- ${expense.category}` : ""}
                    </small>
                  </span>
                  <b>{money(expense.amount)}</b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Receipt}
              text="Registre custos fixos, variaveis e extras."
              title="Sem despesas"
            />
          )}
        </article>

        <article className="work-panel">
          <header className="section-head">
            <div>
              <p className="eyebrow">Divisão por pessoa</p>
              <h2>Despesas compartilhadas</h2>
            </div>
            <Button
              disabled={!sharing?.available}
              onClick={(event) => openModal({ type: "shared" }, event.currentTarget)}
              variant="primary"
            >
              <Plus size={18} />
              <span>Compartilhar</span>
            </Button>
          </header>
          <p className="muted expense-sharing-hint">
            O resumo considera apenas a sua parte. Convites pendentes ainda não entram nos gastos do
            convidado.
          </p>
          {cards.length > 0 && (
            <div className="stack">
              {cards.map((card) => (
                <article
                  aria-label={`Despesa compartilhada ${card.description}`}
                  className="expense-sharing-card"
                  key={card.id}
                >
                  <header className="expense-card-head">
                    <div>
                      <strong>{card.description}</strong>
                      <small>
                        {dateLabel(card.expense_date)}
                        {card.category ? ` · ${card.category}` : ""}
                      </small>
                    </div>
                    <span>
                      <small>Total da despesa</small>
                      <b>{money(card.total_amount)}</b>
                    </span>
                  </header>
                  <div className="expense-card-share">
                    <span>
                      Sua parte <strong>{money(card.amount)}</strong>
                    </span>
                    <small>
                      <UsersRound size={14} />
                      {card.participant_count} pessoa{card.participant_count === 1 ? "" : "s"}
                    </small>
                  </div>
                  {!card.is_owner && <p className="muted">Compartilhada por {card.owner_name}</p>}
                  {card.notes && <p className="muted expense-card-notes">{card.notes}</p>}
                  {card.is_owner && (
                    <>
                      <Button
                        disabled={busy || expenseCardAvailable(card) <= 0}
                        onClick={(event) => openModal({ type: "invite", card }, event.currentTarget)}
                        variant="secondary"
                      >
                        <UserPlus size={16} />
                        <span>Convidar pessoa</span>
                      </Button>
                      {card.invitations.length > 0 && (
                        <details className="expense-card-invitations">
                          <summary>Participações e convites ({card.invitations.length})</summary>
                          <ul>
                            {card.invitations.map((invite) => (
                              <li key={invite.id}>
                                <div>
                                  <strong>{invite.invited_email}</strong>
                                  <small>
                                    {money(invite.amount)} · {invitationLabels[invite.status]}
                                  </small>
                                </div>
                                {invite.status === "pending" && (
                                  <Button
                                    aria-label={`Cancelar convite para ${invite.invited_email}`}
                                    disabled={busy}
                                    onClick={() => {
                                      setFormError("");
                                      cancelInvite.mutate(invite.id);
                                    }}
                                    size="icon"
                                    variant="danger"
                                  >
                                    <X size={15} />
                                  </Button>
                                )}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
          {legacyExpenses.length > 0 && (
            <div className="stack">
              {legacyExpenses.map((expense) => (
                <div className="row-item" key={expense.id}>
                  <span>
                    <strong>{expense.description}</strong>
                    <small>{dateLabel(expense.expense_date)}</small>
                  </span>
                  <b>{money(expense.amount)}</b>
                </div>
              ))}
            </div>
          )}
          {!cards.length && !legacyExpenses.length && (
            <EmptyState
              icon={UsersRound}
              text="Crie uma despesa e convide uma pessoa cadastrada para dividir o valor."
              title="Nenhuma despesa compartilhada neste mês"
            />
          )}
        </article>
      </section>

      {modal && (modal.type === "personal" || modal.type === "shared") && (
        <Modal
          eyebrow="Despesa"
          manageFocus
          closeDisabled={busy}
          returnFocusTo={returnFocusTo.current}
          onClose={closeModal}
          title={modal.type === "personal" ? "Nova despesa pessoal" : "Nova despesa compartilhada"}
        >
          <ExpenseForm
            mode={modal.type}
            error={formError}
            onCancel={closeModal}
            onSubmit={(values) => {
              if (modal.type === "personal") {
                createPersonal.mutate(values);
              } else {
                createShared.mutate(values);
              }
            }}
            submitting={createPersonal.isPending || createShared.isPending}
          />
        </Modal>
      )}
      {modal?.type === "invite" && (
        <Modal
          manageFocus
          closeDisabled={busy}
          returnFocusTo={returnFocusTo.current}
          eyebrow="Compartilhar despesa"
          onClose={closeModal}
          title="Convidar pessoa"
        >
          <div className="expense-invite-context">
            <strong>{modal.card.description}</strong>
            <span>Total: {money(modal.card.total_amount)}</span>
          </div>
          <ExpenseInviteForm
            available={expenseCardAvailable(modal.card)}
            error={formError}
            submitting={sendInvite.isPending}
            onCancel={closeModal}
            onSubmit={(input) => sendInvite.mutate({ id: modal.card.id, ...input })}
          />
        </Modal>
      )}
      {modal?.type === "inbox" && (
        <Modal
          manageFocus
          closeDisabled={busy}
          returnFocusTo={returnFocusTo.current}
          eyebrow="Compartilhamento"
          onClose={closeModal}
          title="Convites recebidos"
        >
          {bootstrap.isFetching && (
            <p className="muted" role="status">
              Atualizando convites…
            </p>
          )}
          {formError && (
            <p className="form-message" role="alert">
              {formError}
            </p>
          )}
          {invitations.length ? (
            <div className="stack">
              {invitations.map((invite) => (
                <article
                  className="expense-sharing-card"
                  aria-label={`Convite para ${invite.description}`}
                  key={invite.id}
                >
                  <header className="expense-card-head">
                    <div>
                      <strong>{invite.description}</strong>
                      <small>
                        {dateLabel(invite.expense_date)} · {invite.owner_name}
                      </small>
                    </div>
                  </header>
                  <p className="muted">Total da despesa: {money(invite.total_amount)}</p>
                  <p className="expense-card-share">
                    Sua parte se aceitar: <strong>{money(invite.amount)}</strong>
                  </p>
                  <p className="muted">
                    Aceitar inclui esse valor nos seus gastos do mês da despesa. Nenhum pagamento
                    será realizado.
                  </p>
                  <div className="expense-invite-actions">
                    <Button
                      aria-label={`Recusar convite para ${invite.description}`}
                      disabled={busy}
                      onClick={() => replyInvite.mutate({ id: invite.id, action: "declined" })}
                    >
                      Recusar
                    </Button>
                    <Button
                      aria-label={`Aceitar convite para ${invite.description}`}
                      disabled={busy}
                      onClick={() => replyInvite.mutate({ id: invite.id, action: "accepted" })}
                      variant="primary"
                    >
                      <Check size={16} />
                      <span>Aceitar</span>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Bell}
              title="Nenhum convite pendente"
              text="Quando alguém compartilhar uma despesa com você, o convite aparecerá aqui."
            />
          )}
        </Modal>
      )}
    </>
  );
}
