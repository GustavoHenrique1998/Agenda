"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Alerta, btnPrimary, Campo, inputCls } from "@/components/ui";

export default function CadastroPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const corpo = await res.json().catch(() => ({}));
      setErro(corpo.error ?? "Não foi possível cadastrar.");
      setCarregando(false);
      return;
    }
    const r = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    if (!r || r.error) {
      window.location.href = "/login";
      return;
    }
    window.location.href = "/agendar";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <a href="/" className="text-sm text-neutral-500">← Início</a>
        <h1 className="mt-2 text-2xl font-semibold">Criar conta</h1>
        <p className="text-neutral-600">Leva menos de um minuto.</p>
      </div>
      <form onSubmit={cadastrar} className="space-y-4">
        <Campo rotulo="Nome">
          <input required minLength={2} autoComplete="name" value={form.name} onChange={set("name")} className={inputCls} />
        </Campo>
        <Campo rotulo="E-mail">
          <input type="email" required autoComplete="email" value={form.email} onChange={set("email")} className={inputCls} />
        </Campo>
        <Campo rotulo="Celular / WhatsApp">
          <input type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} className={inputCls} placeholder="(11) 99999-9999" />
        </Campo>
        <Campo rotulo="Senha (mínimo 8 caracteres)">
          <input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} className={inputCls} />
        </Campo>
        {erro && <Alerta>{erro}</Alerta>}
        <button type="submit" disabled={carregando} className={`${btnPrimary} w-full`}>
          {carregando ? "Criando…" : "Criar conta"}
        </button>
      </form>
      <p className="text-center text-sm text-neutral-600">
        Já tem conta?{" "}
        <a href="/login" className="font-medium text-rose-600">
          Entrar
        </a>
      </p>
    </main>
  );
}
