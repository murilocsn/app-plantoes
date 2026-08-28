import { zodResolver } from "@hookform/resolvers/zod";
import { markReceivablePaidSchema } from "@financplantoes/shared";
import { Check } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "../Button";
import { Field } from "../Field";

type MarkPaidValues = z.infer<typeof markReceivablePaidSchema>;

type MarkPaidFormProps = {
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: MarkPaidValues) => void;
};

export function MarkPaidForm({ submitting, onCancel, onSubmit }: MarkPaidFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MarkPaidValues>({
    resolver: zodResolver(markReceivablePaidSchema),
    defaultValues: {
      received_date: new Date().toISOString().slice(0, 10),
      payment_method: "PIX",
      notes: "",
    },
  });

  return (
    <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
      <Field error={errors.received_date?.message} label="Data recebida">
        <input autoFocus type="date" {...register("received_date")} />
      </Field>
      <Field error={errors.payment_method?.message} label="Metodo">
        <input {...register("payment_method")} />
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
