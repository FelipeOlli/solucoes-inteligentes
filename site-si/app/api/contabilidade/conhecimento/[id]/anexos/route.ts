import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";
import { saveAnexoConhecimento } from "@/lib/storage-conhecimento";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const artigo = await prisma.artigoConhecimento.findUnique({ where: { id, ativo: true } });
  if (!artigo) return notFound("Artigo não encontrado.");

  const form = await request.formData().catch(() => null);
  if (!form) return badRequest("Body inválido.");

  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("Campo 'file' obrigatório.");
  if (!ALLOWED_MIME.includes(file.type)) return badRequest("Formato inválido. Use PDF, JPG ou PNG.");
  if (file.size > 20 * 1024 * 1024) return badRequest("Arquivo maior que 20 MB.");

  const ext = ALLOWED_EXT[file.type];
  const { url, tamanhoBytes } = await saveAnexoConhecimento(id, file, ext);

  const anexo = await prisma.anexoConhecimento.create({
    data: {
      artigoId: id,
      nomeArquivo: file.name,
      url,
      mimeType: file.type,
      tamanhoBytes,
    },
  });

  return jsonResponse(anexo, 201);
}
