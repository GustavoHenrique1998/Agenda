import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarHorarios, janelasLivres, subtrair } from "../src/server/intervalos.ts";
import { hhmmParaMinutos as m, minutosParaHHMM as hh } from "../src/lib/datas.ts";

const salao = { isOpen: true, startMin: m("08:00"), endMin: m("20:00") };
const joana = {
  isOpen: true,
  startMin: m("09:00"),
  endMin: m("18:00"),
  breakStartMin: m("12:00"),
  breakEndMin: m("13:00"),
};
const horarios = (livres: ReturnType<typeof janelasLivres>, dur: number, passo = 30, min = 0) =>
  gerarHorarios(livres, dur, passo, min).map(hh);

test("subtrair divide a janela no meio", () => {
  assert.deepEqual(subtrair([{ start: 0, end: 100 }], [{ start: 40, end: 60 }]), [
    { start: 0, end: 40 },
    { start: 60, end: 100 },
  ]);
});

test("expediente = interseção salão x profissional, sem almoço", () => {
  const livres = janelasLivres(salao, joana, []);
  assert.deepEqual(livres, [
    { start: m("09:00"), end: m("12:00") },
    { start: m("13:00"), end: m("18:00") },
  ]);
});

test("serviço de 2h às 14:00 → próximo horário livre às 16:00", () => {
  const ocupados = [{ start: m("14:00"), end: m("16:00") }];
  const h = horarios(janelasLivres(salao, joana, ocupados), 120);
  assert.ok(!h.includes("14:00") && !h.includes("15:00"), "14:00/15:00 não podem aparecer");
  assert.ok(!h.includes("13:30"), "13:30 + 2h invadiria o agendamento das 14:00");
  assert.ok(h.includes("16:00"), "16:00 precisa estar livre");
  // 13:00 + 2h invadiria o atendimento das 14:00, então só 09:00–10:00 e 16:00 sobram
  assert.deepEqual(h, ["09:00", "09:30", "10:00", "16:00"]);
});

test("serviço não pode atravessar o almoço", () => {
  const h = horarios(janelasLivres(salao, joana, []), 120);
  assert.ok(!h.includes("11:00") && !h.includes("11:30"));
  assert.ok(h.includes("10:00") && h.includes("13:00"));
});

test("serviço não pode terminar depois do fim do expediente", () => {
  const h = horarios(janelasLivres(salao, joana, []), 60);
  assert.equal(h.at(-1), "17:00");
});

test("agendamento encostado (termina 16:00) libera início às 16:00", () => {
  const ocupados = [{ start: m("15:00"), end: m("16:00") }];
  assert.ok(horarios(janelasLivres(salao, joana, ocupados), 60).includes("16:00"));
});

test("dia fechado (folga semanal) não tem horários", () => {
  assert.deepEqual(janelasLivres(salao, { ...joana, isOpen: false }, []), []);
  assert.deepEqual(janelasLivres({ ...salao, isOpen: false }, joana, []), []);
  assert.deepEqual(janelasLivres(salao, null, []), []);
});

test("bloqueio (folga no meio do dia) remove os horários cobertos", () => {
  const ocupados = [{ start: m("09:00"), end: m("11:00") }];
  const h = horarios(janelasLivres(salao, joana, ocupados), 60);
  assert.equal(h[0], "11:00");
});

test("antecedência mínima descarta horários próximos", () => {
  const h = horarios(janelasLivres(salao, joana, []), 60, 30, m("14:10"));
  assert.equal(h.find((x) => x >= "13:00"), "14:30");
});

test("passo de 15 min gera mais opções que 30", () => {
  const livres = janelasLivres(salao, joana, []);
  assert.ok(gerarHorarios(livres, 60, 15).length > gerarHorarios(livres, 60, 30).length);
});

test("almoço do salão também vale para todos", () => {
  const salaoComAlmoco = { ...salao, breakStartMin: m("12:30"), breakEndMin: m("13:30") };
  const sem = { ...joana, breakStartMin: null, breakEndMin: null };
  const h = horarios(janelasLivres(salaoComAlmoco, sem, []), 30);
  assert.ok(!h.includes("12:30") && !h.includes("13:00"));
  assert.ok(h.includes("12:00") && h.includes("13:30"));
});
