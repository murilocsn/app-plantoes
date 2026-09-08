import { isMatch } from "date-fns";
import { CalendarDays } from "lucide-react";
import { forwardRef, useId } from "react";
import { dateLabel, parseDateInput } from "../lib/formatters";

type DateFieldProps = {
  label: string;
  name: string;
  value: string;
  error?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
};

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(function DateField(
  { label, name, value, error, autoFocus, disabled, onChange, onBlur },
  ref,
) {
  const id = useId();
  const isISODate = /^\d{4}-\d{2}-\d{2}$/.test(value) && isMatch(value, "yyyy-MM-dd");
  const errorId = `${id}-error`;
  const calendarLabel = `Escolher ${label.toLowerCase()} no calendario`;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="date-input">
        <input
          aria-describedby={error ? errorId : undefined}
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
      {error && <small className="field-error" id={errorId}>{error}</small>}
    </div>
  );
});
