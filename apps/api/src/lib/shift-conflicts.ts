const MINUTES_PER_DAY = 24 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ShiftConflictCandidate = {
  id?: string | null;
  date: string;
  start_time?: string | null;
  duration?: number | string | null;
};

type ShiftInterval = {
  start: number;
  end: number;
};

export type ShiftConflict = {
  candidate: ShiftConflictCandidate;
  existing: ShiftConflictCandidate;
};

function dateToDayIndex(date: string) {
  const [yearText, monthText, dayText] = date.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function dayIndexToDate(dayIndex: number) {
  return new Date(dayIndex * DAY_MS).toISOString().slice(0, 10);
}

function timeToMinutes(time?: string | null) {
  const match = time?.match(/^(\d{2}):(\d{2})/);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function toInterval(shift: ShiftConflictCandidate): ShiftInterval | null {
  const startMinutes = timeToMinutes(shift.start_time);
  const duration = Number(shift.duration);

  if (startMinutes === null || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  const start = dateToDayIndex(shift.date) * MINUTES_PER_DAY + startMinutes;

  return {
    start,
    end: start + duration * 60,
  };
}

export function shiftsOverlap(first: ShiftConflictCandidate, second: ShiftConflictCandidate) {
  const firstInterval = toInterval(first);
  const secondInterval = toInterval(second);

  if (!firstInterval || !secondInterval) {
    return false;
  }

  return firstInterval.start < secondInterval.end && firstInterval.end > secondInterval.start;
}

export function findFirstInternalShiftConflict(candidates: ShiftConflictCandidate[]): ShiftConflict | null {
  for (let index = 0; index < candidates.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < candidates.length; nextIndex += 1) {
      const existing = candidates[index];
      const candidate = candidates[nextIndex];

      if (!existing || !candidate) {
        continue;
      }

      if (shiftsOverlap(existing, candidate)) {
        return {
          candidate,
          existing,
        };
      }
    }
  }

  return null;
}

export function findFirstShiftConflict(
  candidates: ShiftConflictCandidate[],
  existingShifts: ShiftConflictCandidate[],
  options: { ignoreIds?: string[] } = {},
): ShiftConflict | null {
  const ignoreIds = new Set(options.ignoreIds ?? []);

  for (const candidate of candidates) {
    for (const existing of existingShifts) {
      if (existing.id && ignoreIds.has(existing.id)) {
        continue;
      }

      if (shiftsOverlap(candidate, existing)) {
        return { candidate, existing };
      }
    }
  }

  return null;
}

export function shiftConflictQueryRange(candidates: ShiftConflictCandidate[]) {
  const intervals = candidates.map(toInterval).filter((interval): interval is ShiftInterval => Boolean(interval));

  if (!intervals.length) {
    return null;
  }

  const startDay = Math.floor(Math.min(...intervals.map((interval) => interval.start)) / MINUTES_PER_DAY);
  const endDay = Math.floor(Math.max(...intervals.map((interval) => interval.end)) / MINUTES_PER_DAY);

  return {
    from: dayIndexToDate(startDay - 2),
    to: dayIndexToDate(endDay),
  };
}
