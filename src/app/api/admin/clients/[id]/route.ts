import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { utcParaLocal } from "@/lib/datas";
import { ErroNegocio, erroHttp, exigirSessao } from "@/server/auth";
import { obterConfiguracoes } from "@/server/configuracoes";
import { lerCorpo } from "@/server/validators";

export const dynamic = "force-dynamic";

// Ficha do cliente + histórico de visitas
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const config = await obterConfiguracoes();

    const c = await prisma.user.findFirst({
      where: { id: params.id, role: "CLIENT" },
      include: {
        appointments: {
          orderBy: { startsAt: "desc" },
          include: { professional: { select: { name: true } }, services: { orderBy: { position: "asc" } } },
        },
      },
    });
    if (!c) throw new ErroNegocio("Cliente não encontrado.", 404);

    return NextResponse.json({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      notes: c.notes,
      historico: c.appointments.map((x: any) => {
        const ini = utcParaLocal(x.startsAt, config.timezone);
        return {
          id: x.id,
          date: ini.date,
          time: ini.time,
          status: x.status,
          professionalName: x.professional.name,
          servicos: x.services.map((s: any) => s.name),
          totalCents: x.totalCents,
        };
      }),
    });
  } catch (e) {
    return erroHttp(e);
  }
}

const schema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const c = await lerCorpo(req, schema);
    if ("erro" in c) return c.erro;
    await prisma.user.updateMany({ where: { id: params.id, role: "CLIENT" }, data: c.dados });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroHttp(e);
  }
}
