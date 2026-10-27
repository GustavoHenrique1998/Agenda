import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroHttp, exigirSessao } from "@/server/auth";
import { lerCorpo } from "@/server/validators";

export async function POST(req: Request) {
  try {
    const a = await exigirSessao(true);
    if ("erro" in a) return a.erro;
    const c = await lerCorpo(req, z.object({ name: z.string().trim().min(2, "Informe o nome da categoria.") }));
    if ("erro" in c) return c.erro;

    const existente = await prisma.category.findUnique({ where: { name: c.dados.name } });
    if (existente) return NextResponse.json({ error: "Já existe uma categoria com esse nome." }, { status: 409 });

    const ultima = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const cat = await prisma.category.create({
      data: { name: c.dados.name, sortOrder: (ultima._max.sortOrder ?? 0) + 1 },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch (e) {
    return erroHttp(e);
  }
}
