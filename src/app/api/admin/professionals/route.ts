// @ts-nocheck
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroHttp, exigirSessao } from "@/server/auth";
import { lerCorpo } from "@/server/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const [lista, servicos] = await Promise.all([
      prisma.professional.findMany({
        orderBy: [{ active: "desc" }, { name: "asc" }],
        include: { services: { select: { serviceId: true } } },
      }),
      prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
    return NextResponse.json({
      servicos,
      profissionais: lista.map((p: any) => ({
        id: p.id,
        name: p.name,
        bio: p.bio,
        active: p.active,
        serviceIds: p.services.map((s: any) => s.serviceId),
      })),
    });
  } catch (e) {
    return erroHttp(e);
  }
}

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome."),
  bio: z.string().trim().max(500).optional().nullable(),
  serviceIds: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const c = await lerCorpo(req, schema);
    if ("erro" in c) return c.erro;

    const salao = await prisma.workSchedule.findMany({ where: { professionalId: null } });
    const p = await prisma.professional.create({
      data: {
        name: c.dados.name,
        bio: c.dados.bio || null,
        services: { create: c.dados.serviceIds.map((serviceId: string) => ({ serviceId })) },
        // começa com o mesmo expediente do salão; o dono ajusta depois em "Horários"
        schedules: {
          create: salao.map((s: any) => ({
            weekday: s.weekday,
            isOpen: s.isOpen,
            startMin: s.startMin,
            endMin: s.endMin,
            breakStartMin: s.breakStartMin,
            breakEndMin: s.breakEndMin,
          })),
        },
      },
    });
    return NextResponse.json({ id: p.id }, { status: 201 });
  } catch (e) {
    return erroHttp(e);
  }
}
