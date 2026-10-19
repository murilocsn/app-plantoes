import { zodResolver } from "@hookform/resolvers/zod";
import {
  personalExpenseInputSchema,
  locatedExpenseInputSchema,
  type ExpenseLocationCard,
} from "@financplantoes/shared";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "../Button";
import { Field } from "../Field";
import { dateKey } from "../../lib/calendar";

type PersonalValues = z.infer<typeof personalExpenseInputSchema>;
type SharedValues = z.infer<typeof locatedExpenseInputSchema>;

type ExpenseFormProps = {
  mode: "personal" | "shared";
  error?: string;
  submitting?: boolean;
  locations: ExpenseLocationCard[];
  canCreateLocation: boolean;
  active: boolean;
  initialLocationId?: string;
  onCreateLocation: () => void;
  onCancel: () => void;
  onSubmit: (values: PersonalValues | SharedValues) => void;
};

export function ExpenseForm({
  mode,
  error,
  submitting,
  locations,
  canCreateLocation,
  active,
  initialLocationId,
  onCreateLocation,
  onCancel,
  onSubmit,
}: ExpenseFormProps) {
  const schema = mode === "personal" ? personalExpenseInputSchema : locatedExpenseInputSchema;
  const choices = locations.filter((location) =>
    mode === "shared" ? location.visibility === "shared" : location.visibility === "personal",
  );
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<PersonalValues & SharedValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: "",
      amount: 0,
      expense_date: dateKey(new Date()),
      category: "",
      notes: "",
      location_card_id: initialLocationId ?? "",
    },
  });
  useEffect(() => {
    if (active) setFocus("description");
  }, [active, setFocus]);

  return (
    <form
      className="form-grid"
      onSubmit={handleSubmit((values) => {
        if (!submitting) onSubmit(values);
      })}
    >
      <Field error={errors.description?.message} label="Descrição">
        <input autoFocus disabled={submitting} {...register("description")} />
      </Field>
      <Field error={errors.amount?.message} label="Valor">
        <input
          disabled={submitting}
          min={mode === "personal" ? "0" : "0.01"}
          step="0.01"
          type="number"
          inputMode="decimal"
          {...register("amount")}
        />
      </Field>
      <Field error={errors.expense_date?.message} label="Data">
        <input disabled={submitting} type="date" {...register("expense_date")} />
      </Field>
      <Field error={errors.category?.message} label="Categoria">
        <input disabled={submitting} {...register("category")} />
      </Field>
      <Field
        error={errors.location_card_id?.message}
        label={mode === "shared" ? "Local compartilhado" : "Local pessoal (opcional)"}
      >
        <select disabled={submitting} {...register("location_card_id")}>
          <option value="">{mode === "shared" ? "Selecione um local" : "Sem local"}</option>
          {choices.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </Field>
      <Button disabled={submitting || !canCreateLocation} onClick={onCreateLocation}>
        Criar local nesta página
      </Button>
      <Field error={errors.notes?.message} label="Observações">
        <textarea disabled={submitting} rows={3} {...register("notes")} />
      </Field>
      <div className="form-actions">
        <Button disabled={submitting} onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          disabled={submitting || (mode === "shared" && !choices.length)}
          type="submit"
          variant="primary"
        >
          <Save size={18} />
          <span>{submitting ? "Salvando…" : "Salvar despesa"}</span>
        </Button>
      </div>
      {mode === "shared" && (
        <p className="muted expense-form-note">
          {choices.length
            ? "Divisão igual entre os participantes que já aceitaram o convite. A divisão fica registrada e não muda com novos aceites."
            : "Crie um local compartilhado antes de cadastrar a despesa."}
        </p>
      )}
      {error && (
        <p className="form-message expense-form-note" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
