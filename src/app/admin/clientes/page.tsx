"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { brl, dataBR } from "@/lib/formatar";
import { Alerta, btnGhost, btnPrimary, Campo, inputCls, Modal, StatusBadge, type Status } from "@/components/ui";

type Cliente = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  temLogin: boolean;
  visitas: number;
  faltas: number;
  ultimaVisita: string | null;
};
type Ficha = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  historico: { id: string; date: string; time: string; status: Status; professionalName: string; servicos: string[]; totalCents: number }[];
};

export default function ClientesPage() {
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<Cliente[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [novo, setNovo] = useState(false);

  const carregar = useCallback(() => {
    const qs = busca.trim() ? `?q=${encodeURIComponent(busca.trim())}` : "";
    api<Cliente[]>(`/api/admin/clients${qs}`).then(setLista).catch((e) => setErro(e.message));
  }, [busca]);
  useEffect(() => {
    const t = setTimeout(carregar, 250); // pequena espera enquanto digita
    return () => clearTimeout(t);
  }, [carregar]);

  const abrir = (id: string) => api<Ficha>(`/api/admin/clients/${id}`).then(setFicha).catch((e) => setErro(e.message));

  return (
    <main className="mx-auto max-w-4xl p-3 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <button onClick={() => setNovo(true)} className={btnPrimary}>+ Novo cliente</button>
      </div>
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, telefone ou e-mail" className={`${inputCls} mb-4`} />

      {erro && <Alerta>{erro}</Alerta>}
      {!lista && !erro && <p className="text-neutral-500">Carregando…</p>}
      {lista && lista.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-neutral-500">Nenhum cliente encontrado.</p>}
      <ul className="divide-y rounded-xl border bg-white">
        {lista?.map((c) => (
          <li key={c.id}>
            <button onClick={() => abrir(c.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-neutral-50">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block truncate text-sm text-neutral-500">{c.phone ?? c.email ?? "sem contato"}</span>
              </span>
              <span className="text-right text-sm">
                <span className="block font-medium">{c.visitas} visita(s)</span>
                <span className="block text-neutral-500">{c.ultimaVisita ? `última: ${dataBR(c.ultimaVisita)}` : "sem visitas"}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {ficha && <FichaCliente ficha={ficha} onClose={() => setFicha(null)} onSalvo={() => { carregar(); abrir(ficha.id); }} />}
      {novo && <NovoCliente onClose={() => setNovo(false)} onCriado={() => { setNovo(false); carregar(); }} />}
    </main>
  );
}

function FichaCliente({ ficha, onClose, onSalvo }: { ficha: Ficha; onClose: () => void; onSalvo: () => void }) {
  const [notes, setNotes] = useState(ficha.notes ?? "");
  const [salvo, setSalvo] = useState(false);

  async function salvarNotas() {
    await api(`/api/admin/clients/${ficha.id}`, { method: "PATCH", body: JSON.stringify({ notes: notes || null }) });
    setSalvo(true);
    onSalvo();
  }

  return (
    <Modal titulo={ficha.name} onClose={onClose}>
      <p className="mb-3 text-sm text-neutral-600">{[ficha.phone, ficha.email].filter(Boolean).join(" · ") || "Sem contato cadastrado"}</p>
      <Campo rotulo="Observações internas">
        <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setSalvo(false); }} rows={3} className={inputCls} placeholder="Preferências, alergias, cor usada…" />
      </Campo>
      <div className="mt-2 flex items-center justify-end gap-2">
        {salvo && <span className="text-sm text-emerald-600">Salvo</span>}
        <button onClick={salvarNotas} className={btnGhost}>Salvar observações</button>
      </div>

      <h3 className="mb-2 mt-5 font-semibold">Histórico de visitas</h3>
      {ficha.historico.length === 0 && <p className="text-sm text-neutral-500">Nenhum agendamento ainda.</p>}
      <ul className="space-y-2">
        {ficha.historico.map((h) => (
          <li key={h.id} className="rounded-lg border p-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{dataBR(h.date)} · {h.time}</span>
              <StatusBadge status={h.status} />
            </div>
            <p className="text-neutral-600">{h.servicos.join(", ")} · {h.professionalName} · {brl(h.totalCents)}</p>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function NovoCliente({ onClose, onCriado }: { onClose: () => void; onCriado: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/admin/clients", { method: "POST", body: JSON.stringify({ name, phone: phone || undefined }) });
      onCriado();
    } catch (err: any) {
      setErro(err.message);
    }
  }

  return (
    <Modal titulo="Novo cliente" onClose={onClose}>
      <form onSubmit={salvar} className="space-y-3">
        <Campo rotulo="Nome"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Campo>
        <Campo rotulo="Telefone / WhatsApp"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></Campo>
        {erro && <Alerta>{erro}</Alerta>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
          <button className={btnPrimary}>Salvar</button>
        </div>
      </form>
    </Modal>
  );
}
