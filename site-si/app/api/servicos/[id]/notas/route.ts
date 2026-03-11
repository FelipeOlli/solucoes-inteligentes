import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, notFound, badRequest, errorResponse } from "@/lib/api-response";

async function getServicoId(idOrCodigo: string): Promise<string | null> {
  const byId = await prisma.servico.findUnique({ where: { id: idOrCodigo }, select: { id: true } });
  if (byId) return byId.id;
  const byCodigo = await prisma.servico.findUnique({ where: { codigo: idOrCodigo }, select: { id: true } });
  return byCodigo?.id ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const id = await getServicoId((await params).id);
  if (!id) return notFound();

  try {
    const body = await request.json();
    const conteudo = String(body.conteudo || "").trim();
    if (!conteudo) return badRequest("conteudo é obrigatório.");
    const visivelCliente = Boolean(body.visivel_cliente ?? body.visivelCliente ?? false);

    const nota = await prisma.nota.create({
      data: {
        servicoId: id,
        conteudo,
        visivelCliente,
        idAutor: auth.userId,
      },
    });
    return jsonResponse(
      { id: nota.id, conteudo: nota.conteudo, visivelCliente: nota.visivelCliente, idAutor: nota.idAutor, createdAt: nota.createdAt },
      201
    );
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao criar nota", "INTERNAL_ERROR", 500);
  }
}
