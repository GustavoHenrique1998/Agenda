import { NextResponse } from "next/server";
import { erroHttp, exigirSessao } from "@/server/auth";
import { cancelarAgendamento } from "@/server/agendamentos";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const a = await exigirSessao();
    if ("erro" in a) return a.erro;
    await cancelarAgendamento(params.id, a.usuario);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroHttp(e);
  }
}
