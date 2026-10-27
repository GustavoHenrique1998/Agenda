import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { erroHttp } from "@/server/auth";
import { lerCorpo } from "@/server/validators";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export async function POST(req: Request) {
  try {
    const c = await lerCorpo(req, schema);
    if ("erro" in c) return c.erro;
    const { name, email, phone, password } = c.dados;

    const existente = await prisma.user.findUnique({ where: { email } });
    if (existente) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // role nunca vem do cliente: cadastro público sempre cria CLIENT
    await prisma.user.create({ data: { name, email, phone: phone || null, passwordHash, role: "CLIENT" } });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return erroHttp(e);
  }
}
