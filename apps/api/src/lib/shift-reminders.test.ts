import { describe, expect, it } from "vitest";
// Testa a mesma logica pura usada pela Edge Function, sem enviar push real.
import {
  candidatesFor,
  localInstant,
  notificationPayload,
  reminderDateRange,
  type ReminderKind,
  type Shift,
} from "../../../../supabase/functions/send-shift-reminders/reminders";

const shift: Shift = {
  id: "test-shift",
  user_id: "test-user",
  date: "2026-10-18",
  start_time: "07:00:00",
  location_name: "Unidade de teste",
};
const start = localInstant(shift.date, shift.start_time)!;
const url = "https://example.test/";

describe("lembretes de plantao", () => {
  it.each([1, 4, 9])("nao antecipa o aviso de inicio em %i minutos", (minutes) => {
    expect(candidatesFor([shift], start - minutes, 10)).toEqual([]);
  });

  it.each([0, 1, 4, 9])("envia inicio com %i minutos decorridos", (minutes) => {
    expect(candidatesFor([shift], start + minutes, 10)).toEqual([{ kind: "start", shift }]);
  });

  it.each([10, 11, 60])("nao envia aviso vencido ha %i minutos", (minutes) => {
    expect(candidatesFor([shift], start + minutes, 10)).toEqual([]);
  });

  it.each<{ kind: ReminderKind; before: number }>([
    { kind: "24h", before: 1440 },
    { kind: "90m", before: 90 },
  ])("preserva a janela do lembrete $kind", ({ kind, before }) => {
    expect(candidatesFor([shift], start - before, 10)).toEqual([{ kind, shift }]);
    expect(candidatesFor([shift], start - before - 9, 10)).toEqual([{ kind, shift }]);
    expect(candidatesFor([shift], start - before - 10, 10)).toEqual([]);
    expect(candidatesFor([shift], start - before + 1, 10)).toEqual([]);
  });

  it("respeita a janela configurada para recuperar execucoes atrasadas", () => {
    expect(candidatesFor([shift], start + 4, 5)).toHaveLength(1);
    expect(candidatesFor([shift], start + 5, 5)).toEqual([]);
  });

  it("inclui o dia anterior ao recuperar um inicio depois da meia-noite", () => {
    const midnightShift = { ...shift, date: "2026-10-18", start_time: "23:59" };
    const now = localInstant("2026-10-19", "00:02")!;
    expect(reminderDateRange(now, 10)).toEqual({ fromDate: "2026-10-18", toDate: "2026-10-20" });
    expect(candidatesFor([midnightShift], now, 10)).toEqual([{ kind: "start", shift: midnightShift }]);
  });

  it("busca hoje e amanha sem perder os lembretes de 24h", () => {
    expect(reminderDateRange(start, 10)).toEqual({ fromDate: "2026-10-18", toDate: "2026-10-19" });
  });

  it.each([null, "", "invalido", "24:00", "07:60"])("ignora horario invalido %s", (time) => {
    expect(candidatesFor([{ ...shift, start_time: time }], start, 10)).toEqual([]);
  });

  it("cria mensagem e identificador proprios para o inicio", () => {
    expect(notificationPayload({ kind: "start", shift }, url)).toEqual({
      title: "Seu plantão está começando",
      body: "07:00 - Unidade de teste",
      tag: "shift-test-shift-start",
      url,
    });
  });

  it.each([
    { kind: "24h" as const, title: "Plantao amanha as 07:00", body: "Unidade de teste" },
    { kind: "90m" as const, title: "Plantao em 90 minutos", body: "07:00 - Unidade de teste" },
  ])("preserva texto e identificador do lembrete $kind", ({ kind, title, body }) => {
    expect(notificationPayload({ kind, shift }, url)).toEqual({ title, body, tag: `shift-test-shift-${kind}`, url });
  });

  it("os tres avisos do mesmo plantao tem identificadores distintos", () => {
    const kinds: ReminderKind[] = ["24h", "90m", "start"];
    expect(new Set(kinds.map(kind => notificationPayload({ kind, shift }, url).tag)).size).toBe(3);
  });
});
