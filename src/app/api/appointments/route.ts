// @ts-nocheck
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { utcParaLocal } from "@/lib/datas";
import { erroHttp, exigirSessao } from "@/server/auth";
import { obterConfiguracoes } from "@/server/configuracoes";
import { criarAgendamento, podeCancelar } from "@/server/agendamentos";
import { dataSchema, horaSchema, lerCorpo } from "@/server/validators";

export const dynamic = "force-dynamic";

// Meus agendamentos: próximos e histórico
export async function GET() {
  try {
    const a = await exigirSessao();
    if ("erro" in a) return a.erro;

    const config = await obterConfiguracoes();
    const lista = await prisma.appointment.findMany({
      where: { clientId: a.usuario.id },
      orderBy: { startsAt: "asc" },
      include: { professional: { select: { name: true } }, services: { orderBy: { position: "asc" } } },
    });

    const agora = Date.now();
    const formatar = (ag: (typeof lista)[number]) => {
      const ini = utcParaLocal(ag.startsAt, config.timezone);
      const fim = utcParaLocal(ag.endsAt, config.timezone);
      return {
        id: ag.id,
        status: ag.status,
        date: ini.date,
        time: ini.time,
        endTime: fim.time,
        professionalName: ag.professional.name,
        servicos: ag.services.map((s: any) => ({ name: s.name, priceCents: s.priceCents })),
        totalCents: ag.totalCents,
        podeCancelar: podeCancelar(ag, config.cancelMinHours, agora),
      };
    };

    const ativos = (s: string) => s === "PENDING" || s === "CONFIRMED";
    const proximos = lista.filter((x: any) => ativos(x.status) && x.endsAt.getTime() >= agora).map(formatar);
    const historico = lista
      .filter((x: any) => !(ativos(x.status) && x.endsAt.getTime() >= agora))
      .reverse()
      .map(formatar);

    return NextResponse.json({ proximos, historico, cancelMinHours: config.cancelMinHours });
  } catch (e) {
    return erroHttp(e);
  }
}

const schema = z.object({
  serviceIds: z.array(z.string()).min(1, "Escolha ao menos um serviço."),
  professionalId: z.string().min(1), // id ou "ANY"
  date: dataSchema,
  time: horaSchema,
});

// Criar agendamento (cliente logado)
export async function POST(req: Request) {
  try {
    const a = await exigirSessao();
    if ("erro" in a) return a.erro;

    const c = await lerCorpo(req, schema);
    if ("erro" in c) return c.erro;

    const ag = await criarAgendamento({
      clientId: a.usuario.id,
      serviceIds: c.dados.serviceIds,
      professionalId: c.dados.professionalId,
      date: c.dados.date,
      time: c.dados.time,
      source: "ONLINE",
    });
    return NextResponse.json({ id: ag.id, professionalName: ag.professional.name }, { status: 201 });
  } catch (e) {
    return erroHttp(e);
  }
}
