// Helpers de data/hora com fuso horário, sem dependências externas.
// Convenção: "date" = "YYYY-MM-DD" e "minutos" = minutos desde 00:00, ambos no fuso do salão.

export const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Diferença (ms) entre o "relógio de parede" do fuso e o UTC no instante dado. */
function offsetMs(instante: Date, tz: string): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instante);
  const n = (tipo: string) => Number(partes.find((p) => p.type === tipo)!.value);
  const comoUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return comoUtc - Math.floor(instante.getTime() / 1000) * 1000;
}

/** Converte "YYYY-MM-DD" + minutos desde 00:00 (relógio do fuso) para o instante UTC. */
export function zonedParaUtc(date: string, minutos: number, tz: string): Date {
  const [a, m, d] = date.split("-").map(Number);
  const palpite = Date.UTC(a, m - 1, d, 0, minutos);
  const off1 = offsetMs(new Date(palpite), tz);
  let utc = palpite - off1;
  const off2 = offsetMs(new Date(utc), tz);
  if (off2 !== off1) utc = palpite - off2; // virada de horário de verão
  return new Date(utc);
}

/** "2026-10-26T14:30" (relógio do fuso) → instante UTC. */
export function localStringParaUtc(local: string, tz: string): Date {
  const [data, hora] = local.split("T");
  const [hh, mm] = hora.split(":").map(Number);
  return zonedParaUtc(data, hh * 60 + mm, tz);
}

/** Instante UTC → { date, time, minutos } no relógio do fuso. */
export function utcParaLocal(instante: Date, tz: string) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instante);
  const g = (t: string) => partes.find((p) => p.type === t)!.value;
  const date = `${g("year")}-${g("month")}-${g("day")}`;
  const time = `${g("hour")}:${g("minute")}`;
  return { date, time, minutos: Number(g("hour")) * 60 + Number(g("minute")) };
}

/** Data de hoje (YYYY-MM-DD) no fuso. */
export function hojeNoFuso(tz: string, agora = new Date()): string {
  return utcParaLocal(agora, tz).date;
}

export function somarDias(date: string, n: number): string {
  const [a, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + n, 12));
  return dt.toISOString().slice(0, 10);
}

/** 0 = domingo ... 6 = sábado */
export function diaDaSemana(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Início do dia (00:00 no fuso) e início do dia seguinte, em UTC. */
export function limitesDoDia(date: string, tz: string) {
  return {
    inicio: zonedParaUtc(date, 0, tz),
    fim: zonedParaUtc(somarDias(date, 1), 0, tz),
  };
}

export function minutosParaHHMM(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function hhmmParaMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
