import type { ExpenseInvitation } from "@financplantoes/shared";
import { X } from "lucide-react";
import { Button } from "./Button";
import { money } from "../lib/formatters";
const invitationLabels = {
  pending: "Aguardando aceite",
  accepted: "Aceito",
  declined: "Recusado",
  cancelled: "Cancelado",
};

export function ExpenseParticipants({
  invitations,
  busy,
  forLocation,
  onCancel,
}: {
  invitations: ExpenseInvitation[];
  busy: boolean;
  forLocation?: boolean;
  onCancel: (id: string) => void;
}) {
  return (
    <details className="expense-card-invitations">
      <summary>Participações e convites ({invitations.length})</summary>
      {invitations.length ? (
        <ul>
          {invitations.map((invite) => (
            <li key={invite.id}>
              <div>
                <strong>{invite.invited_email}</strong>
                <small>
                  {!forLocation && `${money(invite.amount)} · `}
                  {invitationLabels[invite.status]}
                </small>
              </div>
              {invite.status === "pending" && (
                <Button
                  aria-label={`Cancelar convite para ${invite.invited_email}`}
                  disabled={busy}
                  onClick={() => onCancel(invite.id)}
                  size="icon"
                  variant="danger"
                >
                  <X size={15} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nenhum convite enviado.</p>
      )}
    </details>
  );
}
