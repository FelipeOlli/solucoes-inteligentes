import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";
import { parsePdfBuffer } from "@/lib/fiscal/pdf-parser";
import { processarDocumento } from "@/lib/fiscal/processar-documento";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const doc = await prisma.documentoFiscal.findUnique({ where: { id, ativo: true } });
  if (!doc) return notFound("Documento não encontrado.");

  try {
    const filepath = path.join(process.cwd(), "public", doc.arquivoUrl);
    const buffer = await readFile(filepath);
    const { text } = await parsePdfBuffer(buffer);
    const resultado = await processarDocumento(doc.id, text, doc.empresaFiscalId);
    return jsonResponse({ ok: true, resultado });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Erro ao reprocessar.");
  }
}
