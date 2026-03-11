import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, notFound, badRequest, errorResponse } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const categoria = await prisma.categoriaServico.findUnique({ where: { id } });
  if (!categoria) return notFound();
  return jsonResponse(categoria);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const id = (await params).id;
  const existente = await prisma.categoriaServico.findUnique({ where: { id } });
  if (!existente) return notFound();

  try {
    const body = await request.json();
    const nome = body.nome != null ? String(body.nome).trim() : null;
    if (nome === "") return badRequest("nome não pode ser vazio.");

    const data: { nome?: string } = {};
    if (nome !== null) data.nome = nome;

    const categoria = await prisma.categoriaServico.update({
      where: { id },
      data,
    });
    return jsonResponse(categoria);
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao atualizar categoria", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(_request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const id = (await params).id;
  const existente = await prisma.categoriaServico.findUnique({ where: { id } });
  if (!existente) return notFound();

  await prisma.categoriaServico.delete({ where: { id } });
  return jsonResponse({ ok: true });
}
