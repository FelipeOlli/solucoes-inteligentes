import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireServicoDoTecnico } from "@/lib/guards";
import { jsonResponse, badRequest, errorResponse } from "@/lib/api-response";

/**
 * POST /api/tecnicos/me/servicos/[id]/notas
 * Nota escrita pelo técnico em campo. Nunca visível ao cliente por padrão
 * — só o dono decide tornar uma nota visível ao cliente, pela tela dele.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await requireServicoDoTecnico(request, id);
  if (!guard.ok) return guard.res;

  try {
    const body = await request.json();
    const conteudo = String(body.conteudo || "").trim();
    if (!conteudo) return badRequest("conteudo é obrigatório.");

    const nota = await prisma.nota.create({
      data: {
        servicoId: id,
        conteudo,
        visivelCliente: false,
        visivelTecnico: true,
        idAutor: guard.tecnicoId,
      },
    });

    return jsonResponse(
      { id: nota.id, conteudo: nota.conteudo, createdAt: nota.createdAt },
      201
    );
  } catch (e) {
    console.error("[POST /api/tecnicos/me/servicos/[id]/notas]", e);
    return errorResponse("Erro ao criar nota", "INTERNAL_ERROR", 500);
  }
}
