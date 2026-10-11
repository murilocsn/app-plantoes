export function shiftValueFromDuration(value12: unknown, duration: unknown) {
  const baseValue = Number(value12);
  const hours = Number(duration);

  if (!Number.isFinite(baseValue) || !Number.isFinite(hours) || baseValue < 0 || hours <= 0) {
    return 0;
  }

  return Math.round((baseValue * hours * 100) / 12) / 100;
}
