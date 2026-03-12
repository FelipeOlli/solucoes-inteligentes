import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, errorResponse, conflict } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
  const where = q ? { email: { contains: q } } : undefined;

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, createdAt: true },
  });

  return jsonResponse(users);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return errorResponse("E-mail e senha são obrigatórios", "BAD_REQUEST", 400);
    }

    if (password.length < 6) {
      return errorResponse("A senha deve ter pelo menos 6 caracteres.", "BAD_REQUEST", 400);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return conflict("Já existe um usuário com este e-mail.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });

    return jsonResponse(user, 201);
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao criar usuário", "INTERNAL_ERROR", 500);
  }
}

