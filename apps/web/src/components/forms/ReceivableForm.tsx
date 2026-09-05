import { zodResolver } from "@hookform/resolvers/zod";
import type { Location, Receivable } from "@financplantoes/shared";
import { PAYMENT_METHODS, PAYMENT_METHOD_VALUES, receivableInputSchema } from "@financplantoes/shared";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "../Button";
import { Field } from "../Field";

type ReceivableFormValues = z.infer<typeof receivableInputSchema>;

// Converte o método salvo no banco (ex.: "PIX" maiusculo de versoes antigas)
// para a forma aceita pelo schema/constraint (ex.: "pix"), ou null quando
// o valor nao for reconhecido. Evita o erro de constraint do banco.
function normalizePaymentMethod(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return PAYMENT_METHOD_VALUES.includes(normalized as (typeof PAYMENT_METHOD_VALUES)[number])
    ? (normalized as (typeof PAYMENT_METHOD_VALUES)[number])
    : null;
}

type ReceivableFormProps = {
  locations: Location[];
  receivable?: Receivable | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: ReceivableFormValues) => void;
};

export function ReceivableForm({
  locations,
  receivable,
  submitting,
  onCancel,
  onSubmit,
}: ReceivableFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReceivableFormValues>({
    resolver: zodResolver(receivableInputSchema),
    defaultValues: {
      description: receivable?.description ?? "",
      amount: Number(receivable?.amount ?? 0),
      expected_date: receivable?.expected_date ?? new Date().toISOString().slice(0, 10),
      location_id: receivable?.location_id ?? "",
      status: receivable?.status === "received" ? "received" : "pending",
      payment_method: normalizePaymentMethod(receivable?.payment_method),
      notes: receivable?.notes ?? "",
    },
  });

  return (
    <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
      <Field error={errors.description?.message} label="Descricao">
        <input autoFocus {...register("description")} />
      </Field>
      <Field error={errors.amount?.message} label="Valor">
        <input min="0" step="0.01" type="number" {...register("amount")} />
      </Field>
      <Field error={errors.expected_date?.message} label="Previsao">
        <input type="date" {...register("expected_date")} />
      </Field>
      <Field error={errors.location_id?.message} label="Local">
        <select {...register("location_id")}>
          <option value="">Sem local</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </Field>
      <Field error={errors.status?.message} label="Status">
        <select {...register("status")}>
          <option value="pending">Pendente</option>
          <option value="received">Recebido</option>
          <option value="overdue">Atrasado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </Field>
      <Field error={errors.payment_method?.message} label="Pagamento">
        <select {...register("payment_method")}>
          <option value="">Sem metodo</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
      </Field>
      <Field error={errors.notes?.message} label="Observacoes">
        <textarea rows={3} {...register("notes")} />
      </Field>
      <div className="form-actions">
        <Button onClick={onCancel}>Cancelar</Button>
        <Button disabled={submitting} type="submit" variant="primary">
          <Save size={18} />
          <span>Salvar</span>
        </Button>
      </div>
    </form>
  );
}
