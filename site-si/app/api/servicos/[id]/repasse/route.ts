import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireDono } from "@/lib/guards";
import { jsonResponse, notFound, badRequest, errorResponse } from "@/lib/api-response";

/**
 * POST /api/servicos/[id]/repasse
 * Negociação do repasse pelo lado do dono:
 *  - { acao: "aprovar" } → aceita a proposta do técnico (vira valorRepasse)
 *  - { acao: "recusar" } → descarta a proposta do técnico
 *  - { acao: "contrapropor", valor, observacao? } → devolve outro valor para o técnico aceitar
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDono(request);
  if (!guard.ok) return guard.res;

  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const acao = String(body.acao || "");

    const servico = await prisma.servico.findUnique({
      where: { id },
      select: { repasseProposto: true, repassePropostoOrigem: true },
    });
    if (!servico) return notFound();

    const limpar = { repasseProposto: null, repassePropostoOrigem: null, repassePropostoObs: null };
    const nota = (conteudo: string) =>
      prisma.nota.create({
        data: { servicoId: id, conteudo, visivelCliente: false, visivelTecnico: true, idAutor: guard.auth.userId },
      });
    const fmt = (v: number) => v.toFixed(2).replace(".", ",");

    if (acao === "contrapropor") {
      const valor = Number(body.valor);
      if (!Number.isFinite(valor) || valor <= 0) return badRequest("valor deve ser maior que zero.");
      const obs = String(body.observacao || "").trim() || null;
      await prisma.$transaction([
        prisma.servico.update({
          where: { id },
          data: { repasseProposto: valor, repassePropostoOrigem: "DONO", repassePropostoObs: obs },
        }),
        nota(`Contraproposta de repasse: R$ ${fmt(valor)}${obs ? ` — ${obs}` : ""}`),
      ]);
      return jsonResponse({ repasseProposto: valor, repassePropostoOrigem: "DONO" });
    }

    if (acao === "aprovar" || acao === "recusar") {
      if (servico.repasseProposto == null || servico.repassePropostoOrigem !== "TECNICO") {
        return badRequest("Não há proposta do técnico pendente.");
      }
      if (acao === "aprovar") {
        await prisma.$transaction([
          prisma.servico.update({ where: { id }, data: { valorRepasse: servico.repasseProposto, ...limpar } }),
          nota(`Repasse aprovado: R$ ${fmt(servico.repasseProposto)}`),
        ]);
        return jsonResponse({ valorRepasse: servico.repasseProposto });
      }
      await prisma.$transaction([
        prisma.servico.update({ where: { id }, data: limpar }),
        nota("Proposta de repasse recusada"),
      ]);
      return jsonResponse({ ok: true });
    }

    return badRequest('acao deve ser "aprovar", "recusar" ou "contrapropor".');
  } catch (e) {
    console.error("[POST /api/servicos/[id]/repasse]", e);
    return errorResponse("Erro ao negociar repasse", "INTERNAL_ERROR", 500);
  }
}
