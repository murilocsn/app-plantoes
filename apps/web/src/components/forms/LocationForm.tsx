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
