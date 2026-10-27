import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroHttp, exigirSessao } from "@/server/auth";
import { lerCorpo } from "@/server/validators";

export const dynamic = "force-dynamic";

// Todos os serviços (inclusive inativos), categorias e profissionais, para a tela de gestão
export async function GET() {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const [categorias, servicos, profissionais] = await Promise.all([
      prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      prisma.service.findMany({
        orderBy: [{ active: "desc" }, { name: "asc" }],
        include: { professionals: { select: { professionalId: true } } },
      }),
      prisma.professional.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
    return NextResponse.json({
      categorias,
      profissionais,
      servicos: servicos.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        priceCents: s.priceCents,
        durationMin: s.durationMin,
        bufferMin: s.bufferMin,
        active: s.active,
        categoryId: s.categoryId,
        professionalIds: s.professionals.map((p: any) => p.professionalId),
      })),
    });
  } catch (e) {
    return erroHttp(e);
  }
}

const servicoSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do serviço."),
  description: z.string().trim().max(500).optional().nullable(),
  categoryId: z.string().min(1, "Escolha a categoria."),
  priceCents: z.number().int().min(0, "Preço inválido."),
  durationMin: z.number().int().min(5, "A duração mínima é 5 minutos.").max(720),
  bufferMin: z.number().int().min(0).max(240).default(0),
  active: z.boolean().default(true),
  professionalIds: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const c = await lerCorpo(req, servicoSchema);
    if ("erro" in c) return c.erro;
    const { professionalIds, ...dados } = c.dados;

    const servico = await prisma.service.create({
      data: {
        ...dados,
        description: dados.description || null,
        professionals: { create: professionalIds.map((professionalId) => ({ professionalId })) },
      },
    });
    return NextResponse.json({ id: servico.id }, { status: 201 });
  } catch (e) {
    return erroHttp(e);
  }
}
