"use client";
import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { api } from "@/lib/api";
import { brl, dataBR } from "@/lib/formatar";
import { Alerta, btnGhost, btnPrimary, StatusBadge, type Status } from "@/components/ui";

type Item = {
  id: string;
  status: Status;
  date: string;
  time: string;
  endTime: string;
  professionalName: string;
  servicos: { name: string; priceCents: number }[];
  totalCents: number;
  podeCancelar: boolean;
};
type Dados = { proximos: Item[]; historico: Item[]; cancelMinHours: number };

function Cartao({ a, onCancelar }: { a: Item; onCancelar?: (id: string) => void }) {
  return (
    <li className="rounded-xl border bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            {dataBR(a.date)} · {a.time}–{a.endTime}
          </p>
          <p className="text-sm text-neutral-500">com {a.professionalName}</p>
        </div>
        <StatusBadge status={a.status} />
      </div>
      <p className="mt-2 text-sm">{a.servicos.map((s) => s.name).join(" · ")}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-medium">{brl(a.totalCents)}</span>
        {onCancelar && a.podeCancelar && (
          <button onClick={() => onCancelar(a.id)} className="text-sm font-medium text-red-600">
            Cancelar
          </button>
        )}
      </div>
    </li>
  );
}

export default function MeusAgendamentosPage() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [aba, setAba] = useState<"proximos" | "historico">("proximos");
  const [msg, setMsg] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);

  const carregar = useCallback(() => {
    api<Dados>("/api/appointments").then(setDados).catch((e) => setMsg({ tipo: "erro", texto: e.message }));
  }, []);
  useEffect(carregar, [carregar]);

  async function cancelar(id: string) {
    if (!confirm("Deseja mesmo cancelar este agendamento?")) return;
    setMsg(null);
    try {
      await api(`/api/appointments/${id}/cancel`, { method: "POST" });
      setMsg({ tipo: "ok", texto: "Agendamento cancelado." });
      carregar();
    } catch (e: any) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  }

  const lista = dados?.[aba] ?? [];

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <a href="/" className="text-sm text-neutral-500">← Início</a>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm text-neutral-500">Sair</button>
      </header>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meus agendamentos</h1>
        <a href="/agendar" className={`${btnPrimary} text-sm`}>+ Agendar</a>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {(["proximos", "historico"] as const).map((k) => (
          <button key={k} onClick={() => setAba(k)} className={aba === k ? btnPrimary : btnGhost}>
            {k === "proximos" ? "Próximos" : "Histórico"}
          </button>
        ))}
      </div>

      {msg && <div className="mb-3"><Alerta tipo={msg.tipo}>{msg.texto}</Alerta></div>}
      {!dados && !msg && <p className="text-neutral-500">Carregando…</p>}
      {dados && lista.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-neutral-500">
          {aba === "proximos" ? "Você não tem agendamentos futuros." : "Nenhum atendimento no histórico ainda."}
        </p>
      )}
      <ul className="space-y-3">
        {lista.map((a) => (
          <Cartao key={a.id} a={a} onCancelar={aba === "proximos" ? cancelar : undefined} />
        ))}
      </ul>
      {dados && aba === "proximos" && lista.length > 0 && (
        <p className="mt-4 text-xs text-neutral-500">
          Cancelamentos online são aceitos com pelo menos {dados.cancelMinHours}h de antecedência.
          Depois disso, entre em contato com o salão.
        </p>
      )}
    </main>
  );
}
