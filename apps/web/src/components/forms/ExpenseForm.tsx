import { zodResolver } from "@hookform/resolvers/zod";
import { personalExpenseInputSchema, expenseCardInputSchema } from "@financplantoes/shared";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "../Button";
import { Field } from "../Field";
import { dateKey } from "../../lib/calendar";

type PersonalValues = z.infer<typeof personalExpenseInputSchema>;
type SharedValues = z.infer<typeof expenseCardInputSchema>;

type ExpenseFormProps = {
  mode: "personal" | "shared";
  error?: string;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: PersonalValues | SharedValues) => void;
};

export function ExpenseForm({ mode, error, submitting, onCancel, onSubmit }: ExpenseFormProps) {
  const schema = mode === "personal" ? personalExpenseInputSchema : expenseCardInputSchema;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonalValues & SharedValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: "",
      amount: 0,
      expense_date: dateKey(new Date()),
      category: "",
      notes: "",
    },
  });

  return (
    <form className="form-grid" onSubmit={handleSubmit((values) => onSubmit(values))}>
      <Field error={errors.description?.message} label="Descricao">
        <input autoFocus {...register("description")} />
      </Field>
      <Field error={errors.amount?.message} label="Valor">
        <input min={mode === "personal" ? "0" : "0.01"} step="0.01" type="number" inputMode="decimal" {...register("amount")} />
      </Field>
      <Field error={errors.expense_date?.message} label="Data">
        <input type="date" {...register("expense_date")} />
      </Field>
      <Field error={errors.category?.message} label="Categoria">
        <input {...register("category")} />
      </Field>
      <Field error={errors.notes?.message} label="Observacoes">
        <textarea rows={3} {...register("notes")} />
      </Field>
      <div className="form-actions">
        <Button disabled={submitting} onClick={onCancel}>Cancelar</Button>
        <Button disabled={submitting} type="submit" variant="primary">
          <Save size={18} />
          <span>Salvar</span>
        </Button>
      </div>
      {mode === "shared" && <p className="muted expense-form-note">Depois de salvar, convide pelo card e defina o valor de cada pessoa.</p>}
      {error && <p className="form-message expense-form-note" role="alert">{error}</p>}
    </form>
  );
}
