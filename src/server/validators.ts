import { z } from "zod";
import { NextResponse } from "next/server";
import { DATA_REGEX, HORA_REGEX } from "@/lib/datas";

export const dataSchema = z.string().regex(DATA_REGEX, "Data inválida");
export const horaSchema = z.string().regex(HORA_REGEX, "Horário inválido");
export const statusSchema = z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]);

/** Lê o JSON do corpo e valida com zod; devolve { dados } ou { erro } (resposta 400). */
export async function lerCorpo<T extends z.ZodTypeAny>(req: Request, schema: T) {
  let bruto: unknown;
  try {
    bruto = await req.json();
  } catch {
    return { erro: NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 }) };
  }
  const r = schema.safeParse(bruto);
  if (!r.success) {
    const msg = r.error.issues[0]?.message ?? "Dados inválidos.";
    return { erro: NextResponse.json({ error: msg }, { status: 400 }) };
  }
  return { dados: r.data as z.infer<T> };
}

export function lerQuery<T extends z.ZodTypeAny>(url: string, schema: T) {
  const params = Object.fromEntries(new URL(url).searchParams);
  const r = schema.safeParse(params);
  if (!r.success) {
    return { erro: NextResponse.json({ error: r.error.issues[0]?.message ?? "Parâmetros inválidos." }, { status: 400 }) };
  }
  return { dados: r.data as z.infer<T> };
}
