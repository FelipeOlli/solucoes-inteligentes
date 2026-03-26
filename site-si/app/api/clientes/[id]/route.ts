import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import {
  jsonResponse,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  badRequest,
  errorResponse,
} from "@/lib/api-response";
import { parseClienteAddressFromBody } from "@/lib/cliente-address";

const clienteSelect = {
  id: true,
  nome: true,
  nomeContato: true,
  email: true,
  telefone: true,
  logradouro: true,
  bairro: true,
  cidade: true,
  uf: true,
  cep: true,
  observacoes: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: clienteSelect,
  });
  if (!cliente) return notFound();
  return jsonResponse(cliente);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const existing = await prisma.cliente.findUnique({ where: { id } });
  if (!existing) return notFound();

  try {
    const body = await request.json();
    const nome = String(body.nome || "").trim();
    const nomeContato = body.nomeContato != null ? String(body.nomeContato).trim() || null : null;
    const email = String(body.email || "").trim().toLowerCase();
    const telefone = String(body.telefone || "").trim();
    const addr = parseClienteAddressFromBody(body as Record<string, unknown>);
    const observacoes = body.observacoes != null ? String(body.observacoes).trim() || null : null;

    if (!nome || !email || !telefone) {
      return badRequest("Cliente, e-mail e telefone são obrigatórios");
    }

    const emailTaken = await prisma.cliente.findFirst({ where: { email, id: { not: id } } });
    if (emailTaken) return conflict("Já existe um cliente com este e-mail.");

    const telTaken = await prisma.cliente.findFirst({ where: { telefone, id: { not: id } } });
    if (telTaken) return conflict("Já existe um cliente com este telefone.");

    const cliente = await prisma.cliente.update({
      where: { id },
      data: { nome, nomeContato, email, telefone, ...addr, observacoes },
      select: clienteSelect,
    });
    return jsonResponse(cliente);
  } catch (e) {
    console.error(e);
    return errorResponse("Erro ao atualizar cliente", "INTERNAL_ERROR", 500);
  }
}
