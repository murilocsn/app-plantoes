import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { money } from "../lib/formatters";
import { paymentLabels, type PaymentState } from "../lib/payment-view";
import { ActionsPopover } from "./ActionsPopover";

type LedgerRowProps = {
  title: string;
  time: string;
  subtitle?: string;
  date?: string;
  amount: number;
  color?: string;
  paymentState: PaymentState;
  entryType: "shift" | "receivable";
  warning?: string;
  children: ReactNode;
};

export function LedgerRow({
  title,
  time,
  subtitle,
  date,
  amount,
  color,
  paymentState,
  entryType,
  warning,
  children,
}: LedgerRowProps) {
  return (
    <article className="ledger-row" data-entry-type={entryType} data-payment-state={paymentState}>
      <ActionsPopover
        label={entryType === "shift" ? "Ações do plantão" : "Ações do recebimento"}
        renderTrigger={(props) => (
          <button {...props} className="ledger-trigger" type="button">
            <span
              aria-hidden="true"
              className="ledger-accent"
              style={color ? { backgroundColor: color } : undefined}
            />
            <span className="ledger-copy">
              <span className="ledger-time">{time}</span>
              <strong className="ledger-title">{title}</strong>
              {date && <span className="ledger-date">{date}</span>}
              {subtitle && <span className="ledger-subtitle">{subtitle}</span>}
              {warning && <span className="ledger-warning">{warning}</span>}
            </span>
            <span className="ledger-payment">
              <span className="ledger-amount">{money(amount)}</span>
              <span className={`payment-badge payment-${paymentState}`}>
                {paymentLabels[paymentState]}
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="ledger-chevron" size={18} />
          </button>
        )}
      >
        {children}
      </ActionsPopover>
    </article>
  );
}
