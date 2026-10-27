import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { utcParaLocal } from "@/lib/datas";
import { erroHttp, exigirSessao } from "@/server/auth";
import { obterConfiguracoes } from "@/server/configuracoes";
import { lerCorpo } from "@/server/validators";

export const dynamic = "force-dynamic";

// Lista de clientes com total de visitas (atendimentos concluídos) e última visita
export async function GET(req: Request) {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const q = new URL(req.url).searchParams.get("q")?.trim();
    const config = await obterConfiguracoes();

    const clientes = await prisma.user.findMany({
      where: {
        role: "CLIENT",
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 200,
      include: { appointments: { select: { status: true, startsAt: true } } },
    });

    return NextResponse.json(
      clientes.map((c: any) => {
        const concluidos = c.appointments.filter((x: any) => x.status === "COMPLETED");
        const ultima = concluidos.map((x: any) => x.startsAt.getTime()).sort((x: number, y: number) => y - x)[0];
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          temLogin: !!c.passwordHash,
          visitas: concluidos.length,
          faltas: c.appointments.filter((x: any) => x.status === "NO_SHOW").length,
          ultimaVisita: ultima ? utcParaLocal(new Date(ultima), config.timezone).date : null,
        };
      })
    );
  } catch (e) {
    return erroHttp(e);
  }
}

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome."),
  phone: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(1000).optional(),
});

// Cadastro de cliente sem login (quem liga ou manda mensagem)
export async function POST(req: Request) {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const c = await lerCorpo(req, schema);
    if ("erro" in c) return c.erro;
    const u = await prisma.user.create({
      data: { name: c.dados.name, phone: c.dados.phone || null, notes: c.dados.notes || null, role: "CLIENT" },
    });
    return NextResponse.json({ id: u.id }, { status: 201 });
  } catch (e) {
    return erroHttp(e);
  }
}
