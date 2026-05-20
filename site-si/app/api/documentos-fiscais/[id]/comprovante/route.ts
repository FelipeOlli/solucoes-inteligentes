import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";
import { saveComprovantePagamento, deleteComprovantePagamento } from "@/lib/storage-fiscal";
import { validarComprovante } from "@/lib/fiscal/validar-comprovante";

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
  const doc = await prisma.documentoFiscal.findUnique({ where: { id, ativo: true } });
  if (!doc) return notFound("Documento não encontrado.");

  const form = await request.formData().catch(() => null);
  if (!form) return badRequest("Body inválido.");

  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("Campo 'file' obrigatório.");
  if (!ALLOWED_MIME.includes(file.type)) return badRequest("Formato inválido. Use PDF, JPG ou PNG.");
  if (file.size > 20 * 1024 * 1024) return badRequest("Arquivo maior que 20 MB.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex");
  const ext = ALLOWED_EXT[file.type];
  const uuid = nanoid();

  // Remove comprovante anterior se existir
  if (doc.comprovanteUrl) {
    await deleteComprovantePagamento(doc.comprovanteUrl);
  }

  const { url, tamanhoBytes } = await saveComprovantePagamento(
    doc.empresaFiscalId,
    doc.id,
    uuid,
    file,
    ext
  );

  const statusPagamento =
    doc.statusPagamento === "PENDENTE" && doc.dataPagamento
      ? "PAGO"
      : doc.statusPagamento;

  let comprovanteValidacaoIA = null;
  try {
    comprovanteValidacaoIA = await validarComprovante(buffer, file.type, {
      tipo: doc.tipoDocumento,
      valorTotal: doc.valorTotal,
      vencimento: doc.vencimento,
      numeroDocumento: doc.numeroDocumento,
    });
  } catch { /* não bloqueia o upload */ }

  const atualizado = await prisma.documentoFiscal.update({
    where: { id },
    data: {
      comprovanteUrl: url,
      comprovanteNomeArquivo: file.name,
      comprovanteTamanhoBytes: tamanhoBytes,
      comprovanteHash: hash,
      statusPagamento,
      comprovanteValidacaoIA: comprovanteValidacaoIA ?? undefined,
    },
  });

  return jsonResponse(atualizado, 201);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const doc = await prisma.documentoFiscal.findUnique({ where: { id, ativo: true } });
  if (!doc) return notFound("Documento não encontrado.");

  if (doc.comprovanteUrl) {
    await deleteComprovantePagamento(doc.comprovanteUrl);
  }

  const atualizado = await prisma.documentoFiscal.update({
    where: { id },
    data: {
      comprovanteUrl: null,
      comprovanteNomeArquivo: null,
      comprovanteTamanhoBytes: null,
      comprovanteHash: null,
    },
  });

  return jsonResponse(atualizado);
}
