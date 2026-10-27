// @ts-nocheck
// Criar, cancelar e mudar status de agendamentos.
// Double-booking: o algoritmo só oferece horários livres, a criação revalida,
// e a exclusion constraint do PostgreSQL (appointment_no_overlap) recusa qualquer
// sobreposição que escape (ex.: duas pessoas confirmando o mesmo horário ao mesmo tempo).

import { prisma } from "@/lib/prisma";
import { zonedParaUtc, hhmmParaMinutos } from "@/lib/datas";
import { obterConfiguracoes } from "./configuracoes";
import { ErroNegocio, type UsuarioSessao } from "./auth";
import {
  horariosDisponiveis,
  horariosQualquerProfissional,
  resolverServicos,
  validarProfissional,
} from "./disponibilidade";

export class HorarioIndisponivelError extends ErroNegocio {
  constructor(msg = "Esse horário não está mais disponível. Escolha outro.") {
    super(msg, 409);
  }
}

function ehConflitoDeHorario(e: unknown): boolean {
  const msg = String((e as any)?.message ?? "");
  return msg.includes("appointment_no_overlap") || msg.includes("23P01") || (e as any)?.meta?.code === "23P01";
}

export async function criarAgendamento(input: {
  clientId: string;
  serviceIds: string[];
  professionalId: string | "ANY";
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  source?: "ONLINE" | "ADMIN";
  notes?: string;
}) {
  const config = await obterConfiguracoes();
  const origem = input.source ?? "ONLINE";
  const ignorarAntecedencia = origem === "ADMIN";
  const opcoes = { ignorarAntecedencia };

  const { servicos, duracaoTotalMin, totalCents } = await resolverServicos(input.serviceIds);

  // Candidatos: o profissional escolhido ou todos que estão livres naquele horário
  let candidatos: string[];
  if (input.professionalId === "ANY") {
    const { horarios } = await horariosQualquerProfissional(input.serviceIds, input.date, opcoes);
    candidatos = horarios[input.time] ?? [];
  } else {
    await validarProfissional(input.professionalId, input.serviceIds);
    const livres = await horariosDisponiveis({
      professionalId: input.professionalId,
      date: input.date,
      duracaoTotalMin,
      opcoes,
    });
    candidatos = livres.includes(input.time) ? [input.professionalId] : [];
  }
  if (candidatos.length === 0) throw new HorarioIndisponivelError();

  const startsAt = zonedParaUtc(input.date, hhmmParaMinutos(input.time), config.timezone);
  const endsAt = new Date(startsAt.getTime() + duracaoTotalMin * 60000);

  // Tenta cada candidato; a constraint resolve corridas entre requisições simultâneas.
  for (const professionalId of candidatos) {
    try {
      return await prisma.appointment.create({
        data: {
          clientId: input.clientId,
          professionalId,
          startsAt,
          endsAt,
          status: origem === "ADMIN" ? "CONFIRMED" : "PENDING",
          source: origem,
          totalCents,
          notes: input.notes,
          services: {
            create: servicos.map((s, i) => ({
              serviceId: s.id,
              name: s.name,
              priceCents: s.priceCents,
              durationMin: s.durationMin,
              bufferMin: s.bufferMin,
              position: i,
            })),
          },
        },
        include: { services: true, professional: true },
      });
    } catch (e) {
      if (!ehConflitoDeHorario(e)) throw e;
      // outra requisição pegou esse profissional/horário primeiro → tenta o próximo
    }
  }
  throw new HorarioIndisponivelError("Esse horário acabou de ser ocupado. Escolha outro.");
}

/** O cliente só pode cancelar com a antecedência mínima definida nas configurações. */
export async function cancelarAgendamento(id: string, usuario: UsuarioSessao) {
  const config = await obterConfiguracoes();
  const ag = await prisma.appointment.findUnique({ where: { id } });

  if (!ag || (usuario.role !== "ADMIN" && ag.clientId !== usuario.id)) {
    throw new ErroNegocio("Agendamento não encontrado.", 404);
  }
  if (ag.status !== "PENDING" && ag.status !== "CONFIRMED") {
    throw new ErroNegocio("Este agendamento não pode mais ser cancelado.");
  }
  if (usuario.role !== "ADMIN") {
    const limite = ag.startsAt.getTime() - config.cancelMinHours * 3600_000;
    if (Date.now() > limite) {
      throw new ErroNegocio(
        `Cancelamentos online só são aceitos com pelo menos ${config.cancelMinHours}h de antecedência. Entre em contato com o salão.`,
        422
      );
    }
  }
  return prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
}

export function podeCancelar(
  ag: { status: string; startsAt: Date },
  cancelMinHours: number,
  agora = Date.now()
) {
  return (
    (ag.status === "PENDING" || ag.status === "CONFIRMED") &&
    agora <= ag.startsAt.getTime() - cancelMinHours * 3600_000
  );
}

/** Admin muda o status. Reativar um cancelado pode bater em outro agendamento → 409. */
export async function alterarStatus(
  id: string,
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
) {
  try {
    return await prisma.appointment.update({
      where: { id },
      data: { status, cancelledAt: status === "CANCELLED" ? new Date() : null },
    });
  } catch (e) {
    if (ehConflitoDeHorario(e)) {
      throw new HorarioIndisponivelError("Não é possível reativar: o horário já foi ocupado por outro agendamento.");
    }
    if ((e as any)?.code === "P2025") throw new ErroNegocio("Agendamento não encontrado.", 404);
    throw e;
  }
}
