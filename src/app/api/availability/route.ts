import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, erroHttp } from "@/server/auth";
import {
  horariosDisponiveis,
  horariosQualquerProfissional,
  resolverServicos,
  validarProfissional,
} from "@/server/disponibilidade";
import { dataSchema, lerQuery } from "@/server/validators";

export const dynamic = "force-dynamic";

const schema = z.object({
  serviceIds: z.string().min(1, "Escolha ao menos um serviço."), // "id1,id2"
  professionalId: z.string().default("ANY"),
  date: dataSchema,
  admin: z.string().optional(), // "1" → só vale para administrador logado
});

// Horários REAIS livres para o dia (considera expediente, almoço, bloqueios,
// agendamentos existentes e a duração somada dos serviços).
export async function GET(req: Request) {
  try {
    const q = lerQuery(req.url, schema);
    if ("erro" in q) return q.erro;
    const { serviceIds: csv, professionalId, date, admin } = q.dados;
    const serviceIds = csv.split(",").filter(Boolean);

    let ignorarAntecedencia = false;
    if (admin === "1") {
      const sessao = await getServerSession(authOptions);
      ignorarAntecedencia = (sessao?.user as any)?.role === "ADMIN";
    }
    const opcoes = { ignorarAntecedencia };

    if (professionalId === "ANY") {
      const r = await horariosQualquerProfissional(serviceIds, date, opcoes);
      return NextResponse.json({ horarios: Object.keys(r.horarios) });
    }

    const { duracaoTotalMin } = await resolverServicos(serviceIds);
    await validarProfissional(professionalId, serviceIds);
    const horarios = await horariosDisponiveis({ professionalId, date, duracaoTotalMin, opcoes });
    return NextResponse.json({ horarios });
  } catch (e) {
    return erroHttp(e);
  }
}
