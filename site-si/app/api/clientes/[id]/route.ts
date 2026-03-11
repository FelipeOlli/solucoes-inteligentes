import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, notFound } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, telefone: true, endereco: true, createdAt: true, updatedAt: true },
  });
  if (!cliente) return notFound();
  return jsonResponse(cliente);
}
