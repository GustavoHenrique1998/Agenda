"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { dataBR } from "@/lib/formatar";
import { Alerta, btnPrimary, Campo, inputCls } from "@/components/ui";

type Bloco = {
  id: string;
  professionalName: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string | null;
};
type Prof = { id: string; name: string };

const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function BloqueiosPage() {
  const [lista, setLista] = useState<Bloco[] | null>(null);
  const [profs, setProfs] = useState<Prof[]>([]);
  const [quem, setQuem] = useState("SALAO");
  const [diaInteiro, setDiaInteiro] = useState(true);
  const [de, setDe] = useState(hoje());
  const [ate, setAte] = useState(hoje());
  const [horaDe, setHoraDe] = useState("09:00");
  const [horaAte, setHoraAte] = useState("12:00");
  const [motivo, setMotivo] = useState("");
  const [msg, setMsg] = useState<{ tipo: "erro" | "ok" | "aviso"; texto: string } | null>(null);

  const carregar = useCallback(() => {
    api<Bloco[]>("/api/admin/time-blocks").then(setLista).catch((e) => setMsg({ tipo: "erro", texto: e.message }));
  }, []);
  useEffect(() => {
    carregar();
    api<Prof[]>("/api/professionals").then(setProfs).catch(() => {});
  }, [carregar]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    // dia inteiro: 00:00 do primeiro dia até 00:00 do dia seguinte ao último
    const inicio = `${de}T${diaInteiro ? "00:00" : horaDe}`;
    let fim = `${ate}T${diaInteiro ? "23:59" : horaAte}`;
    if (diaInteiro) fim = `${ate}T23:59`;
    try {
      const r = await api<{ conflitos: number }>("/api/admin/time-blocks", {
        method: "POST",
        body: JSON.stringify({ professionalId: quem === "SALAO" ? null : quem, start: inicio, end: fim, reason: motivo || undefined }),
      });
      setMsg(
        r.conflitos > 0
          ? { tipo: "aviso", texto: `Bloqueio criado, mas existem ${r.conflitos} agendamento(s) nesse período. Eles NÃO foram cancelados — confira a agenda.` }
          : { tipo: "ok", texto: "Bloqueio criado." }
      );
      setMotivo("");
      carregar();
    } catch (err: any) {
      setMsg({ tipo: "erro", texto: err.message });
    }
  }

  async function remover(id: string) {
    if (!confirm("Remover este bloqueio?")) return;
    await api(`/api/admin/time-blocks?id=${id}`, { method: "DELETE" }).catch((e) => setMsg({ tipo: "erro", texto: e.message }));
    carregar();
  }

  return (
    <main className="mx-auto max-w-3xl p-3 sm:p-6">
      <h1 className="mb-1 text-2xl font-semibold">Bloqueios</h1>
      <p className="mb-4 text-sm text-neutral-600">Folgas, férias, feriados e manutenção. Nesses períodos ninguém consegue agendar.</p>

      <form onSubmit={criar} className="mb-6 space-y-3 rounded-xl border bg-white p-4">
        <Campo rotulo="Quem fica indisponível">
          <select value={quem} onChange={(e) => setQuem(e.target.value)} className={inputCls}>
            <option value="SALAO">Salão inteiro (feriado, manutenção)</option>
            {profs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Campo>
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo="De"><input type="date" value={de} onChange={(e) => { setDe(e.target.value); if (e.target.value > ate) setAte(e.target.value); }} className={inputCls} /></Campo>
          <Campo rotulo="Até"><input type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} className={inputCls} /></Campo>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={diaInteiro} onChange={(e) => setDiaInteiro(e.target.checked)} className="h-5 w-5" />
          Dia(s) inteiro(s)
        </label>
        {!diaInteiro && (
          <div className="grid grid-cols-2 gap-2">
            <Campo rotulo="Das"><input type="time" value={horaDe} onChange={(e) => setHoraDe(e.target.value)} className={inputCls} /></Campo>
            <Campo rotulo="Às"><input type="time" value={horaAte} onChange={(e) => setHoraAte(e.target.value)} className={inputCls} /></Campo>
          </div>
        )}
        <Campo rotulo="Motivo (opcional)"><input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Férias, feriado, curso…" className={inputCls} /></Campo>
        {msg && <Alerta tipo={msg.tipo}>{msg.texto}</Alerta>}
        <button type="submit" className={btnPrimary}>Criar bloqueio</button>
      </form>

      <h2 className="mb-2 font-semibold">Próximos bloqueios</h2>
      {!lista && <p className="text-neutral-500">Carregando…</p>}
      {lista && lista.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-neutral-500">Nenhum bloqueio futuro.</p>}
      <ul className="space-y-2">
        {lista?.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3">
            <div className="min-w-0">
              <p className="font-medium">{b.professionalName}</p>
              <p className="text-sm text-neutral-600">
                {dataBR(b.startDate)} {b.startTime} → {dataBR(b.endDate)} {b.endTime}
              </p>
              {b.reason && <p className="text-sm text-neutral-500">{b.reason}</p>}
            </div>
            <button onClick={() => remover(b.id)} className="text-sm font-medium text-red-600">Remover</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
