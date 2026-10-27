// @ts-nocheck
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroHttp, exigirSessao } from "@/server/auth";
import { lerCorpo } from "@/server/validators";

const schema = z.object({
  name: z.string().trim().min(2).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  active: z.boolean().optional(),
  serviceIds: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const c = await lerCorpo(req, schema);
    if ("erro" in c) return c.erro;
    const { serviceIds, ...dados } = c.dados;

    await prisma.$transaction(async (tx: any) => {
      await tx.professional.update({ where: { id: params.id }, data: dados });
      if (serviceIds) {
        await tx.professionalService.deleteMany({ where: { professionalId: params.id } });
        await tx.professionalService.createMany({
          data: serviceIds.map((serviceId: string) => ({ professionalId: params.id, serviceId })),
        });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as any)?.code === "P2025") return NextResponse.json({ error: "Profissional não encontrado." }, { status: 404 });
    return erroHttp(e);
  }
}
