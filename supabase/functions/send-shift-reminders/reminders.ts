export type Shift = {
  id: string;
  user_id: string;
  date: string;
  start_time: string | null;
  location_name: string | null;
};

export type ReminderKind = "24h" | "90m" | "start";

export type ReminderCandidate = { kind: ReminderKind; shift: Shift };

const reminderRules: Array<{ kind: ReminderKind; minutesBefore: number }> = [
  { kind: "24h", minutesBefore: 24 * 60 },
  { kind: "90m", minutesBefore: 90 },
  { kind: "start", minutesBefore: 0 },
];

export function dateToDayNumber(date: string) {
  const [year = NaN, month = NaN, day = NaN] = date.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function dayNumberToDate(dayNumber: number) {
  return new Date(dayNumber * 86_400_000).toISOString().slice(0, 10);
}

export function minutesToTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function localInstant(date: string, startTime: string | null) {
  if (!startTime) return null;
  const [hour = NaN, minute = NaN] = startTime.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return dateToDayNumber(date) * 1440 + hour * 60 + minute;
}

export function reminderDateRange(nowInstant: number, windowMinutes: number) {
  const minTarget = Math.min(...reminderRules.map((rule) =>
    rule.kind === "start" ? nowInstant - windowMinutes : nowInstant + rule.minutesBefore,
  ));
  const maxTarget = Math.max(...reminderRules.map((rule) =>
    nowInstant + rule.minutesBefore + windowMinutes,
  ));
  return {
    fromDate: dayNumberToDate(Math.floor(minTarget / 1440)),
    toDate: dayNumberToDate(Math.floor(maxTarget / 1440)),
  };
}

export function candidatesFor(shifts: Shift[], nowInstant: number, windowMinutes: number) {
  const candidates: ReminderCandidate[] = [];
  for (const shift of shifts) {
    const shiftInstant = localInstant(shift.date, shift.start_time);
    if (shiftInstant === null) continue;
    for (const rule of reminderRules) {
      const minutesUntilShift = shiftInstant - nowInstant;
      // O aviso de inicio so vence no horario ou depois dele; nunca antecipar.
      const due = rule.kind === "start"
        ? minutesUntilShift <= 0 && minutesUntilShift > -windowMinutes
        : minutesUntilShift >= rule.minutesBefore && minutesUntilShift < rule.minutesBefore + windowMinutes;
      if (due) candidates.push({ kind: rule.kind, shift });
    }
  }
  return candidates;
}

export function notificationPayload(candidate: ReminderCandidate, webAppUrl: string) {
  const time = candidate.shift.start_time?.slice(0, 5) || "Horario nao informado";
  const location = candidate.shift.location_name || "Unidade nao informada";
  const title = candidate.kind === "24h"
    ? `Plantao amanha as ${time}`
    : candidate.kind === "90m" ? "Plantao em 90 minutos" : "Seu plantão está começando";
  return {
    title,
    body: candidate.kind === "24h" ? location : `${time} - ${location}`,
    tag: `shift-${candidate.shift.id}-${candidate.kind}`,
    url: webAppUrl,
  };
}
