import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";
import { deleteAnexoOrcamento } from "@/lib/storage-orcamento";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const anexo = await prisma.anexoOrcamento.findUnique({ where: { id } });
  if (!anexo) return notFound("Anexo não encontrado.");

  await deleteAnexoOrcamento(anexo.url);
  await prisma.anexoOrcamento.delete({ where: { id } });

  return jsonResponse({ ok: true });
}
