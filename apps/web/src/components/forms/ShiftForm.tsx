import { zodResolver } from "@hookform/resolvers/zod";
import type { Location, Shift } from "@financplantoes/shared";
import { recurrenceInputSchema, shiftInputSchema } from "@financplantoes/shared";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../Button";
import { Field } from "../Field";

const shiftFormSchema = shiftInputSchema.extend({
  repeat: z.boolean().default(false),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]).default("weekly"),
  interval_value: z.coerce.number().min(1).max(365).default(1),
  end_date: z.string().optional(),
  occurrences: z.coerce.number().min(2).max(500).optional().or(z.literal("")),
});

type ShiftFormValues = z.infer<typeof shiftFormSchema>;

type ShiftFormProps = {
  locations: Location[];
  initialDate?: string;
  shift?: Shift | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: { shift: z.infer<typeof shiftInputSchema>; recurrence?: unknown }) => void;
};

const today = new Date().toISOString().slice(0, 10);

function toTime(value?: string | null) {
  return value ? value.slice(0, 5) : "07:00";
}

export function ShiftForm({
  locations,
  initialDate,
  shift,
  submitting,
  onCancel,
  onSubmit,
}: ShiftFormProps) {
  const activeLocations = locations.filter((location) => location.active !== false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      date: shift?.date ?? initialDate ?? today,
      start_time: toTime(shift?.start_time),
      location_id: shift?.location_id ?? activeLocations[0]?.id ?? "",
      duration: Number(shift?.duration ?? 12),
      value: Number(shift?.value ?? shift?.value12 ?? activeLocations[0]?.value12 ?? 0),
      professional: shift?.professional ?? "",
      notes: shift?.notes ?? "",
      status: "scheduled",
      createReceivable: true,
      repeat: false,
      frequency: "weekly",
      interval_value: 1,
      end_date: "",
      occurrences: "",
    },
  });

  const selectedLocationId = watch("location_id");
  const repeat = watch("repeat");

  useEffect(() => {
    if (shift) {
      return;
    }

    const selected = activeLocations.find((location) => location.id === selectedLocationId);

    if (selected) {
      setValue("value", Number(selected.value12 ?? 0), { shouldValidate: true });
    }
  }, [activeLocations, selectedLocationId, setValue, shift]);

  return (
    <form
      className="form-grid"
      onSubmit={handleSubmit((values) => {
        const shiftPayload = shiftInputSchema.parse(values);
        const recurrence = values.repeat
          ? recurrenceInputSchema.parse({
              frequency: values.frequency,
              interval_value: values.interval_value,
              end_date: values.end_date || null,
              occurrences: values.occurrences || null,
            })
          : undefined;

        onSubmit({ shift: shiftPayload, recurrence });
      })}
    >
      <Field error={errors.date?.message} label="Data">
        <input autoFocus type="date" {...register("date")} />
      </Field>
      <Field error={errors.start_time?.message} label="Inicio">
        <input type="time" {...register("start_time")} />
      </Field>
      <Field error={errors.location_id?.message} label="Local">
        <select {...register("location_id")}>
          {activeLocations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </Field>
      <Field error={errors.duration?.message} label="Duracao em horas">
        <input min="1" max="48" step="0.5" type="number" {...register("duration")} />
      </Field>
      <Field error={errors.value?.message} label="Valor">
        <input min="0" step="0.01" type="number" {...register("value")} />
      </Field>
      <Field error={errors.professional?.message} label="Profissional">
        <input {...register("professional")} />
      </Field>
      <Field error={errors.notes?.message} label="Observacoes">
        <textarea rows={3} {...register("notes")} />
      </Field>
      {!shift && (
        <>
          <label className="check-field">
            <input type="checkbox" {...register("createReceivable")} />
            <span>Gerar recebivel automaticamente</span>
          </label>
          <label className="check-field">
            <input type="checkbox" {...register("repeat")} />
            <span>Repetir plantao</span>
          </label>
          {repeat && (
            <div className="form-subgrid">
              <Field error={errors.frequency?.message} label="Frequencia">
                <select {...register("frequency")}>
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quinzenal</option>
                  <option value="monthly">Mensal</option>
                  <option value="daily">Diaria</option>
                </select>
              </Field>
              <Field error={errors.interval_value?.message} label="Intervalo">
                <input min="1" max="365" type="number" {...register("interval_value")} />
              </Field>
              <Field error={errors.end_date?.message} label="Data final">
                <input type="date" {...register("end_date")} />
              </Field>
              <Field error={errors.occurrences?.message} label="Quantidade">
                <input min="2" max="500" type="number" {...register("occurrences")} />
              </Field>
            </div>
          )}
        </>
      )}
      <div className="form-actions">
        <Button onClick={onCancel}>Cancelar</Button>
        <Button disabled={submitting || !activeLocations.length} type="submit" variant="primary">
          <Save size={18} />
          <span>Salvar</span>
        </Button>
      </div>
    </form>
  );
}
