import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createTokenDono } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    if (!email || !password) {
      return errorResponse("E-mail e senha são obrigatórios", "BAD_REQUEST", 400);
    }

    const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
    if (!user) {
      return errorResponse("E-mail ou senha inválidos.", "UNAUTHORIZED", 401);
    }

    const valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid) {
      return errorResponse("E-mail ou senha inválidos.", "UNAUTHORIZED", 401);
    }

    const token = await createTokenDono(user.id);
    return jsonResponse({ token, role: "dono" });
  } catch {
    return errorResponse("Erro ao processar login", "INTERNAL_ERROR", 500);
  }
}
