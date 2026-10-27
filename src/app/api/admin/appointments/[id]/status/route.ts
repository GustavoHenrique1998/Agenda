import { NextResponse } from "next/server";
import { z } from "zod";
import { erroHttp, exigirSessao } from "@/server/auth";
import { alterarStatus } from "@/server/agendamentos";
import { lerCorpo, statusSchema } from "@/server/validators";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const c = await lerCorpo(req, z.object({ status: statusSchema }));
    if ("erro" in c) return c.erro;
    const ag = await alterarStatus(params.id, c.dados.status);
    return NextResponse.json({ id: ag.id, status: ag.status });
  } catch (e) {
    return erroHttp(e);
  }
}
