import { useState } from "react";
import { expenseInviteInputSchema, expenseLocationInviteSchema } from "@financplantoes/shared";
import { Send } from "lucide-react";
import { Button } from "../Button";
import { Field } from "../Field";
import { money } from "../../lib/formatters";

type Props = {
  available: number;
  forLocation?: boolean;
  submitting: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (input: { email: string; amount: number }) => void;
};

export function ExpenseInviteForm({
  available,
  forLocation = false,
  submitting,
  error,
  onCancel,
  onSubmit,
}: Props) {
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [amount, setAmount] = useState("");
  const [validation, setValidation] = useState("");
  return (
    <form
      className="form-grid expense-invite-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting) return;
        const result = forLocation
          ? expenseLocationInviteSchema.safeParse({ email })
          : expenseInviteInputSchema.safeParse({ email, amount });
        if (!result.success)
          return setValidation(result.error.issues[0]?.message ?? "Confira os dados do convite.");
        if (result.data.email !== confirmation.trim().toLowerCase())
          return setValidation("Os e-mails precisam ser iguais. Confira antes de enviar.");
        const share = "amount" in result.data ? Number(result.data.amount) : 0;
        if (!forLocation && Math.round(share * 100) > Math.round(available * 100))
          return setValidation("O valor ultrapassa o disponível para compartilhar.");
        setValidation("");
        onSubmit({ email: result.data.email, amount: share });
      }}
    >
      <p className="expense-form-note muted">
        Use o e-mail de uma pessoa já cadastrada. Ela receberá o convite dentro do aplicativo e
        poderá aceitar ou recusar.
      </p>
      <Field label="E-mail do convidado">
        <input
          autoFocus
          autoComplete="off"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setValidation("");
          }}
          disabled={submitting}
          required
        />
      </Field>
      <Field label="Confirme o e-mail">
        <input
          autoComplete="off"
          type="email"
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value);
            setValidation("");
          }}
          disabled={submitting}
          required
        />
      </Field>
      {!forLocation && (
        <>
          <Field label="Valor dessa pessoa">
            <input
              inputMode="decimal"
              type="number"
              min="0.01"
              step="0.01"
              max={available}
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setValidation("");
              }}
              disabled={submitting}
              required
            />
          </Field>
          <p className="muted">
            Disponível para compartilhar: <strong>{money(available)}</strong>
          </p>
        </>
      )}
      {forLocation && (
        <p className="muted expense-form-note">
          O acesso ao local e às despesas só será liberado após o aceite. As próximas despesas serão
          divididas igualmente entre os participantes.
        </p>
      )}
      {(validation || error) && (
        <p className="form-message expense-form-note" role="alert">
          {validation || error}
        </p>
      )}
      <div className="form-actions">
        <Button disabled={submitting} onClick={onCancel}>
          Cancelar
        </Button>
        <Button disabled={submitting} type="submit" variant="primary">
          <Send size={16} />
          <span>{submitting ? "Enviando…" : "Enviar convite"}</span>
        </Button>
      </div>
    </form>
  );
}
