export type BillingRule = {
  reference_start_day: number;
  reference_end_day: number;
  payment_due_day: number;
  payment_due_months_after: number;
};

function monthDay(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

/** Reference dates and payment use calendar months, never a fixed number of days. */
export function billingPeriod(shiftDate: string, rule: BillingRule) {
  const date = new Date(`${shiftDate}T12:00:00Z`);
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  let closingMonth = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, closingMonth + 1, 0)).getUTCDate();
  const startDay = Math.min(rule.reference_start_day, lastDay);
  const crossesMonth = rule.reference_start_day > rule.reference_end_day;

  if (crossesMonth) {
    // E.g. 26/Aug through 25/Sep closes in September, not August.
    if (day >= startDay) closingMonth += 1;
  } else if (day > rule.reference_end_day) {
    closingMonth += 1;
  } else if (day < startDay) {
    closingMonth -= 1;
  }

  return {
    from: monthDay(year, closingMonth - (crossesMonth ? 1 : 0), rule.reference_start_day),
    to: monthDay(year, closingMonth, rule.reference_end_day),
    expectedDate: monthDay(
      year,
      closingMonth + rule.payment_due_months_after,
      rule.payment_due_day,
    ),
  };
}
