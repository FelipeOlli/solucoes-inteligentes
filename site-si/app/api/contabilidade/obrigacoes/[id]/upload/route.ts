import { NextRequest } from "next/server";
import { CategoriaDocumentoContabil } from "@prisma/client";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const obrigacaoId = (await params).id;
  const obrigacao = await prisma.obrigacaoContabil.findUnique({ where: { id: obrigacaoId } });
  if (!obrigacao || !obrigacao.ativo) return notFound("Obrigação não encontrada.");

  const formData = await request.formData();
  const categoriaRaw = String(formData.get("categoria") || "").trim() as CategoriaDocumentoContabil;
  if (!Object.values(CategoriaDocumentoContabil).includes(categoriaRaw)) {
    return badRequest("categoria é obrigatória e deve ser válida.");
  }
  const competenciaRef = String(formData.get("competenciaRef") || "").trim() || null;
  const dataDocumentoRaw = String(formData.get("dataDocumento") || "").trim();
  const dataDocumento = dataDocumentoRaw ? new Date(dataDocumentoRaw) : null;
  if (dataDocumentoRaw && (!dataDocumento || Number.isNaN(dataDocumento.getTime()))) {
    return badRequest("dataDocumento inválida.");
  }

  const files = formData.getAll("file") as File[];
  if (!files.length) return badRequest("Envie pelo menos um arquivo (campo 'file').");

  const uploadDir = path.join(process.cwd(), "public", "uploads", "contabilidade", obrigacaoId);
  await mkdir(uploadDir, { recursive: true });

  const created = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    if (!file?.size || !file?.name) continue;
    if (file.size > MAX_FILE_SIZE) {
      return badRequest(`Arquivo ${file.name} excede o limite de 15MB.`);
    }
    const ext = path.extname(file.name) || "";
    const base = path.basename(file.name, ext).replace(/\W/g, "_") || "arquivo";
    const filename = `${base}_${Date.now()}_${i}${ext}`;
    const filepath = path.join(uploadDir, filename);
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buf);
    const arquivoUrl = `/uploads/contabilidade/${obrigacaoId}/${filename}`;
    const doc = await prisma.documentoContabil.create({
      data: {
        obrigacaoId,
        categoria: categoriaRaw,
        nomeOriginal: file.name,
        arquivoUrl,
        mimeType: file.type || null,
        tamanhoBytes: file.size,
        competenciaRef,
        dataDocumento,
        uploadedBy: auth.userId,
      },
    });
    created.push(doc);
  }

  if (!created.length) return badRequest("Nenhum arquivo válido enviado.");
  return jsonResponse(created, 201);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const obrigacaoId = (await params).id;
  const obrigacao = await prisma.obrigacaoContabil.findUnique({ where: { id: obrigacaoId } });
  if (!obrigacao || !obrigacao.ativo) return notFound("Obrigação não encontrada.");

  const documentId = String(request.nextUrl.searchParams.get("documentId") || "").trim();
  if (!documentId) return badRequest("Parâmetro documentId é obrigatório.");

  const doc = await prisma.documentoContabil.findFirst({
    where: { id: documentId, obrigacaoId },
  });
  if (!doc) return notFound("Documento não encontrado.");

  await prisma.documentoContabil.delete({ where: { id: doc.id } });

  const publicRoot = path.join(process.cwd(), "public");
  const relativeFromPublic = doc.arquivoUrl.replace(/^\/+/, "");
  const filepath = path.normalize(path.join(publicRoot, ...relativeFromPublic.split("/")));
  await unlink(filepath).catch(() => undefined);

  return jsonResponse({ ok: true });
}
