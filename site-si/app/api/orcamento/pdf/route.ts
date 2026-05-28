export const runtime = "nodejs";

import { NextRequest } from "next/server";
import path from "path";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement, type JSXElementConstructor } from "react";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { unauthorized, forbidden, errorResponse } from "@/lib/api-response";
import { OrcamentoPDFDocument } from "@/lib/orcamento/pdf-template";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  let body: {
    clienteId: string;
    descricao: string;
    valor: number;
    metodo: string;
    parcelas: number;
    taxaPct: number;
    valorParcela: number;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse("Body inválido", "BAD_REQUEST", 400);
  }

  const { clienteId, descricao, valor, metodo, parcelas, valorParcela } = body;
  if (!clienteId || !descricao || valor == null) {
    return errorResponse("clienteId, descricao e valor são obrigatórios", "BAD_REQUEST", 400);
  }

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) return errorResponse("Cliente não encontrado", "NOT_FOUND", 404);

  const publicDir = path.join(process.cwd(), "public");
  const logoPath = path.join(publicDir, "orcamento", "logo-si.png");
  const carimboPath = path.join(publicDir, "orcamento", "assinatura-carimbo.png");

  const doc = createElement(OrcamentoPDFDocument, {
    clienteNome: cliente.nome,
    clienteEmail: cliente.email,
    clienteTelefone: cliente.telefone,
    descricao,
    valor,
    metodo,
    parcelas,
    valorParcela,
    logoPath,
    carimboPath,
  });

  const buffer = await renderToBuffer(
    doc as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>
  );

  const nomeArquivo = `Si_${cliente.nome.replace(/[^a-zA-Z0-9À-ú ]/g, "").replace(/\s+/g, "_")}.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
