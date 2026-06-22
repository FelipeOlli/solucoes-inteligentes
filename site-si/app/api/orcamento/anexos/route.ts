import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, unauthorized } from "@/lib/api-response";
import { saveAnexoOrcamento } from "@/lib/storage-orcamento";
import { CategoriaAnexoOrcamento, TipoCarimbo } from "@prisma/client";

const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "text/html": "html",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get("categoria") as CategoriaAnexoOrcamento | null;

  const where = categoria && Object.values(CategoriaAnexoOrcamento).includes(categoria)
    ? { categoria }
    : {};

  const anexos = await prisma.anexoOrcamento.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return jsonResponse(anexos);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const form = await request.formData().catch(() => null);
  if (!form) return badRequest("Body inválido.");

  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("Campo 'file' obrigatório.");

  const categoriaRaw = form.get("categoria") as string | null;
  if (!categoriaRaw || !Object.values(CategoriaAnexoOrcamento).includes(categoriaRaw as CategoriaAnexoOrcamento)) {
    return badRequest("Campo 'categoria' inválido. Use MODELO ou CARIMBO.");
  }
  const categoria = categoriaRaw as CategoriaAnexoOrcamento;

  const rotulo = (form.get("rotulo") as string | null)?.trim() || "";
  if (!rotulo) return badRequest("Campo 'rotulo' obrigatório.");

  let tipoCarimbo: TipoCarimbo | null = null;
  if (categoria === "CARIMBO") {
    const tipoRaw = form.get("tipoCarimbo") as string | null;
    if (!tipoRaw || !Object.values(TipoCarimbo).includes(tipoRaw as TipoCarimbo)) {
      return badRequest("Campo 'tipoCarimbo' inválido para CARIMBO. Use PIX, CARTAO_CREDITO ou CHEQUE.");
    }
    tipoCarimbo = tipoRaw as TipoCarimbo;
  }

  const ext = ALLOWED_MIME[file.type];
  if (!ext) return badRequest("Formato não suportado. Use PDF, imagens ou documentos Office.");
  if (file.size > 20 * 1024 * 1024) return badRequest("Arquivo maior que 20 MB.");

  const { url, tamanhoBytes } = await saveAnexoOrcamento(file, ext);

  const anexo = await prisma.anexoOrcamento.create({
    data: {
      categoria,
      rotulo,
      tipoCarimbo,
      nomeArquivo: file.name,
      url,
      mimeType: file.type,
      tamanhoBytes,
    },
  });

  return jsonResponse(anexo, 201);
}
