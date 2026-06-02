export const runtime = "nodejs";

import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement, type JSXElementConstructor } from "react";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { unauthorized, forbidden, errorResponse } from "@/lib/api-response";
import { OrcamentoPDFDocument } from "@/lib/orcamento/pdf-template";

function toDataURI(filePath: string, mime: string): string {
  const data = fs.readFileSync(filePath);
  return `data:${mime};base64,${data.toString("base64")}`;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  let body: {
    clienteId?: string | null;
    descricao?: string | null;
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
  if (valor == null) {
    return errorResponse("valor é obrigatório", "BAD_REQUEST", 400);
  }

  let clienteNome = "", clienteEmail = "", clienteTelefone = "";
  if (clienteId) {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) return errorResponse("Cliente não encontrado", "NOT_FOUND", 404);
    clienteNome = cliente.nome;
    clienteEmail = cliente.email;
    clienteTelefone = cliente.telefone;
  }

  const publicDir = path.join(process.cwd(), "public");
  const logoDataURI = toDataURI(path.join(publicDir, "orcamento", "logo-si.png"), "image/png");
  const carimboDataURI = toDataURI(path.join(publicDir, "orcamento", "assinatura-carimbo.png"), "image/png");

  const doc = createElement(OrcamentoPDFDocument, {
    clienteNome,
    clienteEmail,
    clienteTelefone,
    descricao: descricao ?? "",
    valor,
    metodo,
    parcelas,
    valorParcela,
    logoPath: logoDataURI,
    carimboPath: carimboDataURI,
  });

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      doc as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>
    );
  } catch (err) {
    console.error("[orcamento/pdf] renderToBuffer falhou:", err);
    return errorResponse(
      `Falha ao renderizar PDF: ${err instanceof Error ? err.message : String(err)}`,
      "RENDER_ERROR",
      500
    );
  }

  const nomeBase = clienteNome
    ? clienteNome.replace(/[^a-zA-Z0-9À-ú ]/g, "").replace(/\s+/g, "_")
    : `Orcamento_${new Date().toISOString().slice(0, 10)}`;
  const nomeArquivo = `Si_${nomeBase}.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
