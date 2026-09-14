import { zodResolver } from "@hookform/resolvers/zod";
import type { Location, Shift } from "@financplantoes/shared";
import { recurrenceInputSchema, shiftInputSchema } from "@financplantoes/shared";
import { Save } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { calendarColors, colorFor, dateKey } from "../../lib/calendar";
import { Button } from "../Button";
import { DateField } from "../DateField";
import { Field } from "../Field";

const shiftFormSchema = shiftInputSchema.extend({
  repeat: z.boolean().default(false),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]).default("weekly"),
  interval_value: z.coerce.number().min(1).max(365).default(1),
  end_date: z.string().optional(),
  occurrences: z.coerce.number().min(2).max(500).optional().or(z.literal("")),
}).superRefine((values, context) => {
  if (values.repeat && values.end_date && !recurrenceInputSchema.shape.end_date.safeParse(values.end_date).success) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end_date"],
      message: "Informe uma data valida",
    });
  }
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
  const activeLocations = useMemo(
    () => locations.filter((location) => location.active !== false),
    [locations],
  );
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      date: shift?.date ?? initialDate ?? dateKey(new Date()),
      start_time: toTime(shift?.start_time),
      location_id: shift?.location_id ?? activeLocations[0]?.id ?? "",
      duration: Number(shift?.duration ?? 12),
      value: Number(shift?.value ?? shift?.value12 ?? activeLocations[0]?.value12 ?? 0),
      professional: shift?.professional ?? "",
      notes: shift?.notes ?? "",
      marker_color: shift?.marker_color ?? colorFor(shift?.marker_label || shift?.location_name || "Plantao"),
      marker_label: shift?.marker_label ?? "",
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
  const markerColor = watch("marker_color") || colorFor("Plantao");
  const markerLabel = watch("marker_label")?.trim() || "Sem legenda";

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
      <Controller
        control={control}
        name="date"
        render={({ field }) => <DateField {...field} autoFocus error={errors.date?.message} label="Data" />}
      />
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
      <div className="field color-field">
        <span>Marcador do plantao</span>
        <div className="marker-color-preview">
          <i aria-hidden="true" style={{ backgroundColor: markerColor }} />
          <strong>{markerLabel}</strong>
        </div>
        <Field error={errors.marker_label?.message} label="Legenda da cor">
          <input maxLength={80} placeholder="Ex.: UTI, extra, pediatria" {...register("marker_label")} />
        </Field>
        <div aria-label="Cor do marcador do plantao" className="color-swatch-grid" role="radiogroup">
          {calendarColors.map((color) => (
            <button
              aria-checked={markerColor === color}
              aria-label={`Usar cor ${color}`}
              className="color-swatch"
              key={color}
              onClick={() => setValue("marker_color", color, { shouldDirty: true, shouldValidate: true })}
              role="radio"
              style={{ backgroundColor: color }}
              title={color}
              type="button"
            />
          ))}
        </div>
        <label className="custom-color-row">
          <span>Cor personalizada</span>
          <input
            aria-label="Cor personalizada do marcador"
            onChange={(event) =>
              setValue("marker_color", event.target.value, { shouldDirty: true, shouldValidate: true })
            }
            type="color"
            value={markerColor}
          />
        </label>
      </div>
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
              <Controller
                control={control}
                name="end_date"
                render={({ field }) => (
                  <DateField {...field} error={errors.end_date?.message} label="Data final" value={field.value ?? ""} />
                )}
              />
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
