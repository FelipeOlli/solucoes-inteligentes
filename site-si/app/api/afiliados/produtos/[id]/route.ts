import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, notFound, errorResponse } from "@/lib/api-response";

type Params = Promise<{ id: string }>;

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  try {
    const body = await request.json();
    const produto = await prisma.produtoAfiliado.findUnique({ where: { id } });
    if (!produto) return notFound("Produto não encontrado.");

    const updated = await prisma.produtoAfiliado.update({
      where: { id },
      data: { favorito: body.favorito ?? !produto.favorito },
    });
    return jsonResponse(updated);
  } catch (e) {
    console.error("[PATCH /api/afiliados/produtos/:id]", e);
    return errorResponse("Erro ao atualizar produto", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  try {
    const produto = await prisma.produtoAfiliado.findUnique({ where: { id } });
    if (!produto) return notFound("Produto não encontrado.");

    await prisma.produtoAfiliado.delete({ where: { id } });
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/afiliados/produtos/:id]", e);
    return errorResponse("Erro ao remover produto", "INTERNAL_ERROR", 500);
  }
}
