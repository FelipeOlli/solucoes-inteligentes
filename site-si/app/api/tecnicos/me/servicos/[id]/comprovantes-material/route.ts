import { NextRequest } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { requireServicoDoTecnico } from "@/lib/guards";
import { jsonResponse, badRequest, notFound, errorResponse } from "@/lib/api-response";

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const ALLOWED_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

/**
 * POST /api/tecnicos/me/servicos/[id]/comprovantes-material
 * O técnico anexa nota fiscal/comprovante de peça comprada, a qualquer
 * momento durante o atendimento — não precisa esperar concluir. Múltiplos
 * arquivos por chamada, acumulados em Servico.comprovantesMaterial (mesmo
 * formato JSON array de Servico.imagens).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await requireServicoDoTecnico(request, id);
  if (!guard.ok) return guard.res;

  try {
    const formData = await request.formData();
    const files = formData.getAll("file") as File[];
    if (!files.length) return badRequest("Envie pelo menos um arquivo (campo 'file').");

    for (const file of files) {
      if (!ALLOWED_MIME.includes(file.type)) {
        return badRequest("Formato inválido. Use PDF, JPG, PNG, WEBP ou HEIC.");
      }
      if (file.size > 10 * 1024 * 1024) {
        return badRequest("Arquivo maior que 10 MB.");
      }
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "servicos", id, "comprovantes-material");
    await mkdir(uploadDir, { recursive: true });

    const novasUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = ALLOWED_EXT[file.type];
      const filename = `${Date.now()}_${i}.${ext}`;
      const filepath = path.join(uploadDir, filename);
      const buf = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, buf);
      novasUrls.push(`/uploads/servicos/${id}/comprovantes-material/${filename}`);
    }

    const servico = await prisma.servico.findUnique({ where: { id }, select: { comprovantesMaterial: true } });
    if (!servico) return notFound();

    const existentes = servico.comprovantesMaterial ? (JSON.parse(servico.comprovantesMaterial) as string[]) : [];
    const todas = [...existentes, ...novasUrls];
    await prisma.servico.update({ where: { id }, data: { comprovantesMaterial: JSON.stringify(todas) } });

    return jsonResponse({ urls: novasUrls, comprovantesMaterial: todas }, 201);
  } catch (e) {
    console.error("[POST /api/tecnicos/me/servicos/[id]/comprovantes-material]", e);
    return errorResponse("Erro ao enviar comprovante de material", "INTERNAL_ERROR", 500);
  }
}

/**
 * DELETE /api/tecnicos/me/servicos/[id]/comprovantes-material?url=...
 * Remove um comprovante enviado por engano, antes do dono revisar.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await requireServicoDoTecnico(request, id);
  if (!guard.ok) return guard.res;

  try {
    const urlRaw = request.nextUrl.searchParams.get("url");
    if (!urlRaw) return badRequest("Parâmetro url é obrigatório.");

    let targetUrl: string;
    try {
      targetUrl = decodeURIComponent(urlRaw);
    } catch {
      return badRequest("URL inválida.");
    }
    if (targetUrl.includes("\0")) return badRequest("URL inválida.");

    const expectedPrefix = `/uploads/servicos/${id}/comprovantes-material/`;
    if (!targetUrl.startsWith(expectedPrefix)) {
      return badRequest("URL não pertence a este serviço.");
    }

    const servico = await prisma.servico.findUnique({ where: { id }, select: { comprovantesMaterial: true } });
    if (!servico) return notFound();

    const lista = servico.comprovantesMaterial ? (JSON.parse(servico.comprovantesMaterial) as string[]) : [];
    const next = lista.filter((u) => u !== targetUrl);
    if (next.length === lista.length) return badRequest("Arquivo não encontrado.");

    const publicRoot = path.join(process.cwd(), "public");
    const uploadRoot = path.normalize(path.join(publicRoot, "uploads", "servicos", id, "comprovantes-material"));
    const filepath = path.normalize(path.join(publicRoot, ...targetUrl.replace(/^\/+/, "").split("/")));
    const relToRoot = path.relative(uploadRoot, filepath);
    if (relToRoot.startsWith("..") || path.isAbsolute(relToRoot)) return badRequest("Caminho inválido.");

    await prisma.servico.update({
      where: { id },
      data: { comprovantesMaterial: next.length > 0 ? JSON.stringify(next) : null },
    });
    await unlink(filepath).catch(() => {});

    return jsonResponse({ comprovantesMaterial: next });
  } catch (e) {
    console.error("[DELETE /api/tecnicos/me/servicos/[id]/comprovantes-material]", e);
    return errorResponse("Erro ao remover comprovante de material", "INTERNAL_ERROR", 500);
  }
}
