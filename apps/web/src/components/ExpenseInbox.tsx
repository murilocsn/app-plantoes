import type { ReceivedExpenseInvitation } from "@financplantoes/shared";
import { Bell, Check } from "lucide-react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { dateLabel, money } from "../lib/formatters";

export function ExpenseInbox({
  invitations,
  busy,
  onReply,
}: {
  invitations: ReceivedExpenseInvitation[];
  busy: boolean;
  onReply: (id: string, action: "accepted" | "declined") => void;
}) {
  if (!invitations.length)
    return (
      <EmptyState
        icon={Bell}
        title="Nenhum convite pendente"
        text="Os convites para locais e despesas aparecerão aqui."
      />
    );
  return (
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
                {invite.owner_name}
                {!invite.is_location && ` · ${dateLabel(invite.expense_date)}`}
              </small>
            </div>
          </header>
          {invite.is_location ? (
            <p className="muted">
              Ao aceitar, você terá acesso ao local e às despesas compartilhadas. Participará da
              divisão das próximas despesas cadastradas.
            </p>
          ) : (
            <>
              <p className="muted">Total da despesa: {money(invite.total_amount)}</p>
              <p className="expense-card-share">
                Sua parte se aceitar: <strong>{money(invite.amount)}</strong>
              </p>
              <p className="muted">
                Aceitar inclui esse valor nos seus gastos do mês da despesa. Nenhum pagamento será
                realizado.
              </p>
            </>
          )}
          <div className="expense-invite-actions">
            <Button
              aria-label={`Recusar convite para ${invite.description}`}
              disabled={busy}
              onClick={() => onReply(invite.id, "declined")}
            >
              Recusar
            </Button>
            <Button
              aria-label={`Aceitar convite para ${invite.description}`}
              disabled={busy}
              onClick={() => onReply(invite.id, "accepted")}
              variant="primary"
            >
              <Check size={16} />
              <span>Aceitar</span>
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
