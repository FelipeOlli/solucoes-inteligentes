import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireServicoDoTecnico } from "@/lib/guards";
import { jsonResponse, notFound, badRequest, errorResponse } from "@/lib/api-response";

/**
 * POST /api/tecnicos/me/servicos/[id]/repasse
 * Negociação do valor de repasse pelo lado do técnico:
 *  - { acao: "propor", valor, observacao? } → proposta que o dono aprova/recusa/contrapropõe
 *  - { acao: "aceitar" } → aceita a contraproposta do dono (vira valorRepasse)
 *  - { acao: "recusar" } → recusa a contraproposta (descarta; valorRepasse segue como está)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await requireServicoDoTecnico(request, id);
  if (!guard.ok) return guard.res;

  try {
    const body = await request.json().catch(() => ({}));
    const acao = String(body.acao || "");

    const servico = await prisma.servico.findUnique({
      where: { id },
      select: { statusAtual: true, repasseProposto: true, repassePropostoOrigem: true },
    });
    if (!servico) return notFound();
    if (servico.statusAtual === "CONCLUIDO" || servico.statusAtual === "CANCELADO") {
      return badRequest("Serviço encerrado — o repasse não pode mais ser negociado.");
    }

    const nota = (conteudo: string) =>
      prisma.nota.create({
        data: { servicoId: id, conteudo, visivelCliente: false, visivelTecnico: true, idAutor: guard.tecnicoId },
      });

    if (acao === "propor") {
      const valor = Number(body.valor);
      if (!Number.isFinite(valor) || valor <= 0) return badRequest("valor deve ser maior que zero.");
      const obs = String(body.observacao || "").trim() || null;
      await prisma.$transaction([
        prisma.servico.update({
          where: { id },
          data: { repasseProposto: valor, repassePropostoOrigem: "TECNICO", repassePropostoObs: obs },
        }),
        nota(`Técnico propôs repasse de R$ ${valor.toFixed(2).replace(".", ",")}${obs ? ` — ${obs}` : ""}`),
      ]);
      return jsonResponse({ repasseProposto: valor, repassePropostoOrigem: "TECNICO" });
    }

    if (acao === "aceitar" || acao === "recusar") {
      if (servico.repasseProposto == null || servico.repassePropostoOrigem !== "DONO") {
        return badRequest("Não há contraproposta do dono pendente.");
      }
      const limpar = { repasseProposto: null, repassePropostoOrigem: null, repassePropostoObs: null };
      if (acao === "aceitar") {
        await prisma.$transaction([
          prisma.servico.update({ where: { id }, data: { valorRepasse: servico.repasseProposto, ...limpar } }),
          nota(`Técnico aceitou o repasse de R$ ${servico.repasseProposto.toFixed(2).replace(".", ",")}`),
        ]);
        return jsonResponse({ valorRepasse: servico.repasseProposto });
      }
      await prisma.$transaction([
        prisma.servico.update({ where: { id }, data: limpar }),
        nota("Técnico recusou a contraproposta de repasse"),
      ]);
      return jsonResponse({ ok: true });
    }

    return badRequest('acao deve ser "propor", "aceitar" ou "recusar".');
  } catch (e) {
    console.error("[POST /api/tecnicos/me/servicos/[id]/repasse]", e);
    return errorResponse("Erro ao negociar repasse", "INTERNAL_ERROR", 500);
  }
}
