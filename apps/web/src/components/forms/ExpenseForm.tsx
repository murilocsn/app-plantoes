import { zodResolver } from "@hookform/resolvers/zod";
import type { Space } from "@financplantoes/shared";
import { personalExpenseInputSchema, sharedExpenseInputSchema } from "@financplantoes/shared";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "../Button";
import { Field } from "../Field";

type PersonalValues = z.infer<typeof personalExpenseInputSchema>;
type SharedValues = z.infer<typeof sharedExpenseInputSchema>;

type ExpenseFormProps = {
  mode: "personal" | "shared";
  spaces?: Space[];
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: PersonalValues | SharedValues) => void;
};

export function ExpenseForm({ mode, spaces = [], submitting, onCancel, onSubmit }: ExpenseFormProps) {
  const schema = mode === "personal" ? personalExpenseInputSchema : sharedExpenseInputSchema;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonalValues & SharedValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: "",
      amount: 0,
      expense_date: new Date().toISOString().slice(0, 10),
      category: "",
      notes: "",
      space_id: spaces[0]?.id ?? "",
      split_method: "equal",
    },
  });

  return (
    <form className="form-grid" onSubmit={handleSubmit((values) => onSubmit(values))}>
      {mode === "shared" && (
        <Field error={errors.space_id?.message} label="Espaco">
          <select autoFocus {...register("space_id")}>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field error={errors.description?.message} label="Descricao">
        <input autoFocus={mode === "personal"} {...register("description")} />
      </Field>
      <Field error={errors.amount?.message} label="Valor">
        <input min="0" step="0.01" type="number" {...register("amount")} />
      </Field>
      <Field error={errors.expense_date?.message} label="Data">
        <input type="date" {...register("expense_date")} />
      </Field>
      <Field error={errors.category?.message} label="Categoria">
        <input {...register("category")} />
      </Field>
      {mode === "shared" && (
        <Field error={errors.split_method?.message} label="Divisao">
          <select {...register("split_method")}>
            <option value="equal">Igual</option>
            <option value="selected">Selecionada</option>
          </select>
        </Field>
      )}
      <Field error={errors.notes?.message} label="Observacoes">
        <textarea rows={3} {...register("notes")} />
      </Field>
      <div className="form-actions">
        <Button onClick={onCancel}>Cancelar</Button>
        <Button disabled={submitting || (mode === "shared" && spaces.length === 0)} type="submit" variant="primary">
          <Save size={18} />
          <span>Salvar</span>
        </Button>
      </div>
    </form>
  );
}
