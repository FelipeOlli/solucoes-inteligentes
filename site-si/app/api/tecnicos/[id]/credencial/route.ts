import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, notFound, badRequest, conflict, errorResponse } from "@/lib/api-response";

/**
 * POST /api/tecnicos/[id]/credencial
 * Cria o login (User com role TECNICO) e vincula ao Tecnico. Só o dono
 * pode criar; um técnico já com credencial recebe 409 — para trocar senha,
 * seria um endpoint de reset separado (fora do escopo desta fase).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  try {
    const tecnico = await prisma.tecnico.findUnique({ where: { id } });
    if (!tecnico) return notFound("Técnico não encontrado.");
    if (tecnico.userId) return conflict("Este técnico já tem uma credencial de acesso.");

    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email) return badRequest("email é obrigatório.");
    if (password.length < 8) return badRequest("A senha deve ter pelo menos 8 caracteres.");

    const emailEmUso = await prisma.user.findUnique({ where: { email } });
    if (emailEmUso) return conflict("Já existe uma conta com este e-mail.");

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, passwordHash, role: "TECNICO" },
    });
    await prisma.tecnico.update({ where: { id }, data: { userId: user.id } });

    return jsonResponse({ email: user.email }, 201);
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao criar credencial", "INTERNAL_ERROR", 500);
  }
}

/**
 * DELETE /api/tecnicos/[id]/credencial
 * Remove o vínculo de login sem apagar o User (evita reaproveitar o e-mail
 * por engano). Desativa o User também, então mesmo um token antigo cai em
 * 403 no próximo requireTecnico.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  try {
    const tecnico = await prisma.tecnico.findUnique({ where: { id } });
    if (!tecnico) return notFound("Técnico não encontrado.");
    if (!tecnico.userId) return badRequest("Este técnico não tem credencial de acesso.");

    await prisma.$transaction([
      prisma.user.update({ where: { id: tecnico.userId }, data: { ativo: false } }),
      prisma.tecnico.update({ where: { id }, data: { userId: null } }),
    ]);

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao remover credencial", "INTERNAL_ERROR", 500);
  }
}
