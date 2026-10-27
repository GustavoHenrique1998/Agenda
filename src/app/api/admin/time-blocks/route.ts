import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { localStringParaUtc, utcParaLocal } from "@/lib/datas";
import { ErroNegocio, erroHttp, exigirSessao } from "@/server/auth";
import { obterConfiguracoes } from "@/server/configuracoes";
import { lerCorpo } from "@/server/validators";

export const dynamic = "force-dynamic";

// Bloqueios futuros (folgas, férias, manutenção, feriados)
export async function GET() {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const config = await obterConfiguracoes();
    const lista = await prisma.timeBlock.findMany({
      where: { endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      include: { professional: { select: { name: true } } },
    });
    return NextResponse.json(
      lista.map((b: any) => {
        const ini = utcParaLocal(b.startsAt, config.timezone);
        const fim = utcParaLocal(b.endsAt, config.timezone);
        return {
          id: b.id,
          professionalId: b.professionalId,
          professionalName: b.professional?.name ?? "Salão inteiro",
          startDate: ini.date,
          startTime: ini.time,
          endDate: fim.date,
          endTime: fim.time,
          reason: b.reason,
        };
      })
    );
  } catch (e) {
    return erroHttp(e);
  }
}

const LOCAL = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;
const schema = z.object({
  professionalId: z.string().nullable(), // null = salão inteiro
  start: z.string().regex(LOCAL, "Início inválido"), // "2026-10-26T09:00" (relógio do salão)
  end: z.string().regex(LOCAL, "Fim inválido"),
  reason: z.string().trim().max(200).optional(),
});

export async function POST(req: Request) {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const c = await lerCorpo(req, schema);
    if ("erro" in c) return c.erro;

    const config = await obterConfiguracoes();
    const startsAt = localStringParaUtc(c.dados.start, config.timezone);
    const endsAt = localStringParaUtc(c.dados.end, config.timezone);
    if (endsAt <= startsAt) throw new ErroNegocio("O fim deve ser depois do início.");

    const bloco = await prisma.timeBlock.create({
      data: { professionalId: c.dados.professionalId, startsAt, endsAt, reason: c.dados.reason || null },
    });

    // Avisa se já existem agendamentos nesse período (o bloqueio não os cancela)
    const conflitos = await prisma.appointment.count({
      where: {
        ...(c.dados.professionalId ? { professionalId: c.dados.professionalId } : {}),
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    return NextResponse.json({ id: bloco.id, conflitos }, { status: 201 });
  } catch (e) {
    return erroHttp(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ErroNegocio("Informe o bloqueio.");
    await prisma.timeBlock.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroHttp(e);
  }
}
