import { expenseCardAvailable, type SharedExpenseCard } from "@financplantoes/shared";
import { UserPlus } from "lucide-react";
import { Button } from "./Button";
import { ExpenseParticipants } from "./ExpenseParticipants";
import { dateLabel, money } from "../lib/formatters";
import { groupExpenseStatements, type ExpenseLedgerEntry } from "../lib/monthly-finance";

type Props = {
  entries: ExpenseLedgerEntry[];
  locations: Array<{ id: string; name: string }>;
  legacyCards: SharedExpenseCard[];
  visibleCount: number;
  busy: boolean;
  onInvite: (card: SharedExpenseCard, trigger: HTMLElement) => void;
  onCancelInvitation: (id: string) => void;
};

export function ExpenseLedger({
  entries,
  locations,
  legacyCards,
  visibleCount,
  busy,
  onInvite,
  onCancelInvitation,
}: Props) {
  const visible = new Set(
    entries.slice(0, visibleCount).map((entry) => `${entry.type}:${entry.id}`),
  );
  const legacyById = new Map(
    legacyCards.filter((card) => !card.location_card_id).map((card) => [card.id, card]),
  );
  return (
    <div className="expense-ledger" aria-label="Despesas por local e referência">
      {groupExpenseStatements(entries, locations).map((group) => {
        const items = group.items.filter((entry) => visible.has(`${entry.type}:${entry.id}`));
        if (!items.length) return null;
        return (
          <section
            className="finance-invoice expense-statement"
            aria-label={`Despesas de ${group.name} — ${group.reference}`}
            key={group.key}
          >
            <header className="finance-invoice-head">
              <div>
                <h4>{group.name}</h4>
                <p>{group.reference}</p>
              </div>
              <div>
                <strong className="finance-invoice-total">{money(group.total)}</strong>
                <small className="finance-invoice-count">
                  {items.length === group.items.length
                    ? `${group.items.length} despesa(s)`
                    : `${items.length} de ${group.items.length} despesas visíveis`}
                </small>
              </div>
            </header>
            <div className="ledger-list">
              {items.map((expense) => {
                const legacy =
                  expense.type === "shared"
                    ? legacyById.get(expense.sharing_card_id ?? "")
                    : undefined;
                return (
                  <article
                    className="ledger-row expense-ledger-row"
                    data-expense-type={expense.type}
                    key={`${expense.type}-${expense.id}`}
                  >
                    <div className="expense-ledger-entry">
                      <span className="ledger-accent" aria-hidden="true" />
                      <div className="ledger-copy">
                        <span className="ledger-time">{dateLabel(expense.expense_date)}</span>
                        <strong className="ledger-title">{expense.description}</strong>
                        {expense.category && (
                          <span className="ledger-subtitle">{expense.category}</span>
                        )}
                      </div>
                      <div className="ledger-payment">
                        <b className="ledger-amount">{money(expense.amount)}</b>
                        <span className={`expense-type-badge ${expense.type}`}>
                          {expense.type === "personal" ? "Pessoal" : "Compartilhada"}
                        </span>
                      </div>
                    </div>
                    {legacy && (
                      <details className="expense-card-invitations">
                        <summary>Detalhes do compartilhamento</summary>
                        <p className="muted">
                          Total: {money(legacy.total_amount)} · {legacy.participant_count}{" "}
                          participante(s)
                        </p>
                        {legacy.notes && <p className="muted expense-card-notes">{legacy.notes}</p>}
                        {legacy.is_owner && (
                          <>
                            <Button
                              disabled={busy || expenseCardAvailable(legacy) <= 0}
                              onClick={(event) => onInvite(legacy, event.currentTarget)}
                            >
                              <UserPlus size={16} />
                              <span>Convidar pessoa</span>
                            </Button>
                            <ExpenseParticipants
                              invitations={legacy.invitations}
                              busy={busy}
                              onCancel={onCancelInvitation}
                            />
                          </>
                        )}
                      </details>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
