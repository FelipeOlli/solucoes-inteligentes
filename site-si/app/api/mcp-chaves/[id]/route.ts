import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireDono } from "@/lib/guards";
import { jsonResponse, notFound } from "@/lib/api-response";

/** Revoga a chave (mantém o registro para histórico). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDono(request);
  if (!guard.ok) return guard.res;

  const { id } = await params;
  const existente = await prisma.chaveMcp.findUnique({ where: { id }, select: { id: true } });
  if (!existente) return notFound();

  await prisma.chaveMcp.update({ where: { id }, data: { revogadaEm: new Date() } });
  return jsonResponse({ ok: true });
}
