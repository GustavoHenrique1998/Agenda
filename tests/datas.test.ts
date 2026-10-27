import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diaDaSemana,
  limitesDoDia,
  localStringParaUtc,
  somarDias,
  utcParaLocal,
  zonedParaUtc,
} from "../src/lib/datas.ts";

const TZ = "America/Sao_Paulo";

test("14:00 em São Paulo = 17:00 UTC (UTC-3, sem horário de verão)", () => {
  assert.equal(zonedParaUtc("2026-10-26", 14 * 60, TZ).toISOString(), "2026-10-26T17:00:00.000Z");
});

test("ida e volta local → UTC → local", () => {
  const utc = localStringParaUtc("2026-12-24T09:30", TZ);
  assert.deepEqual(utcParaLocal(utc, TZ), { date: "2026-12-24", time: "09:30", minutos: 570 });
});

test("limites do dia: 00:00 local até 00:00 do dia seguinte", () => {
  const { inicio, fim } = limitesDoDia("2026-10-26", TZ);
  assert.equal(inicio.toISOString(), "2026-10-26T03:00:00.000Z");
  assert.equal(fim.toISOString(), "2026-10-27T03:00:00.000Z");
});

test("horário local perto da meia-noite cai no dia certo", () => {
  // 23:30 locais de 26/10 = 02:30 UTC de 27/10
  const utc = zonedParaUtc("2026-10-26", 23 * 60 + 30, TZ);
  assert.equal(utcParaLocal(utc, TZ).date, "2026-10-26");
});

test("somarDias e dia da semana", () => {
  assert.equal(somarDias("2026-10-31", 1), "2026-11-01");
  assert.equal(somarDias("2026-03-01", -1), "2026-02-28");
  assert.equal(diaDaSemana("2026-10-26"), 1); // segunda-feira
  assert.equal(diaDaSemana("2026-10-25"), 0); // domingo
});

test("fuso com horário de verão (Nova York) também converte certo", () => {
  assert.equal(zonedParaUtc("2026-07-01", 12 * 60, "America/New_York").toISOString(), "2026-07-01T16:00:00.000Z");
  assert.equal(zonedParaUtc("2026-01-01", 12 * 60, "America/New_York").toISOString(), "2026-01-01T17:00:00.000Z");
});
