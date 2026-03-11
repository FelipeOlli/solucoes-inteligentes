import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createTokenCliente } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return errorResponse("Token é obrigatório", "BAD_REQUEST", 400);
  }

  const clientToken = await prisma.clientToken.findUnique({
    where: { token },
    include: { cliente: true },
  });

  if (!clientToken) {
    return errorResponse("Link inválido ou expirado", "UNAUTHORIZED", 401);
  }

  const jwt = await createTokenCliente(clientToken.clienteId);
  return jsonResponse({
    token: jwt,
    role: "cliente",
    cliente: { id: clientToken.cliente.id, nome: clientToken.cliente.nome },
  });
}
