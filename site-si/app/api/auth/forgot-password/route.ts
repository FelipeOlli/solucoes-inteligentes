import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonResponse, errorResponse, badRequest } from "@/lib/api-response";
import { checkForgotPasswordRateLimit } from "@/lib/rate-limit";
import { generateSecureToken, getExpiry } from "@/lib/password-reset-token";
import { sendPasswordResetEmail, isEmailConfigured } from "@/lib/email";

const SUCCESS_MESSAGE =
  "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Verifique também a pasta de spam.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return badRequest("Informe o e-mail.");
    }

    const rate = checkForgotPasswordRateLimit(request, email);
    if (!rate.ok) {
      return errorResponse(
        `Muitas solicitações. Tente novamente em ${rate.retryAfter} segundos.`,
        "TOO_MANY_REQUESTS",
        429
      );
    }

    if (!isEmailConfigured()) {
      return errorResponse(
        "Redefinição de senha temporariamente indisponível. Tente mais tarde.",
        "SERVICE_UNAVAILABLE",
        503
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const { raw, hash } = generateSecureToken();
      const expiresAt = getExpiry();

      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        prisma.passwordResetToken.create({
          data: { tokenHash: hash, userId: user.id, expiresAt },
        }),
      ]);

      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
      const resetLink = `${baseUrl}/login/redefinir-senha?token=${encodeURIComponent(raw)}`;

      const sendResult = await sendPasswordResetEmail(user.email, resetLink);
      if (!sendResult.ok) {
        return errorResponse(
          "Não foi possível enviar o e-mail. Tente mais tarde.",
          "EMAIL_ERROR",
          503
        );
      }
    }

    return jsonResponse({ message: SUCCESS_MESSAGE });
  } catch {
    return errorResponse("Erro ao processar solicitação.", "INTERNAL_ERROR", 500);
  }
}

