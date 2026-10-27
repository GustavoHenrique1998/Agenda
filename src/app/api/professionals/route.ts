// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroHttp } from "@/server/auth";
import { profissionaisParaServicos } from "@/server/disponibilidade";

export const dynamic = "force-dynamic";

// Profissionais ativos; com ?serviceIds=a,b só os que fazem TODOS esses serviços
export async function GET(req: Request) {
  try {
    const csv = new URL(req.url).searchParams.get("serviceIds");
    const ids = csv ? csv.split(",").filter(Boolean) : [];
    const lista = ids.length
      ? await profissionaisParaServicos(ids)
      : await prisma.professional.findMany({ where: { active: true }, orderBy: { name: "asc" } });

    return NextResponse.json(
      lista.map((p: any) => ({ id: p.id, name: p.name, bio: p.bio, photoUrl: p.photoUrl }))
    );
  } catch (e) {
    return erroHttp(e);
  }
}
