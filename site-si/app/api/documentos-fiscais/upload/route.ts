import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, conflict, forbidden, jsonResponse, unauthorized } from "@/lib/api-response";
import { saveDocumentoFiscal } from "@/lib/storage-fiscal";
import { parsePdf } from "@/lib/fiscal/pdf-parser";
import { processarDocumento, ModoProcessamento } from "@/lib/fiscal/processar-documento";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const formData = await request.formData().catch(() => null);
  if (!formData) return badRequest("Corpo inválido (multipart esperado).");

  const file = formData.get("file");
  const empresaFiscalId = String(formData.get("empresaFiscalId") || "").trim();
  const modoRaw = String(formData.get("modo") || "SEMI_AUTO").trim();
  const MODOS_VALIDOS: ModoProcessamento[] = ["MANUAL", "SEMI_AUTO", "IA"];
  const modo: ModoProcessamento = MODOS_VALIDOS.includes(modoRaw as ModoProcessamento)
    ? (modoRaw as ModoProcessamento)
    : "SEMI_AUTO";

  if (!file || !(file instanceof File)) return badRequest("file é obrigatório.");
  if (!empresaFiscalId) return badRequest("empresaFiscalId é obrigatório.");
  if (file.type !== "application/pdf" && !file.name.endsWith(".pdf"))
    return badRequest("Apenas PDFs são aceitos.");
  if (file.size > MAX_SIZE) return badRequest("Arquivo maior que 20MB.");

  const empresa = await prisma.empresaFiscal.findUnique({
    where: { id: empresaFiscalId, ativo: true },
  });
  if (!empresa) return badRequest("Empresa fiscal não encontrada.");

  // Calcular hash para deduplicação
  const buffer = Buffer.from(await file.arrayBuffer());
  const hashArquivo = createHash("sha256").update(buffer).digest("hex");

  const duplicado = await prisma.documentoFiscal.findFirst({
    where: { hashArquivo, empresaFiscalId, ativo: true },
    select: { id: true, nomeArquivo: true, tipoDocumento: true },
  });
  if (duplicado) {
    return conflict(`Arquivo já enviado anteriormente (${duplicado.nomeArquivo}).`);
  }

  const uuid = nanoid();
  const fileObj = new File([buffer], file.name, { type: file.type });
  const { url, tamanhoBytes } = await saveDocumentoFiscal(empresaFiscalId, uuid, fileObj);

  // Cria registro inicial
  const documento = await prisma.documentoFiscal.create({
    data: {
      empresaFiscalId,
      tipoDocumento: "OUTROS",
      nomeArquivo: file.name,
      arquivoUrl: url,
      tamanhoBytes,
      hashArquivo,
      statusProcessamento: "PENDENTE",
    },
  });

  // Processa sincronamente (modo MANUAL não chama IA nem regex)
  let resultado = null;
  try {
    if (modo === "MANUAL") {
      await processarDocumento(documento.id, "", empresaFiscalId, "MANUAL");
    } else {
      const { text } = await parsePdf(fileObj);
      resultado = await processarDocumento(documento.id, text, empresaFiscalId, modo);
    }
  } catch {
    // erro já registrado no banco pelo processarDocumento; continua
  }

  const documentoAtualizado = await prisma.documentoFiscal.findUnique({
    where: { id: documento.id },
    include: { obrigacao: true },
  });

  return jsonResponse({ documento: documentoAtualizado, resultado }, 201);
}
