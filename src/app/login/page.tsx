"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Alerta, btnPrimary, Campo, inputCls } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const r = await signIn("credentials", { email, password: senha, redirect: false });
    if (!r || r.error) {
      setErro("E-mail ou senha incorretos.");
      setCarregando(false);
      return;
    }
    const sessao = await fetch("/api/auth/session").then((x) => x.json()).catch(() => null);
    const next = new URLSearchParams(window.location.search).get("next");
    const seguro = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    window.location.href = seguro ?? (sessao?.user?.role === "ADMIN" ? "/admin" : "/agendar");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <a href="/" className="text-sm text-neutral-500">← Início</a>
        <h1 className="mt-2 text-2xl font-semibold">Entrar</h1>
        <p className="text-neutral-600">Acesse para agendar e ver seus horários.</p>
      </div>
      <form onSubmit={entrar} className="space-y-4">
        <Campo rotulo="E-mail">
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </Campo>
        <Campo rotulo="Senha">
          <input type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={inputCls} />
        </Campo>
        {erro && <Alerta>{erro}</Alerta>}
        <button type="submit" disabled={carregando} className={`${btnPrimary} w-full`}>
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="text-center text-sm text-neutral-600">
        Ainda não tem conta?{" "}
        <a href="/cadastro" className="font-medium text-rose-600">
          Cadastre-se
        </a>
      </p>
    </main>
  );
}
