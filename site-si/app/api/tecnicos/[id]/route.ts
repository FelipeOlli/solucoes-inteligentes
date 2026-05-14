import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, notFound, errorResponse } from "@/lib/api-response";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.nome !== undefined) data.nome = String(body.nome).trim();
    if (body.endereco !== undefined) data.endereco = body.endereco ? String(body.endereco).trim() : null;
    if (body.telefone !== undefined) data.telefone = body.telefone ? String(body.telefone).trim() : null;
    if (body.email !== undefined) data.email = body.email ? String(body.email).trim() : null;
    if (body.ativo !== undefined) data.ativo = Boolean(body.ativo);

    const tecnico = await prisma.tecnico.update({ where: { id: params.id }, data });
    return jsonResponse(tecnico);
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao atualizar técnico", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(_request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  try {
    const exists = await prisma.tecnico.findUnique({ where: { id: params.id } });
    if (!exists) return notFound("Técnico não encontrado.");

    // soft-delete: desativa em vez de remover para preservar histórico dos serviços
    const tecnico = await prisma.tecnico.update({ where: { id: params.id }, data: { ativo: false } });
    return jsonResponse(tecnico);
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao remover técnico", "INTERNAL_ERROR", 500);
  }
}
