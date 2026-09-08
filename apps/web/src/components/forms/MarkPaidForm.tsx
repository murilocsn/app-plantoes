import { zodResolver } from "@hookform/resolvers/zod";
import { markReceivablePaidSchema, PAYMENT_METHODS } from "@financplantoes/shared";
import { Check } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { dateKey } from "../../lib/calendar";
import { Button } from "../Button";
import { DateField } from "../DateField";
import { Field } from "../Field";

type MarkPaidValues = z.infer<typeof markReceivablePaidSchema>;

type MarkPaidFormProps = {
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: MarkPaidValues) => void;
};

export function MarkPaidForm({ submitting, onCancel, onSubmit }: MarkPaidFormProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MarkPaidValues>({
    resolver: zodResolver(markReceivablePaidSchema),
    defaultValues: {
      received_date: dateKey(new Date()),
      // Valor na forma aceita pela constraint do banco (minúsculo)
      payment_method: "pix",
      notes: "",
    },
  });

  return (
    <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
      <Controller
        control={control}
        name="received_date"
        render={({ field }) => (
          <DateField
            {...field}
            autoFocus
            error={errors.received_date?.message}
            label="Data recebida"
            value={field.value ?? ""}
          />
        )}
      />
      <Field error={errors.payment_method?.message} label="Metodo">
        <select {...register("payment_method")}>
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
          <Check size={18} />
          <span>Confirmar</span>
        </Button>
      </div>
    </form>
  );
}
