// Dados iniciais: configurações, dono do salão, categorias, serviços, profissionais e horários.
// Rodar:  npm run db:seed   (idempotente: pode rodar mais de uma vez)

import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// O Node não carrega o .env sozinho (o Prisma carrega só as variáveis dele).
// Lemos o arquivo aqui para que ADMIN_EMAIL e ADMIN_PASSWORD sejam respeitados.
if (existsSync(".env")) {
  for (const linha of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || linha.trim().startsWith("#")) continue;
    let valor = m[2];
    if (/^(".*"|'.*')$/.test(valor)) valor = valor.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = valor;
  }
}

const prisma = new PrismaClient();

const min = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

async function main() {
  // Configurações (linha única)
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  // Dono do salão
  const email = (process.env.ADMIN_EMAIL ?? "dono@salao.com").toLowerCase();
  const senha = process.env.ADMIN_PASSWORD ?? "trocar-esta-senha";
  const passwordHash = await bcrypt.hash(senha, 10);
  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: { name: "Dono(a) do Salão", email, passwordHash, role: "ADMIN" },
  });

  // Categorias
  const nomes = ["Cabelo", "Maquiagem", "Unhas", "Estética"];
  const cat: Record<string, string> = {};
  for (const [i, name] of nomes.entries()) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name, sortOrder: i } });
    cat[name] = c.id;
  }

  // Serviços (só cria se o catálogo ainda estiver vazio)
  if ((await prisma.service.count()) === 0) {
    const servicos: Array<{ name: string; c: string; price: number; dur: number }> = [
      { name: "Corte feminino", c: "Cabelo", price: 8000, dur: 60 },
      { name: "Escova", c: "Cabelo", price: 6000, dur: 45 },
      { name: "Coloração", c: "Cabelo", price: 18000, dur: 120 },
      { name: "Hidratação", c: "Cabelo", price: 9000, dur: 60 },
      { name: "Maquiagem social", c: "Maquiagem", price: 15000, dur: 60 },
      { name: "Maquiagem para noivas", c: "Maquiagem", price: 45000, dur: 120 },
      { name: "Manicure", c: "Unhas", price: 3500, dur: 45 },
      { name: "Pedicure", c: "Unhas", price: 4000, dur: 45 },
      { name: "Unhas em gel", c: "Unhas", price: 12000, dur: 90 },
      { name: "Limpeza de pele", c: "Estética", price: 14000, dur: 60 },
      { name: "Design de sobrancelhas", c: "Estética", price: 4500, dur: 30 },
    ];
    for (const s of servicos) {
      await prisma.service.create({
        data: { name: s.name, categoryId: cat[s.c], priceCents: s.price, durationMin: s.dur, bufferMin: 0 },
      });
    }
  }

  // Expediente do salão: terça a sábado 09:00–19:00 (segunda e domingo fechados)
  await prisma.workSchedule.deleteMany({ where: { professionalId: null } });
  await prisma.workSchedule.createMany({
    data: [2, 3, 4, 5, 6].map((weekday) => ({
      professionalId: null,
      weekday,
      isOpen: true,
      startMin: min("09:00"),
      endMin: min("19:00"),
    })),
  });

  // Profissionais de exemplo (só se não houver nenhum)
  if ((await prisma.professional.count()) === 0) {
    const todos = await prisma.service.findMany({ include: { category: true } });
    const porCategoria = (...cats: string[]) =>
      todos.filter((s: (typeof todos)[number]) => cats.includes(s.category.name));

    const equipe: Array<{
      name: string;
      servicos: Array<(typeof todos)[number]>;
      de: string;
      ate: string;
      dias: number[];
    }> = [
      { name: "Joana", servicos: porCategoria("Unhas"), de: "09:00", ate: "18:00", dias: [2, 3, 4, 5, 6] },
      { name: "Marina", servicos: porCategoria("Cabelo"), de: "10:00", ate: "19:00", dias: [2, 3, 4, 5, 6] },
      { name: "Camila", servicos: porCategoria("Maquiagem", "Estética"), de: "09:00", ate: "17:00", dias: [3, 4, 5, 6] },
    ];
    for (const e of equipe) {
      await prisma.professional.create({
        data: {
          name: e.name,
          services: { create: e.servicos.map((s) => ({ serviceId: s.id })) },
          schedules: {
            create: e.dias.map((weekday) => ({
              weekday,
              isOpen: true,
              startMin: min(e.de),
              endMin: min(e.ate),
              breakStartMin: min("12:00"), // almoço 12h–13h
              breakEndMin: min("13:00"),
            })),
          },
        },
      });
    }
  }

  console.log(`Seed concluído. Login do dono: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
