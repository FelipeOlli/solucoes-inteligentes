import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono, isTecnico, type PayloadDono } from "@/lib/auth";
import { unauthorized, forbidden, notFound } from "@/lib/api-response";

type GuardOk<T> = { ok: true } & T;
type GuardFail = { ok: false; res: Response };

/** Exige role dono. Padroniza o `if (!auth || !isDono(auth))` repetido em cada handler. */
export async function requireDono(
  request: Request
): Promise<GuardOk<{ auth: PayloadDono }> | GuardFail> {
  const auth = await getAuthFromRequest(request);
  if (!auth) return { ok: false, res: unauthorized() };
  if (!isDono(auth)) return { ok: false, res: forbidden() };
  return { ok: true, auth };
}

/**
 * Exige role técnico com conta ativa. Confere User.ativo e Tecnico.ativo no
 * banco a cada request — é o que torna a revogação instantânea mesmo com
 * JWT stateless (desativar o técnico na tela do dono corta o acesso na
 * próxima chamada, sem precisar de blacklist de token).
 */
export async function requireTecnico(
  request: Request
): Promise<GuardOk<{ tecnicoId: string; nome: string }> | GuardFail> {
  const auth = await getAuthFromRequest(request);
  if (!auth) return { ok: false, res: unauthorized() };
  if (!isTecnico(auth)) return { ok: false, res: forbidden() };

  const tecnico = await prisma.tecnico.findUnique({
    where: { id: auth.tecnicoId },
    select: { id: true, nome: true, ativo: true, userId: true, user: { select: { ativo: true } } },
  });

  if (
    !tecnico ||
    !tecnico.ativo ||
    tecnico.userId !== auth.userId ||
    !tecnico.user?.ativo
  ) {
    return { ok: false, res: forbidden() };
  }

  return { ok: true, tecnicoId: tecnico.id, nome: tecnico.nome };
}

/**
 * Como requireTecnico, mas também confere que o serviço pedido está
 * atribuído a este técnico. Nunca filtrar por tecnicoId vindo de body ou
 * query string — sempre a partir do token.
 */
export async function requireServicoDoTecnico(
  request: Request,
  servicoId: string
): Promise<GuardOk<{ tecnicoId: string; nome: string }> | GuardFail> {
  const guard = await requireTecnico(request);
  if (!guard.ok) return guard;

  const servico = await prisma.servico.findUnique({
    where: { id: servicoId },
    select: { tecnicoId: true },
  });
  if (!servico) return { ok: false, res: notFound() };
  if (servico.tecnicoId !== guard.tecnicoId) return { ok: false, res: forbidden() };

  return guard;
}
