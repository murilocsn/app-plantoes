import { zodResolver } from "@hookform/resolvers/zod";
import type { Space } from "@financplantoes/shared";
import { spaceInputSchema } from "@financplantoes/shared";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "../Button";
import { Field } from "../Field";

type SpaceValues = z.infer<typeof spaceInputSchema>;

type SpaceFormProps = {
  space?: Space | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: SpaceValues) => void;
};

export function SpaceForm({ space, submitting, onCancel, onSubmit }: SpaceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SpaceValues>({
    resolver: zodResolver(spaceInputSchema),
    defaultValues: {
      name: space?.name ?? "",
      space_type: (space?.space_type as SpaceValues["space_type"]) ?? "clinic",
      description: space?.description ?? "",
      start_date: space?.start_date ?? "",
      end_date: space?.end_date ?? "",
    },
  });

  return (
    <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
      <Field error={errors.name?.message} label="Nome">
        <input autoFocus {...register("name")} />
      </Field>
      <Field error={errors.space_type?.message} label="Tipo">
        <select {...register("space_type")}>
          <option value="clinic">Clinica</option>
          <option value="residence">Residencia</option>
          <option value="trip">Viagem</option>
          <option value="event">Evento</option>
          <option value="team">Equipe</option>
          <option value="project">Projeto</option>
          <option value="other">Outro</option>
        </select>
      </Field>
      <Field error={errors.start_date?.message} label="Inicio">
        <input type="date" {...register("start_date")} />
      </Field>
      <Field error={errors.end_date?.message} label="Fim">
        <input type="date" {...register("end_date")} />
      </Field>
      <Field error={errors.description?.message} label="Descricao">
        <textarea rows={3} {...register("description")} />
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
