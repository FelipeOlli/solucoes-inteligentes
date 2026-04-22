import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";
import { deleteDocumentoEmpresa } from "@/lib/storage-fiscal";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(_req);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id, docId } = await params;
  const doc = await prisma.documentoEmpresa.findUnique({
    where: { id: docId, empresaFiscalId: id, ativo: true },
  });
  if (!doc) return notFound("Documento não encontrado.");

  await prisma.documentoEmpresa.update({ where: { id: docId }, data: { ativo: false } });
  if (doc.arquivoUrl) await deleteDocumentoEmpresa(doc.arquivoUrl);

  // Remove lembrete da agenda se existir
  if (doc.obrigacaoContabilId) {
    await prisma.obrigacaoContabil.update({
      where: { id: doc.obrigacaoContabilId },
      data: { ativo: false },
    }).catch(() => null); // ignora se já não existir
  }

  return jsonResponse({ ok: true });
}
