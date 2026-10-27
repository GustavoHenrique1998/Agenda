// @ts-nocheck
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroHttp, exigirSessao } from "@/server/auth";
import { lerCorpo } from "@/server/validators";

const schema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  categoryId: z.string().min(1).optional(),
  priceCents: z.number().int().min(0).optional(),
  durationMin: z.number().int().min(5).max(720).optional(),
  bufferMin: z.number().int().min(0).max(240).optional(),
  active: z.boolean().optional(),
  professionalIds: z.array(z.string()).optional(),
});

// Editar / inativar. Agendamentos antigos guardam um "retrato" do preço e da duração,
// então alterar o serviço não muda o histórico.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const c = await lerCorpo(req, schema);
    if ("erro" in c) return c.erro;
    const { professionalIds, ...dados } = c.dados;

    await prisma.$transaction(async (tx: any) => {
      await tx.service.update({ where: { id: params.id }, data: dados });
      if (professionalIds) {
        await tx.professionalService.deleteMany({ where: { serviceId: params.id } });
        await tx.professionalService.createMany({
          data: professionalIds.map((professionalId: string) => ({ professionalId, serviceId: params.id })),
        });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as any)?.code === "P2025") return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    return erroHttp(e);
  }
}
