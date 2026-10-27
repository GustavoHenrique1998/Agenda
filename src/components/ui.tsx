"use client";
import { useEffect } from "react";

export const inputCls =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500";
export const btnPrimary =
  "rounded-lg bg-rose-600 px-4 py-2.5 font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-neutral-300";
export const btnGhost =
  "rounded-lg border border-neutral-300 bg-white px-4 py-2.5 font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50";

export type Status = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export const STATUS_INFO: Record<Status, { label: string; cor: string }> = {
  PENDING: { label: "Pendente", cor: "bg-amber-100 border-amber-400 text-amber-900" },
  CONFIRMED: { label: "Confirmado", cor: "bg-sky-100 border-sky-400 text-sky-900" },
  COMPLETED: { label: "Concluído", cor: "bg-emerald-100 border-emerald-400 text-emerald-900" },
  CANCELLED: { label: "Cancelado", cor: "bg-neutral-100 border-neutral-300 text-neutral-500" },
  NO_SHOW: { label: "Falta", cor: "bg-red-100 border-red-400 text-red-900" },
};

export function StatusBadge({ status }: { status: Status }) {
  const info = STATUS_INFO[status];
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${info.cor}`}>{info.label}</span>;
}

export function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{rotulo}</span>
      {children}
    </label>
  );
}

export function Alerta({ tipo = "erro", children }: { tipo?: "erro" | "ok" | "aviso"; children: React.ReactNode }) {
  const cor =
    tipo === "erro" ? "bg-red-50 text-red-700" : tipo === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800";
  return (
    <p role={tipo === "erro" ? "alert" : "status"} className={`rounded-lg p-3 text-sm ${cor}`}>
      {children}
    </p>
  );
}

/** Janela modal (vira "bottom sheet" no celular). */
export function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button onClick={onClose} aria-label="Fechar" className="-mr-1 p-1 text-2xl leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
