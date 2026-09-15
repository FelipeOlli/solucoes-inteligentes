import { NextRequest } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono, isCliente, isTecnico } from "@/lib/auth";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".avif": "image/avif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function mimeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

/**
 * Só o dono acessa documentos administrativos (fiscal, contabilidade,
 * orçamento, base de conhecimento). Uploads de serviço também liberam o
 * cliente dono daquele serviço e o técnico responsável por ele.
 */
async function isAuthorized(
  segments: string[],
  request: NextRequest
): Promise<boolean> {
  const auth = await getAuthFromRequest(request);
  if (!auth) return false;
  if (isDono(auth)) return true;

  const [top, servicoId] = segments;

  if (top === "servicos" && servicoId) {
    if (isCliente(auth)) {
      const servico = await prisma.servico.findUnique({
        where: { id: servicoId },
        select: { clienteId: true },
      });
      return servico?.clienteId === auth.id_cliente;
    }
    if (isTecnico(auth)) {
      const servico = await prisma.servico.findUnique({
        where: { id: servicoId },
        select: { tecnicoId: true },
      });
      return servico?.tecnicoId === auth.tecnicoId;
    }
    return false;
  }

  // documentos-fiscais, empresas-fiscais, orcamento-anexos, conhecimento, etc.
  return false;
}

/**
 * Next.js App Router nao serve de forma fiavel em producao ficheiros criados
 * em runtime em public/uploads; esta rota faz stream a partir do disco.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path: segments } = await params;
  if (!segments?.length) return new Response("Not Found", { status: 404 });

  const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
  const filepath = path.resolve(uploadsRoot, ...segments);

  const relativeToRoot = path.relative(uploadsRoot, filepath);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!(await isAuthorized(segments, request))) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const s = await stat(filepath);
    if (!s.isFile()) return new Response("Not Found", { status: 404 });
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  const stream = createReadStream(filepath);
  const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": mimeFor(filepath),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
