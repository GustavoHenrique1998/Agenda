"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { brl, centavosParaReais, duracao, reaisParaCentavos } from "@/lib/formatar";
import { Alerta, btnGhost, btnPrimary, Campo, inputCls, Modal } from "@/components/ui";

type Servico = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMin: number;
  bufferMin: number;
  active: boolean;
  categoryId: string;
  professionalIds: string[];
};
type Dados = {
  categorias: { id: string; name: string }[];
  profissionais: { id: string; name: string }[];
  servicos: Servico[];
};

export default function ServicosPage() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [editando, setEditando] = useState<Servico | "novo" | null>(null);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const carregar = useCallback(() => {
    api<Dados>("/api/admin/services").then(setDados).catch((e) => setMsg(e.message));
  }, []);
  useEffect(carregar, [carregar]);

  async function alternarAtivo(s: Servico) {
    await api(`/api/admin/services/${s.id}`, { method: "PATCH", body: JSON.stringify({ active: !s.active }) }).catch((e) => setMsg(e.message));
    carregar();
  }

  async function criarCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!novaCategoria.trim()) return;
    try {
      await api("/api/admin/categories", { method: "POST", body: JSON.stringify({ name: novaCategoria }) });
      setNovaCategoria("");
      setMsg(null);
      carregar();
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-3 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Serviços</h1>
        <button onClick={() => setEditando("novo")} disabled={!dados?.categorias.length} className={btnPrimary}>+ Novo serviço</button>
      </div>

      <form onSubmit={criarCategoria} className="mb-5 flex gap-2">
        <input value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} placeholder="Nova categoria (ex.: Depilação)" className={inputCls} />
        <button className={btnGhost}>Adicionar</button>
      </form>
      {msg && <div className="mb-3"><Alerta>{msg}</Alerta></div>}
      {!dados && !msg && <p className="text-neutral-500">Carregando…</p>}

      {dados?.categorias.map((c) => {
        const itens = dados.servicos.filter((s) => s.categoryId === c.id);
        return (
          <section key={c.id} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">{c.name}</h2>
            {itens.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-neutral-500">Nenhum serviço nesta categoria.</p>}
            <ul className="divide-y rounded-xl border bg-white">
              {itens.map((s) => (
                <li key={s.id} className={`flex flex-wrap items-center gap-3 p-3 ${s.active ? "" : "opacity-60"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name}{!s.active && <span className="ml-2 text-xs text-neutral-500">(inativo)</span>}</p>
                    <p className="text-sm text-neutral-500">{duracao(s.durationMin)}{s.bufferMin > 0 && ` + ${s.bufferMin} min de intervalo`}</p>
                  </div>
                  <p className="font-semibold">{brl(s.priceCents)}</p>
                  <button onClick={() => setEditando(s)} className="text-sm font-medium text-rose-600">Editar</button>
                  <button onClick={() => alternarAtivo(s)} className="text-sm text-neutral-500">{s.active ? "Inativar" : "Reativar"}</button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {editando && dados && (
        <FormServico
          dados={dados}
          servico={editando === "novo" ? null : editando}
          onClose={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}
    </main>
  );
}

function FormServico({ dados, servico, onClose, onSalvo }: { dados: Dados; servico: Servico | null; onClose: () => void; onSalvo: () => void }) {
  const [name, setName] = useState(servico?.name ?? "");
  const [description, setDescription] = useState(servico?.description ?? "");
  const [categoryId, setCategoryId] = useState(servico?.categoryId ?? dados.categorias[0]?.id ?? "");
  const [preco, setPreco] = useState(servico ? centavosParaReais(servico.priceCents) : "");
  const [durationMin, setDurationMin] = useState(String(servico?.durationMin ?? 60));
  const [bufferMin, setBufferMin] = useState(String(servico?.bufferMin ?? 0));
  const [professionalIds, setProfessionalIds] = useState<string[]>(servico?.professionalIds ?? dados.profissionais.map((p) => p.id));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const priceCents = reaisParaCentavos(preco);
    if (!Number.isFinite(priceCents)) return setErro("Preço inválido.");
    setSalvando(true);
    const corpo = {
      name,
      description: description || null,
      categoryId,
      priceCents,
      durationMin: Number(durationMin),
      bufferMin: Number(bufferMin) || 0,
      professionalIds,
    };
    try {
      if (servico) await api(`/api/admin/services/${servico.id}`, { method: "PATCH", body: JSON.stringify(corpo) });
      else await api("/api/admin/services", { method: "POST", body: JSON.stringify({ ...corpo, active: true }) });
      onSalvo();
    } catch (err: any) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={servico ? "Editar serviço" : "Novo serviço"} onClose={onClose}>
      <form onSubmit={salvar} className="space-y-3">
        <Campo rotulo="Nome"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Campo>
        <Campo rotulo="Categoria">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
            {dados.categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Campo>
        <div className="grid grid-cols-3 gap-2">
          <Campo rotulo="Preço (R$)"><input required inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="80,00" className={inputCls} /></Campo>
          <Campo rotulo="Duração (min)"><input required type="number" min={5} step={5} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} className={inputCls} /></Campo>
          <Campo rotulo="Intervalo (min)"><input type="number" min={0} step={5} value={bufferMin} onChange={(e) => setBufferMin(e.target.value)} className={inputCls} /></Campo>
        </div>
        <p className="text-xs text-neutral-500">A duração define quanto tempo o horário fica ocupado. O intervalo é uma folga de preparo/limpeza depois do atendimento.</p>
        <Campo rotulo="Descrição (opcional)"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} /></Campo>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-neutral-700">Quem realiza</legend>
          <div className="space-y-1 rounded-lg border p-2">
            {dados.profissionais.map((p) => (
              <label key={p.id} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={professionalIds.includes(p.id)}
                  onChange={() => setProfessionalIds((a) => (a.includes(p.id) ? a.filter((x) => x !== p.id) : [...a, p.id]))}
                />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>
        {erro && <Alerta>{erro}</Alerta>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
          <button type="submit" disabled={salvando} className={btnPrimary}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}
