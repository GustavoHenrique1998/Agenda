"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Alerta, btnGhost, btnPrimary, Campo, inputCls, Modal } from "@/components/ui";

type Prof = { id: string; name: string; bio: string | null; active: boolean; serviceIds: string[] };
type Dados = { profissionais: Prof[]; servicos: { id: string; name: string }[] };

export default function ProfissionaisPage() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [editando, setEditando] = useState<Prof | "novo" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    api<Dados>("/api/admin/professionals").then(setDados).catch((e) => setErro(e.message));
  }, []);
  useEffect(carregar, [carregar]);

  async function alternarAtivo(p: Prof) {
    await api(`/api/admin/professionals/${p.id}`, { method: "PATCH", body: JSON.stringify({ active: !p.active }) }).catch((e) => setErro(e.message));
    carregar();
  }

  return (
    <main className="mx-auto max-w-3xl p-3 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profissionais</h1>
        <button onClick={() => setEditando("novo")} className={btnPrimary}>+ Nova profissional</button>
      </div>
      {erro && <Alerta>{erro}</Alerta>}
      {!dados && !erro && <p className="text-neutral-500">Carregando…</p>}
      <ul className="space-y-2">
        {dados?.profissionais.map((p) => (
          <li key={p.id} className={`flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3 ${p.active ? "" : "opacity-60"}`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 font-semibold text-rose-700">{p.name[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{p.name}{!p.active && <span className="ml-2 text-xs text-neutral-500">(inativa)</span>}</p>
              <p className="truncate text-sm text-neutral-500">
                {p.serviceIds.length} serviço(s) · ajuste os dias e horários em “Horários”
              </p>
            </div>
            <button onClick={() => setEditando(p)} className="text-sm font-medium text-rose-600">Editar</button>
            <button onClick={() => alternarAtivo(p)} className="text-sm text-neutral-500">{p.active ? "Inativar" : "Reativar"}</button>
          </li>
        ))}
      </ul>

      {editando && dados && (
        <Form
          servicos={dados.servicos}
          prof={editando === "novo" ? null : editando}
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

function Form({ prof, servicos, onClose, onSalvo }: { prof: Prof | null; servicos: Dados["servicos"]; onClose: () => void; onSalvo: () => void }) {
  const [name, setName] = useState(prof?.name ?? "");
  const [bio, setBio] = useState(prof?.bio ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>(prof?.serviceIds ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const corpo = JSON.stringify({ name, bio: bio || null, serviceIds });
      if (prof) await api(`/api/admin/professionals/${prof.id}`, { method: "PATCH", body: corpo });
      else await api("/api/admin/professionals", { method: "POST", body: corpo });
      onSalvo();
    } catch (err: any) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={prof ? "Editar profissional" : "Nova profissional"} onClose={onClose}>
      <form onSubmit={salvar} className="space-y-3">
        <Campo rotulo="Nome"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Campo>
        <Campo rotulo="Apresentação (opcional)"><input value={bio} onChange={(e) => setBio(e.target.value)} className={inputCls} /></Campo>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-neutral-700">Serviços que realiza</legend>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
            {servicos.map((s) => (
              <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={serviceIds.includes(s.id)}
                  onChange={() => setServiceIds((a) => (a.includes(s.id) ? a.filter((x) => x !== s.id) : [...a, s.id]))}
                />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
        {!prof && <p className="text-xs text-neutral-500">Ela começa com o mesmo expediente do salão. Depois ajuste em “Horários”.</p>}
        {erro && <Alerta>{erro}</Alerta>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
          <button type="submit" disabled={salvando} className={btnPrimary}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}
