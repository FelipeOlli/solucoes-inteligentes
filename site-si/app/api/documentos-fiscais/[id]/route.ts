import { NextRequest } from "next/server";
import { TipoDocumentoFiscal } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";
import { deleteDocumentoFiscal } from "@/lib/storage-fiscal";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const doc = await prisma.documentoFiscal.findUnique({
    where: { id, ativo: true },
    include: {
      empresaFiscal: { select: { id: true, cnpj: true, razaoSocial: true } },
      obrigacao: true,
    },
  });

  if (!doc) return notFound("Documento não encontrado.");
  return jsonResponse(doc);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const doc = await prisma.documentoFiscal.findUnique({ where: { id, ativo: true } });
  if (!doc) return notFound("Documento não encontrado.");

  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Body inválido.");

  const data: Record<string, unknown> = {};

  if (body.competencia != null) {
    const d = new Date(body.competencia);
    if (isNaN(d.getTime())) return badRequest("competencia inválida.");
    data.competencia = d;
  }
  if (body.vencimento != null) {
    const d = new Date(body.vencimento);
    if (isNaN(d.getTime())) return badRequest("vencimento inválido.");
    data.vencimento = d;
  }
  if (body.valorTotal != null) {
    const v = parseFloat(String(body.valorTotal));
    if (isNaN(v)) return badRequest("valorTotal inválido.");
    data.valorTotal = v;
  }
  if (body.numeroDocumento != null) {
    data.numeroDocumento = String(body.numeroDocumento).trim();
  }
  if (body.tipoDocumento != null) {
    if (!Object.values(TipoDocumentoFiscal).includes(body.tipoDocumento))
      return badRequest("tipoDocumento inválido.");
    data.tipoDocumento = body.tipoDocumento;
  }
  if (body.statusProcessamento === "MANUAL") {
    data.statusProcessamento = "MANUAL";
  }

  const atualizado = await prisma.documentoFiscal.update({ where: { id }, data });
  return jsonResponse(atualizado);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const doc = await prisma.documentoFiscal.findUnique({ where: { id, ativo: true } });
  if (!doc) return notFound("Documento não encontrado.");

  await prisma.documentoFiscal.update({ where: { id }, data: { ativo: false } });
  await deleteDocumentoFiscal(doc.arquivoUrl);

  return jsonResponse({ ok: true });
}
