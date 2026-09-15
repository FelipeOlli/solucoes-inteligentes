import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, notFound, badRequest, errorResponse } from "@/lib/api-response";

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function getServicoId(idOrCodigo: string): Promise<string | null> {
  const byId = await prisma.servico.findUnique({ where: { id: idOrCodigo }, select: { id: true } });
  if (byId) return byId.id;
  const byCodigo = await prisma.servico.findUnique({ where: { codigo: idOrCodigo }, select: { id: true } });
  return byCodigo?.id ?? null;
}

/**
 * POST /api/servicos/[id]/comprovante-repasse
 * Comprovante do pagamento do repasse ao técnico — condição para concluir o
 * serviço (ver app/api/servicos/[id]/status/route.ts). Um arquivo só;
 * enviar de novo substitui o anterior.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const id = await getServicoId((await params).id);
  if (!id) return notFound();

  try {
    const form = await request.formData().catch(() => null);
    if (!form) return badRequest("Body inválido.");

    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("Campo 'file' obrigatório.");
    if (!ALLOWED_MIME.includes(file.type)) return badRequest("Formato inválido. Use PDF, JPG, PNG ou WEBP.");
    if (file.size > 10 * 1024 * 1024) return badRequest("Arquivo maior que 10 MB.");

    const servico = await prisma.servico.findUnique({
      where: { id },
      select: { comprovanteRepasseUrl: true },
    });
    if (!servico) return notFound();

    const uploadDir = path.join(process.cwd(), "public", "uploads", "servicos", id, "comprovante-repasse");
    await mkdir(uploadDir, { recursive: true });

    const ext = ALLOWED_EXT[file.type];
    const filename = `${nanoid()}.${ext}`;
    const filepath = path.join(uploadDir, filename);
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buf);

    // remove o comprovante anterior, se houver (replace)
    if (servico.comprovanteRepasseUrl) {
      const publicRoot = path.join(process.cwd(), "public");
      const oldPath = path.join(publicRoot, servico.comprovanteRepasseUrl.replace(/^\/+/, ""));
      await unlink(oldPath).catch(() => {});
    }

    const url = `/uploads/servicos/${id}/comprovante-repasse/${filename}`;
    const enviadoEm = new Date();

    await prisma.servico.update({
      where: { id },
      data: {
        comprovanteRepasseUrl: url,
        comprovanteRepasseNomeArquivo: file.name,
        comprovanteRepasseEnviadoEm: enviadoEm,
      },
    });

    return jsonResponse(
      { comprovanteRepasseUrl: url, comprovanteRepasseNomeArquivo: file.name, comprovanteRepasseEnviadoEm: enviadoEm },
      201
    );
  } catch (e) {
    console.error("[POST /api/servicos/[id]/comprovante-repasse]", e);
    return errorResponse("Erro ao enviar comprovante", "INTERNAL_ERROR", 500);
  }
}
