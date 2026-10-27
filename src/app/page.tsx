"use client";
import { useEffect, useState } from "react";
import { brl, duracao } from "@/lib/formatar";
import { btnGhost, btnPrimary } from "@/components/ui";

type Categoria = {
  id: string;
  name: string;
  services: { id: string; name: string; description?: string | null; priceCents: number; durationMin: number }[];
};

export default function Home() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [papel, setPapel] = useState<"CLIENT" | "ADMIN" | null>(null);

  useEffect(() => {
    fetch("/api/services").then((r) => r.json()).then(setCategorias).catch(() => {});
    fetch("/api/auth/session").then((r) => r.json()).then((s) => setPapel(s?.user?.role ?? null)).catch(() => {});
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <span className="text-lg font-semibold text-rose-600">Agendamento</span>
        <nav className="flex gap-2 text-sm">
          {papel === "ADMIN" && <a href="/admin" className={btnGhost}>Painel</a>}
          {papel ? (
            <a href="/meus-agendamentos" className={btnGhost}>Meus horários</a>
          ) : (
            <a href="/login" className={btnGhost}>Entrar</a>
          )}
        </nav>
      </header>

      <section className="rounded-2xl bg-gradient-to-br from-rose-600 to-rose-500 p-6 text-white sm:p-10">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Seu horário de beleza, sem complicação.</h1>
        <p className="mt-2 max-w-md text-rose-50">Escolha o serviço, a profissional e o melhor horário em poucos toques.</p>
        <a href="/agendar" className={`${btnPrimary} mt-5 inline-block !bg-white !text-rose-700 hover:!bg-rose-50`}>
          Agendar agora
        </a>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-semibold">Nossos serviços</h2>
        {categorias.length === 0 && <p className="text-neutral-500">Carregando…</p>}
        {categorias.map((c) => (
          <div key={c.id} className="mb-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">{c.name}</h3>
            <ul className="divide-y rounded-xl border bg-white">
              {c.services.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="text-sm text-neutral-500">{duracao(s.durationMin)}</p>
                  </div>
                  <p className="font-semibold">{brl(s.priceCents)}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
