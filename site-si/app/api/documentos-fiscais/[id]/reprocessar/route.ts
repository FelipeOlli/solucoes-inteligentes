import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";
import { parsePdfBuffer } from "@/lib/fiscal/pdf-parser";
import { processarDocumento, ModoProcessamento } from "@/lib/fiscal/processar-documento";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const doc = await prisma.documentoFiscal.findUnique({ where: { id, ativo: true } });
  if (!doc) return notFound("Documento não encontrado.");

  const body = await request.json().catch(() => ({}));
  const MODOS_VALIDOS: ModoProcessamento[] = ["MANUAL", "SEMI_AUTO", "IA"];
  const modoRaw = String(body?.modo ?? "SEMI_AUTO");
  const modo: ModoProcessamento = MODOS_VALIDOS.includes(modoRaw as ModoProcessamento)
    ? (modoRaw as ModoProcessamento)
    : "SEMI_AUTO";

  try {
    // Reutiliza texto já extraído do banco; só relê o PDF se necessário
    let texto = doc.textoExtraido ?? "";
    if (!texto) {
      const filepath = path.join(process.cwd(), "public", doc.arquivoUrl);
      const buffer = await readFile(filepath);
      const parsed = await parsePdfBuffer(buffer);
      texto = parsed.text;
    }

    const resultado = await processarDocumento(doc.id, texto, doc.empresaFiscalId, modo);
    return jsonResponse({ ok: true, resultado });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Erro ao reprocessar.");
  }
}
