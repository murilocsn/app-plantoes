import { useState } from "react";
import { expenseLocationInputSchema, type ExpenseLocationCard } from "@financplantoes/shared";
import { Button } from "../Button";
import { Field } from "../Field";

type Props = {
  location?: ExpenseLocationCard;
  initialVisibility?: "personal" | "shared";
  submitting: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (input: { name: string; visibility: "personal" | "shared" }) => void;
};

export function ExpenseLocationForm({
  location,
  initialVisibility = "personal",
  submitting,
  error,
  onCancel,
  onSubmit,
}: Props) {
  const [name, setName] = useState(location?.name ?? "");
  const [visibility, setVisibility] = useState(location?.visibility ?? initialVisibility);
  const [validation, setValidation] = useState("");
  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting) return;
        const result = expenseLocationInputSchema.safeParse({ name, visibility });
        if (!result.success)
          return setValidation(result.error.issues[0]?.message ?? "Confira os dados.");
        setValidation("");
        onSubmit(result.data);
      }}
    >
      <Field label="Nome do local">
        <input
          autoFocus
          disabled={submitting}
          value={name}
          maxLength={200}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Residência ou Clínica Central"
          required
        />
      </Field>
      <Field label="Tipo do local">
        <select
          disabled={submitting || Boolean(location)}
          value={visibility}
          onChange={(event) => setVisibility(event.target.value as typeof visibility)}
        >
          <option value="personal">Pessoal</option>
          <option value="shared">Compartilhado</option>
        </select>
      </Field>
      <p className="muted expense-form-note">
        {visibility === "personal"
          ? "Somente você terá acesso a este local e às despesas pessoais vinculadas."
          : "Convide participantes pelo card. O acesso será liberado somente após o aceite."}
      </p>
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
          {submitting ? "Salvando…" : location ? "Salvar local" : "Criar local"}
        </Button>
      </div>
    </form>
  );
}
