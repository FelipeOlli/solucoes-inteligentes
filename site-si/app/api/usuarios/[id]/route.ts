import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, errorResponse, conflict, notFound, badRequest } from "@/lib/api-response";

const OWNER_EMAIL = "dono@solucoesinteligentes.com";
type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return notFound("Usuário não encontrado.");
    if (existing.email === OWNER_EMAIL) {
      return badRequest("O usuário dono só pode ser alterado diretamente no código.");
    }

    const body = await request.json();
    const email = body.email != null ? String(body.email).trim().toLowerCase() : undefined;
    const password = body.password != null ? String(body.password) : undefined;

    if (!email && !password) {
      return badRequest("Informe e-mail ou senha para atualizar.");
    }

    const data: { email?: string; passwordHash?: string } = {};

    if (email) {
      if (email === OWNER_EMAIL) {
        return badRequest("Este e-mail é reservado ao usuário dono.");
      }
      const emailInUse = await prisma.user.findUnique({ where: { email } });
      if (emailInUse && emailInUse.id !== id) {
        return conflict("Já existe um usuário com este e-mail.");
      }
      data.email = email;
    }

    if (password != null) {
      if (password.length < 6) {
        return badRequest("A senha deve ter pelo menos 6 caracteres.");
      }
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, createdAt: true },
    });

    return jsonResponse(updated);
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao atualizar usuário", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(_request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return notFound("Usuário não encontrado.");
    if (existing.email === OWNER_EMAIL) {
      return badRequest("O usuário dono não pode ser excluído.");
    }

    await prisma.user.delete({ where: { id } });
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao excluir usuário", "INTERNAL_ERROR", 500);
  }
}

