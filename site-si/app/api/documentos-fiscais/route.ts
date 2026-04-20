import { NextRequest } from "next/server";
import { TipoDocumentoFiscal } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, unauthorized } from "@/lib/api-response";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId") || undefined;
  const tipo = searchParams.get("tipo") || undefined;
  const busca = searchParams.get("busca") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));

  if (tipo && !Object.values(TipoDocumentoFiscal).includes(tipo as TipoDocumentoFiscal)) {
    return badRequest("tipo inválido.");
  }

  const where = {
    ativo: true,
    ...(empresaId ? { empresaFiscalId: empresaId } : {}),
    ...(tipo ? { tipoDocumento: tipo as TipoDocumentoFiscal } : {}),
    ...(busca
      ? {
          OR: [
            { textoExtraido: { contains: busca, mode: "insensitive" as const } },
            { numeroDocumento: { contains: busca, mode: "insensitive" as const } },
            { nomeArquivo: { contains: busca, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, documentos] = await Promise.all([
    prisma.documentoFiscal.count({ where }),
    prisma.documentoFiscal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        tipoDocumento: true,
        nomeArquivo: true,
        arquivoUrl: true,
        tamanhoBytes: true,
        statusProcessamento: true,
        competencia: true,
        vencimento: true,
        valorTotal: true,
        numeroDocumento: true,
        createdAt: true,
        empresaFiscal: { select: { id: true, cnpj: true, razaoSocial: true } },
        obrigacao: { select: { id: true, tipo: true, status: true } },
      },
    }),
  ]);

  return jsonResponse({ documentos, total, page, pageSize: PAGE_SIZE });
}
