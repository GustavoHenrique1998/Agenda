import { prisma } from "@/lib/prisma";

export const CONFIG_PADRAO = {
  id: 1,
  timezone: "America/Sao_Paulo",
  slotStepMin: 30,
  minAdvanceMin: 120,
  maxAdvanceDays: 60,
  cancelMinHours: 24,
};

export async function obterConfiguracoes() {
  return (await prisma.settings.findUnique({ where: { id: 1 } })) ?? CONFIG_PADRAO;
}
