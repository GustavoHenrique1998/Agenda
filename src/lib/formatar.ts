export const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const duracao = (min: number) =>
  min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}` : `${min} min`;

/** "2026-10-26" → "26/10/2026" */
export const dataBR = (date: string) => date.split("-").reverse().join("/");

/** Reais digitados ("1.234,50" ou "35") → centavos */
export function reaisParaCentavos(texto: string): number {
  const limpo = texto.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export const centavosParaReais = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
