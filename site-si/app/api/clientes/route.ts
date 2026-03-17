import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, conflict, errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  const clientes = await prisma.cliente.findMany({
    where: q
      ? {
          OR: [
            { nome: { contains: q } },
            { nomeContato: { contains: q } },
            { email: { contains: q } },
            { telefone: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, nomeContato: true, email: true, telefone: true, endereco: true, observacoes: true, createdAt: true },
  });
  return jsonResponse(clientes);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  try {
    const body = await request.json();
    const nome = String(body.nome || "").trim();
    const nomeContato = body.nomeContato != null ? String(body.nomeContato).trim() || null : null;
    const email = String(body.email || "").trim().toLowerCase();
    const telefone = String(body.telefone || "").trim();
    const endereco = body.endereco != null ? String(body.endereco).trim() || null : null;
    const observacoes = body.observacoes != null ? String(body.observacoes).trim() || null : null;

    if (!nome || !email || !telefone) {
      return errorResponse("Cliente, e-mail e telefone são obrigatórios", "BAD_REQUEST", 400);
    }

    const existingEmail = await prisma.cliente.findUnique({ where: { email } });
    if (existingEmail) return conflict("Já existe um cliente com este e-mail.");

    const existingTel = await prisma.cliente.findUnique({ where: { telefone } });
    if (existingTel) return conflict("Já existe um cliente com este telefone.");

    const cliente = await prisma.cliente.create({
      data: { nome, nomeContato, email, telefone, endereco, observacoes },
    });
    return jsonResponse(
      { id: cliente.id, nome: cliente.nome, nomeContato: cliente.nomeContato, email: cliente.email, telefone: cliente.telefone, endereco: cliente.endereco, observacoes: cliente.observacoes, createdAt: cliente.createdAt },
      201
    );
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao criar cliente", "INTERNAL_ERROR", 500);
  }
}
