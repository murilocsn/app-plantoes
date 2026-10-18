import { Clock3 } from "lucide-react";
import { money } from "../lib/formatters";
import { PeriodNavigation } from "./PeriodNavigation";

type PaymentSummaryProps = {
  from: string;
  to: string;
  total: number;
  received: number;
  pending: number;
  overdue?: number;
  countLabel: string;
  hours?: number;
  notice?: string;
  onNavigate: (offset: number) => void;
  onCurrentMonth: () => void;
};

export function PaymentSummary({
  from,
  to,
  total,
  received,
  pending,
  overdue,
  countLabel,
  hours,
  notice,
  onNavigate,
  onCurrentMonth,
}: PaymentSummaryProps) {
  const recorded = received + pending + (overdue ?? 0);
  const percentage =
    recorded > 0 ? Math.max(0, Math.min(100, Math.round((received / recorded) * 100))) : 0;

  return (
    <>
      <PeriodNavigation from={from} to={to} onNavigate={onNavigate} onCurrentMonth={onCurrentMonth} />
      <section aria-label="Resumo financeiro do período" className="payment-summary">
        <p className="payment-summary-caption">
          {money(total)} <span>· {countLabel}</span>
        </p>
        <div className="payment-progress-row">
          <div
            aria-label="Percentual dos recebimentos pagos"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={percentage}
            className="payment-progress"
            role="progressbar"
          >
            <span style={{ width: `${percentage}%` }} />
          </div>
          <span>{percentage}%</span>
        </div>
        <dl>
          <div>
            <dt>Total pago:</dt>
            <dd className={overdue === undefined ? undefined : "payment-paid-total"}>
              {money(received)}
            </dd>
          </div>
          <div>
            <dt>{overdue === undefined ? "Total não pago:" : "Pendente:"}</dt>
            <dd
              className={overdue === undefined ? "payment-unpaid-total" : "payment-pending-total"}
            >
              {money(pending)}
            </dd>
          </div>
          {overdue !== undefined && (
            <div>
              <dt>Atrasado:</dt>
              <dd className="payment-overdue-total">{money(overdue)}</dd>
            </div>
          )}
        </dl>
        {hours !== undefined && hours > 0 && (
          <p className="payment-summary-footnote">
            <Clock3 aria-hidden="true" size={14} />
            {money(total / hours)}/h em média
          </p>
        )}
        {notice && <p className="payment-summary-footnote">{notice}</p>}
      </section>
    </>
  );
}
