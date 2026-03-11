import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, notFound } from "@/lib/api-response";

async function getServicoId(idOrCodigo: string): Promise<string | null> {
  const byId = await prisma.servico.findUnique({ where: { id: idOrCodigo }, select: { id: true } });
  if (byId) return byId.id;
  const byCodigo = await prisma.servico.findUnique({ where: { codigo: idOrCodigo }, select: { id: true } });
  return byCodigo?.id ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const id = await getServicoId((await params).id);
  if (!id) return notFound();

  const servico = await prisma.servico.findUnique({
    where: { id },
    select: { clienteId: true },
  });
  if (!servico) return notFound();

  let clientToken = await prisma.clientToken.findFirst({
    where: { clienteId: servico.clienteId },
    orderBy: { createdAt: "desc" },
  });

  if (!clientToken) {
    const token = nanoid(48);
    clientToken = await prisma.clientToken.create({
      data: { token, clienteId: servico.clienteId },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const url = `${baseUrl}/acompanhar?token=${clientToken.token}`;
  return jsonResponse({ url, token: clientToken.token });
}
