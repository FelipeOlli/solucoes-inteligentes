import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";
import { deleteAnexoConhecimento } from "@/lib/storage-conhecimento";

type Params = { params: Promise<{ id: string; anexoId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id, anexoId } = await params;
  const anexo = await prisma.anexoConhecimento.findFirst({ where: { id: anexoId, artigoId: id } });
  if (!anexo) return notFound("Anexo não encontrado.");

  await deleteAnexoConhecimento(anexo.url);
  await prisma.anexoConhecimento.delete({ where: { id: anexoId } });

  return jsonResponse({ ok: true });
}
