import { isMatch } from "date-fns";
import { CalendarDays } from "lucide-react";
import { forwardRef, useId } from "react";
import { dateLabel, parseDateInput } from "../lib/formatters";

type DateFieldProps = {
  label: string;
  name: string;
  value: string;
  error?: string;
  hint?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
};

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(function DateField(
  { label, name, value, error, hint, autoFocus, disabled, onChange, onBlur },
  ref,
) {
  const id = useId();
  const isISODate = /^\d{4}-\d{2}-\d{2}$/.test(value) && isMatch(value, "yyyy-MM-dd");
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const descriptionIds = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const calendarLabel = `Escolher ${label.toLowerCase()} no calendario`;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="date-input">
        <input
          aria-describedby={descriptionIds}
          aria-invalid={Boolean(error)}
          autoFocus={autoFocus}
          disabled={disabled}
          id={id}
          inputMode="numeric"
          maxLength={10}
          name={name}
          onBlur={onBlur}
          onChange={(event) => onChange(parseDateInput(event.target.value) ?? event.target.value)}
          placeholder="DD/MM/AAAA"
          ref={ref}
          type="text"
          value={isISODate ? dateLabel(value) : value}
        />
        <span className="date-picker" title={calendarLabel}>
          <CalendarDays aria-hidden="true" size={18} />
          <input
            aria-describedby={descriptionIds}
            aria-invalid={Boolean(error)}
            aria-label={calendarLabel}
            disabled={disabled}
            lang="pt-BR"
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.value)}
            type="date"
            value={isISODate ? value : ""}
          />
        </span>
      </div>
      {hint && <small className="form-hint" id={hintId}>{hint}</small>}
      {error && <small className="field-error" id={errorId}>{error}</small>}
    </div>
  );
});
