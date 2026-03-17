import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { jsonResponse, errorResponse, badRequest } from "@/lib/api-response";
import { checkResetPasswordRateLimit } from "@/lib/rate-limit";
import { hashToken } from "@/lib/password-reset-token";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  const rate = checkResetPasswordRateLimit(request);
  if (!rate.ok) {
    return errorResponse(
      `Muitas tentativas. Tente novamente em ${rate.retryAfter} segundos.`,
      "TOO_MANY_REQUESTS",
      429
    );
  }

  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token) {
      return badRequest("Token de redefinição é obrigatório.");
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return badRequest(`A nova senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`);
    }

    const tokenHash = hashToken(token);

    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return errorResponse("Link inválido ou já utilizado. Solicite um novo link.", "INVALID_TOKEN", 400);
    }
    if (record.usedAt) {
      return errorResponse("Este link já foi utilizado. Solicite um novo link.", "TOKEN_USED", 400);
    }
    if (new Date() > record.expiresAt) {
      return errorResponse("Este link expirou. Solicite um novo link.", "TOKEN_EXPIRED", 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return jsonResponse({ message: "Senha alterada com sucesso. Faça login com a nova senha." });
  } catch {
    return errorResponse("Erro ao redefinir senha.", "INTERNAL_ERROR", 500);
  }
}
