import type { Expense, ExpenseLocationCard, SharedExpenseCard } from "@financplantoes/shared";
import { MapPin, Plus, UserPlus, UsersRound } from "lucide-react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { ExpenseParticipants } from "./ExpenseParticipants";
import { dateLabel, money } from "../lib/formatters";

type Props = {
  locations: ExpenseLocationCard[];
  expenses: Expense[];
  sharedCards: SharedExpenseCard[];
  available: boolean;
  onCreate: (trigger: HTMLElement) => void;
  onOpen: (id: string, trigger: HTMLElement) => void;
};

export function ExpenseLocations({
  locations,
  expenses,
  sharedCards,
  available,
  onCreate,
  onOpen,
}: Props) {
  const cardsById = new Map(sharedCards.map((card) => [card.id, card]));
  const totals = new Map<string, { share: number; gross: number }>();
  for (const expense of expenses) {
    if (!expense.location_card_id) continue;
    const total = totals.get(expense.location_card_id) ?? { share: 0, gross: 0 };
    total.share += Math.round(expense.amount * 100);
    total.gross += Math.round(
      (cardsById.get(expense.sharing_card_id ?? "")?.total_amount ?? expense.amount) * 100,
    );
    totals.set(expense.location_card_id, total);
  }
  return (
    <section className="work-panel expense-section" aria-label="Meus locais">
      <header className="section-head">
        <div>
          <p className="eyebrow">Organize seus gastos</p>
          <h2>Meus locais</h2>
        </div>
        <Button
          disabled={!available}
          onClick={(event) => onCreate(event.currentTarget)}
          variant="secondary"
        >
          <Plus size={18} />
          <span>Novo local</span>
        </Button>
      </header>
      {locations.length ? (
        <div className="expense-locations-grid">
          {locations.map((location) => (
            <article
              className="expense-sharing-card"
              aria-label={`Local ${location.name}`}
              key={location.id}
            >
              <header className="expense-card-head">
                <div>
                  <MapPin size={18} />
                  <h3>{location.name}</h3>
                  <span className={`expense-type-badge ${location.visibility}`}>
                    {location.visibility === "personal" ? "Pessoal" : "Compartilhado"}
                  </span>
                </div>
              </header>
              <p className="muted">
                Total no período{" "}
                <strong>{money((totals.get(location.id)?.gross ?? 0) / 100)}</strong>
              </p>
              <div className="expense-card-share">
                <span>
                  Sua parte<strong>{money((totals.get(location.id)?.share ?? 0) / 100)}</strong>
                </span>
                {location.visibility === "shared" && (
                  <small>
                    <UsersRound size={14} />
                    {location.participant_count} participante(s)
                  </small>
                )}
              </div>
              <Button onClick={(event) => onOpen(location.id, event.currentTarget)}>
                Ver despesas e gerenciar
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MapPin}
          title="Seus locais aparecerão aqui"
          text="Crie um local pessoal ou compartilhado para reunir as despesas."
        />
      )}
    </section>
  );
}

export function ExpenseLocationDetails({
  location,
  expenses,
  busy,
  error,
  onCreateExpense,
  onEdit,
  onInvite,
  onCancelInvitation,
}: {
  location: ExpenseLocationCard;
  expenses: Expense[];
  busy: boolean;
  error: string;
  onCreateExpense: () => void;
  onEdit: () => void;
  onInvite: () => void;
  onCancelInvitation: (id: string) => void;
}) {
  const entries = expenses.filter((expense) => expense.location_card_id === location.id);
  return (
    <>
      <p className="muted">
        {location.visibility === "shared"
          ? "Sua parte nas despesas do período. Cada divisão é registrada entre os participantes que já aceitaram o convite."
          : "Local pessoal. Somente você tem acesso."}
      </p>
      {entries.length ? (
        <div className="stack">
          {entries.map((expense) => (
            <div className="row-item" key={expense.id}>
              <span>
                <strong>{expense.description}</strong>
                <small>{dateLabel(expense.expense_date)}</small>
              </span>
              <b>{money(expense.amount)}</b>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Sem despesas neste período.</p>
      )}
      <div className="expense-detail-actions">
        <Button variant="primary" onClick={onCreateExpense}>
          Nova despesa neste local
        </Button>
        {location.is_owner && <Button onClick={onEdit}>Editar local</Button>}
      </div>
      {location.visibility === "shared" && (
        <>
          <h3>Participantes ({location.participant_count})</h3>
          <ul className="expense-members">
            {location.participants.map((participant, index) => (
              <li key={index}>
                {participant.name}
                {participant.is_owner ? " · Proprietário" : ""}
              </li>
            ))}
          </ul>
          {location.is_owner && (
            <>
              <Button disabled={busy} onClick={onInvite}>
                <UserPlus size={16} />
                <span>Convidar pessoa</span>
              </Button>
              <ExpenseParticipants
                invitations={location.invitations}
                busy={busy}
                forLocation
                onCancel={onCancelInvitation}
              />
            </>
          )}
        </>
      )}
      {error && (
        <p className="form-message" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
