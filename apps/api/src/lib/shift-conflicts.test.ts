import { describe, expect, it } from "vitest";
import {
  findFirstInternalShiftConflict,
  findFirstShiftConflict,
  shiftConflictQueryRange,
  shiftsOverlap,
} from "./shift-conflicts";

describe("shift conflicts", () => {
  it("detecta conflito no mesmo horario", () => {
    expect(
      shiftsOverlap(
        { date: "2026-09-11", start_time: "07:00", duration: 6 },
        { date: "2026-09-11", start_time: "07:00", duration: 12 },
      ),
    ).toBe(true);
  });

  it("permite plantao que comeca quando outro termina", () => {
    expect(
      shiftsOverlap(
        { date: "2026-09-11", start_time: "07:00", duration: 6 },
        { date: "2026-09-11", start_time: "13:00", duration: 6 },
      ),
    ).toBe(false);
  });

  it("detecta conflito quando o plantao vira a madrugada", () => {
    expect(
      shiftsOverlap(
        { date: "2026-09-12", start_time: "06:00", duration: 6 },
        { date: "2026-09-11", start_time: "19:00", duration: 12 },
      ),
    ).toBe(true);
  });

  it("ignora o proprio plantao durante edicao", () => {
    const conflict = findFirstShiftConflict(
      [{ id: "shift-1", date: "2026-09-11", start_time: "07:00", duration: 6 }],
      [{ id: "shift-1", date: "2026-09-11", start_time: "07:00", duration: 6 }],
      { ignoreIds: ["shift-1"] },
    );

    expect(conflict).toBeNull();
  });

  it("detecta conflito dentro de uma recorrencia antes de salvar", () => {
    const conflict = findFirstInternalShiftConflict([
      { date: "2026-09-11", start_time: "07:00", duration: 30 },
      { date: "2026-09-12", start_time: "07:00", duration: 12 },
    ]);

    expect(conflict?.candidate.date).toBe("2026-09-12");
  });

  it("busca tambem dias anteriores para cobrir plantoes longos", () => {
    expect(
      shiftConflictQueryRange([{ date: "2026-09-11", start_time: "06:00", duration: 6 }]),
    ).toEqual({
      from: "2026-09-09",
      to: "2026-09-11",
    });
  });
});
