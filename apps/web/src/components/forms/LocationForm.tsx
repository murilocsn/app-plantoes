import { zodResolver } from "@hookform/resolvers/zod";
import type { Location } from "@financplantoes/shared";
import { locationInputSchema } from "@financplantoes/shared";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "../Button";
import { Field } from "../Field";

type LocationFormValues = z.infer<typeof locationInputSchema>;

type LocationFormProps = {
  location?: Location | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: LocationFormValues) => void;
};

export function LocationForm({ location, submitting, onCancel, onSubmit }: LocationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationInputSchema),
    defaultValues: {
      name: location?.name ?? "",
      value12: Number(location?.value12 ?? 0),
      doc: location?.doc ?? "",
      active: location?.active ?? true,
      reference_start_day: location?.reference_start_day ?? 1,
      reference_end_day: location?.reference_end_day ?? 31,
      payment_due_day: location?.payment_due_day ?? 10,
      payment_due_months_after: location?.payment_due_months_after ?? 1,
    },
  });

  return (
    <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
      <Field error={errors.name?.message} label="Nome do local">
        <input autoFocus {...register("name")} />
      </Field>
      <Field error={errors.value12?.message} label="Valor padrao 12h">
        <input min="0" step="0.01" type="number" {...register("value12")} />
      </Field>
      <Field error={errors.doc?.message} label="Documento ou referencia">
        <input {...register("doc")} />
      </Field>
      <Field error={errors.reference_start_day?.message} label="Inicio do periodo de referencia">
        <input min="1" max="31" type="number" {...register("reference_start_day")} />
      </Field>
      <Field error={errors.reference_end_day?.message} label="Dia de fechamento da referência">
        <input min="1" max="31" type="number" {...register("reference_end_day")} />
      </Field>
      <Field error={errors.payment_due_day?.message} label="Dia habitual do pagamento">
        <input min="1" max="31" type="number" {...register("payment_due_day")} />
      </Field>
      <Field error={errors.payment_due_months_after?.message} label="Em qual mês a empresa costuma pagar?">
        <select {...register("payment_due_months_after")}>
          <option value="0">No mesmo mês do fechamento</option>
          <option value="1">No mês seguinte ao fechamento</option>
          {Array.from({ length: 11 }, (_, index) => index + 2).map(months => <option key={months} value={months}>{months} meses após o mês do fechamento</option>)}
        </select>
      </Field>
      <p className="form-hint">
        Exemplo: referência de 26/08 a 25/09, pagamento habitual no dia 10 e no mês seguinte: previsão em 10/10. Não é uma contagem de 30 dias.
      </p>
      <p className="form-hint">
        Para abranger o mês inteiro, use início 1 e fechamento 31. Se o dia não existir, usamos o último dia daquele mês, inclusive em fevereiro. Plantões após o fechamento entram na referência seguinte; nenhum dia é descartado. É uma previsão, não uma confirmação de recebimento.
      </p>
      <label className="check-field">
        <input type="checkbox" {...register("active")} />
        <span>Local ativo</span>
      </label>
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
