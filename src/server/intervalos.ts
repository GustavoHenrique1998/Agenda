// Núcleo PURO do cálculo de disponibilidade (sem banco, sem relógio).
// Tudo em minutos desde 00:00 do dia, no fuso do salão. Fácil de testar.

export type Intervalo = { start: number; end: number };

export type JanelaExpediente = {
  isOpen: boolean;
  startMin: number;
  endMin: number;
  breakStartMin?: number | null;
  breakEndMin?: number | null;
};

/** Remove de `livres` todos os trechos ocupados. */
export function subtrair(livres: Intervalo[], ocupados: Intervalo[]): Intervalo[] {
  let resultado = livres;
  for (const o of ocupados) {
    if (o.end <= o.start) continue;
    resultado = resultado.flatMap((l) => {
      if (o.end <= l.start || o.start >= l.end) return [l]; // sem interseção
      const partes: Intervalo[] = [];
      if (o.start > l.start) partes.push({ start: l.start, end: o.start });
      if (o.end < l.end) partes.push({ start: o.end, end: l.end });
      return partes;
    });
  }
  return resultado;
}

export function intersecao(a: Intervalo, b: Intervalo): Intervalo | null {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return start < end ? { start, end } : null;
}

/**
 * Janelas livres do dia:
 *   expediente = interseção(salão, profissional)
 *   menos almoço/pausa (do salão e do profissional)
 *   menos ocupados (agendamentos ativos + bloqueios)
 */
export function janelasLivres(
  salao: JanelaExpediente | null | undefined,
  profissional: JanelaExpediente | null | undefined,
  ocupados: Intervalo[]
): Intervalo[] {
  if (!salao?.isOpen || !profissional?.isOpen) return [];

  const expediente = intersecao(
    { start: salao.startMin, end: salao.endMin },
    { start: profissional.startMin, end: profissional.endMin }
  );
  if (!expediente) return [];

  const pausas: Intervalo[] = [];
  for (const h of [salao, profissional]) {
    if (h.breakStartMin != null && h.breakEndMin != null) {
      pausas.push({ start: h.breakStartMin, end: h.breakEndMin });
    }
  }

  return subtrair(subtrair([expediente], pausas), ocupados);
}

/**
 * Horários de INÍCIO válidos: o serviço inteiro (duracaoMin) precisa caber
 * numa janela livre. Ex.: serviço de 2h às 14:00 ocupa 14–16 → o próximo
 * início livre para este profissional é 16:00.
 */
export function gerarHorarios(
  livres: Intervalo[],
  duracaoMin: number,
  passoMin: number,
  minimoMin = 0
): number[] {
  const inicios: number[] = [];
  for (const janela of livres) {
    let t = Math.ceil(Math.max(janela.start, minimoMin) / passoMin) * passoMin;
    while (t + duracaoMin <= janela.end) {
      inicios.push(t);
      t += passoMin;
    }
  }
  return inicios;
}
