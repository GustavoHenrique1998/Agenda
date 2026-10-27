"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { brl } from "@/lib/formatar";
import { minutosParaHHMM } from "@/lib/datas";
import { StatusBadge, type Status } from "@/components/ui";

type Resumo = { total: number; faturamentoEstimadoCents: number; concluidos: number; clientes: number };
type Linha = {
  id: string;
  startMin: number;
  endMin: number;
  status: Status;
  clientName: string;
  professionalName: string;
  servicos: string[];
  totalCents: number;
};

const hojeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function DashboardPage() {
  const [dados, setDados] = useState<{ resumo: Resumo; lista: Linha[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api(`/api/admin/agenda?date=${hojeLocal()}`).then(setDados).catch((e) => setErro(e.message));
  }, []);

  const cards = dados && [
    { t: "Agendamentos hoje", v: dados.resumo.total },
    { t: "Faturamento estimado", v: brl(dados.resumo.faturamentoEstimadoCents) },
    { t: "Atendimentos concluídos", v: dados.resumo.concluidos },
    { t: "Clientes do dia", v: dados.resumo.clientes },
  ];

  return (
    <main className="mx-auto max-w-5xl p-3 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hoje</h1>
        <a href="/admin/agendamentos?novo=1" className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white">
          + Novo agendamento
        </a>
      </div>

      {erro && <p className="rounded-lg bg-red-50 p-3 text-red-700">{erro}</p>}
      {!dados && !erro && <p className="text-neutral-500">Carregando…</p>}

      {cards && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.t} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-neutral-500">{c.t}</p>
              <p className="mt-1 text-2xl font-semibold">{c.v}</p>
            </div>
          ))}
        </div>
      )}

      {dados && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Agenda de hoje</h2>
            <a href="/admin/agenda" className="text-sm font-medium text-rose-600">Ver linha do tempo →</a>
          </div>
          {dados.lista.length === 0 ? (
            <p className="rounded-xl bg-white p-6 text-center text-neutral-500">Nenhum agendamento para hoje.</p>
          ) : (
            <ul className="divide-y rounded-xl border bg-white">
              {dados.lista.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3">
                  <span className="w-28 font-semibold">
                    {minutosParaHHMM(a.startMin)}–{minutosParaHHMM(a.endMin)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.clientName}</span>
                    <span className="block truncate text-sm text-neutral-500">
                      {a.servicos.join(", ")} · {a.professionalName}
                    </span>
                  </span>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
