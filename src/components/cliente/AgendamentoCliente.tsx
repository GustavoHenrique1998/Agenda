// @ts-nocheck
"use client";
// src/components/cliente/AgendamentoCliente.tsx
// Passo 4 — Fluxo de agendamento do cliente (mobile-first, Tailwind)

import { useEffect, useMemo, useState } from "react";

type Servico = { id: string; name: string; priceCents: number; durationMin: number };
type Categoria = { id: string; name: string; services: Servico[] };
type Profissional = { id: string; name: string; photoUrl?: string | null };

const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const duracao = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`;

function proximosDias(qtd = 21) {
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      iso,
      dia: d.getDate(),
      semana: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      completo: d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }),
    };
  });
}

const PASSOS = ["Serviços", "Profissional", "Data e hora", "Confirmar"];

export default function AgendamentoCliente() {
  const [passo, setPasso] = useState(0);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [profissionalId, setProfissionalId] = useState<string>("ANY");
  const [data, setData] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

  const dias = useMemo(() => proximosDias(), []);
  const todosServicos = useMemo(() => categorias.flatMap((c) => c.services), [categorias]);
  const escolhidos = todosServicos.filter((s) => selecionados.includes(s.id));
  const total = escolhidos.reduce((s, x) => s + x.priceCents, 0);
  const minutos = escolhidos.reduce((s, x) => s + x.durationMin, 0);

  useEffect(() => {
    fetch("/api/services").then((r) => r.json()).then(setCategorias);
  }, []);

  // profissionais que executam TODOS os serviços escolhidos
  useEffect(() => {
    if (!selecionados.length) return;
    fetch(`/api/professionals?serviceIds=${selecionados.join(",")}`)
      .then((r) => r.json())
      .then(setProfissionais);
    setProfissionalId("ANY");
    setData(null);
    setHora(null);
  }, [selecionados]);

  // horários reais calculados pelo servidor
  useEffect(() => {
    if (passo !== 2 || !data) return;
    setCarregandoHorarios(true);
    setHora(null);
    fetch(
      `/api/availability?serviceIds=${selecionados.join(",")}&professionalId=${professionalId}&date=${data}`
    )
      .then((r) => r.json())
      .then((r) => setHorarios(r.horarios ?? []))
      .finally(() => setCarregandoHorarios(false));
  }, [passo, data, profissionalId, selecionados]);

  const alternar = (id: string) =>
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const podeAvancar =
    (passo === 0 && selecionados.length > 0) ||
    (passo === 1 && profissionais.length > 0) ||
    (passo === 2 && !!data && !!hora) ||
    passo === 3;

  async function confirmar() {
    setEnviando(true);
    setErro(null);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceIds: selecionados, professionalId, date: data, time: hora }),
    });
    setEnviando(false);
    if (res.ok) return setConcluido(true);
    if (res.status === 401) return (window.location.href = "/login?next=/agendar");
    const body = await res.json().catch(() => ({}));
    setErro(body.error ?? "Não foi possível agendar.");
    if (res.status === 409) setPasso(2); // horário foi ocupado: volta para escolher outro
  }

  if (concluido) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✓</div>
        <h1 className="text-2xl font-semibold">Agendamento realizado!</h1>
        <p className="text-neutral-600">
          {data && dias.find((d) => d.iso === data)?.completo} às {hora}
        </p>
        <a href="/meus-agendamentos" className="mt-2 w-full rounded-xl bg-rose-600 py-3 font-medium text-white">
          Ver meus agendamentos
        </a>
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-white">
      {/* Cabeçalho + progresso */}
      <header className="sticky top-0 z-10 border-b bg-white/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          {passo > 0 && (
            <button onClick={() => setPasso(passo - 1)} aria-label="Voltar" className="-ml-2 p-2 text-xl">
              ←
            </button>
          )}
          <h1 className="text-lg font-semibold">{PASSOS[passo]}</h1>
          <span className="ml-auto text-sm text-neutral-500">
            {passo + 1}/{PASSOS.length}
          </span>
        </div>
        <div className="flex gap-1.5">
          {PASSOS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= passo ? "bg-rose-600" : "bg-neutral-200"}`} />
          ))}
        </div>
      </header>

      {/* Conteúdo (padding inferior para não ficar atrás da barra fixa) */}
      <main className="flex-1 px-4 pb-40 pt-4">
        {/* 1. SERVIÇOS */}
        {passo === 0 &&
          categorias.map((cat) => (
            <section key={cat.id} className="mb-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">{cat.name}</h2>
              <ul className="space-y-2">
                {cat.services.map((s) => {
                  const ativo = selecionados.includes(s.id);
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => alternar(s.id)}
                        aria-pressed={ativo}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                          ativo ? "border-rose-600 bg-rose-50 ring-1 ring-rose-600" : "border-neutral-200 active:bg-neutral-50"
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm ${
                            ativo ? "border-rose-600 bg-rose-600 text-white" : "border-neutral-300"
                          }`}
                        >
                          {ativo && "✓"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{s.name}</span>
                          <span className="text-sm text-neutral-500">{duracao(s.durationMin)}</span>
                        </span>
                        <span className="font-semibold">{brl(s.priceCents)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

        {/* 2. PROFISSIONAL */}
        {passo === 1 && profissionais.length === 0 && (
          <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Nenhum profissional realiza todos esses serviços juntos. Volte e escolha serviços de uma mesma área,
            ou faça agendamentos separados.
          </p>
        )}
        {passo === 1 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[{ id: "ANY", name: "Qualquer profissional" } as Profissional, ...profissionais].map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setProfissionalId(p.id)}
                  aria-pressed={profissionalId === p.id}
                  className={`flex h-full w-full flex-col items-center gap-2 rounded-xl border p-4 text-center transition ${
                    profissionalId === p.id ? "border-rose-600 bg-rose-50 ring-1 ring-rose-600" : "border-neutral-200"
                  }`}
                >
                  <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-2xl">
                    {p.photoUrl ? <img src={p.photoUrl} alt="" className="h-full w-full object-cover" /> : p.id === "ANY" ? "✨" : p.name[0]}
                  </span>
                  <span className="text-sm font-medium leading-tight">{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* 3. DATA E HORA */}
        {passo === 2 && (
          <>
            <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2">
              {dias.map((d) => (
                <button
                  key={d.iso}
                  onClick={() => setData(d.iso)}
                  className={`flex w-16 shrink-0 snap-start flex-col items-center rounded-xl border py-2 ${
                    data === d.iso ? "border-rose-600 bg-rose-600 text-white" : "border-neutral-200"
                  }`}
                >
                  <span className="text-xs uppercase">{d.semana}</span>
                  <span className="text-xl font-semibold">{d.dia}</span>
                  <span className="text-xs uppercase opacity-70">{d.mes}</span>
                </button>
              ))}
            </div>

            <div className="mt-5">
              {!data && <p className="text-neutral-500">Escolha um dia para ver os horários.</p>}
              {data && carregandoHorarios && <p className="text-neutral-500">Buscando horários…</p>}
              {data && !carregandoHorarios && horarios.length === 0 && (
                <p className="rounded-xl bg-neutral-50 p-4 text-neutral-600">
                  Sem horários livres neste dia. Tente outra data{profissionalId !== "ANY" && " ou outro profissional"}.
                </p>
              )}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {horarios.map((h) => (
                  <button
                    key={h}
                    onClick={() => setHora(h)}
                    className={`rounded-lg border py-3 font-medium ${
                      hora === h ? "border-rose-600 bg-rose-600 text-white" : "border-neutral-200 active:bg-neutral-50"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 4. RESUMO */}
        {passo === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-neutral-500">Quando</p>
              <p className="font-medium capitalize">{data && dias.find((d) => d.iso === data)?.completo}</p>
              <p className="font-medium">às {hora}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-neutral-500">Profissional</p>
              <p className="font-medium">
                {profissionalId === "ANY" ? "Qualquer profissional disponível" : profissionais.find((p) => p.id === profissionalId)?.name}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="mb-2 text-sm text-neutral-500">Serviços</p>
              <ul className="space-y-1">
                {escolhidos.map((s) => (
                  <li key={s.id} className="flex justify-between">
                    <span>{s.name}</span>
                    <span>{brl(s.priceCents)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t pt-3 font-semibold">
                <span>Total ({duracao(minutos)})</span>
                <span>{brl(total)}</span>
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              Cancelamentos devem ser feitos com antecedência mínima definida pelo salão.
            </p>
            {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
          </div>
        )}
        {passo !== 3 && erro && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
      </main>

      {/* Barra fixa inferior (polegar-friendly) */}
      <footer className="fixed inset-x-0 bottom-0 z-20 border-t bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <div className="min-w-0 flex-1 text-sm">
            {selecionados.length > 0 ? (
              <>
                <p className="font-semibold">{brl(total)}</p>
                <p className="truncate text-neutral-500">
                  {selecionados.length} serviço{selecionados.length > 1 && "s"} · {duracao(minutos)}
                </p>
              </>
            ) : (
              <p className="text-neutral-500">Selecione ao menos um serviço</p>
            )}
          </div>
          <button
            disabled={!podeAvancar || enviando}
            onClick={() => (passo === 3 ? confirmar() : setPasso(passo + 1))}
            className="rounded-xl bg-rose-600 px-6 py-3 font-medium text-white transition disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {passo === 3 ? (enviando ? "Agendando…" : "Confirmar") : "Continuar"}
          </button>
        </div>
      </footer>
    </div>
  );
}

