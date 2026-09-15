import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createTokenDono, createTokenTecnico, setAuthCookie } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { checkLoginRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rate = checkLoginRateLimit(request);
  if (!rate.ok) {
    return errorResponse(
      `Muitas tentativas de login. Tente novamente em ${rate.retryAfter} segundos.`,
      "TOO_MANY_REQUESTS",
      429
    );
  }
  try {
    const body = await request.json();
    const { email, password } = body;
    if (!email || !password) {
      return errorResponse("E-mail e senha são obrigatórios", "BAD_REQUEST", 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      include: { tecnico: { select: { id: true, nome: true, ativo: true } } },
    });
    if (!user) {
      return errorResponse("E-mail ou senha inválidos.", "UNAUTHORIZED", 401);
    }

    const valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid) {
      return errorResponse("E-mail ou senha inválidos.", "UNAUTHORIZED", 401);
    }

    // mesma mensagem genérica de credencial inválida — não vaza se a conta existe
    if (!user.ativo) {
      return errorResponse("E-mail ou senha inválidos.", "UNAUTHORIZED", 401);
    }

    if (user.role === "TECNICO") {
      if (!user.tecnico || !user.tecnico.ativo) {
        return errorResponse("E-mail ou senha inválidos.", "UNAUTHORIZED", 401);
      }
      const token = await createTokenTecnico(user.id, user.tecnico.id);
      const res = jsonResponse({
        token,
        role: "tecnico",
        tecnico: { id: user.tecnico.id, nome: user.tecnico.nome },
      });
      setAuthCookie(res, token, 30 * 24 * 60 * 60); // 30d, igual à expiração do JWT do técnico
      return res;
    }

    const token = await createTokenDono(user.id);
    const res = jsonResponse({ token, role: "dono" });
    setAuthCookie(res, token, 7 * 24 * 60 * 60); // 7d, igual à expiração do JWT do dono
    return res;
  } catch {
    return errorResponse("Erro ao processar login", "INTERNAL_ERROR", 500);
  }
}
