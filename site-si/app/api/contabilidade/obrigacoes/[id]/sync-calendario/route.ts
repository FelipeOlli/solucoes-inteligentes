import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";
import { upsertGoogleEventForObrigacao } from "@/lib/google-calendar";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const obrigacao = await prisma.obrigacaoContabil.findUnique({
    where: { id: (await params).id },
  });
  if (!obrigacao || !obrigacao.ativo) return notFound("Obrigação não encontrada.");

  let calendarioEventId = obrigacao.calendarioEventId;
  let syncedWithGoogle = false;
  try {
    const remote = await upsertGoogleEventForObrigacao(obrigacao);
    calendarioEventId = remote.eventId;
    syncedWithGoogle = true;
  } catch {
    // O calendário interno funciona mesmo sem conexão com Google.
    calendarioEventId = calendarioEventId || `contab-${obrigacao.id}`;
  }

  const updated = await prisma.obrigacaoContabil.update({
    where: { id: obrigacao.id },
    data: { calendarioEventId },
    select: {
      id: true,
      nome: true,
      proximoVencimento: true,
      calendarioEventId: true,
    },
  });

  return jsonResponse({ ...updated, syncedWithGoogle });
}
