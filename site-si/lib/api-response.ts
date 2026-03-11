import { NextResponse } from "next/server";

export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ code, message }, { status });
}

export function unauthorized() {
  return errorResponse("Token ausente ou inválido", "UNAUTHORIZED", 401);
}

export function forbidden() {
  return errorResponse("Acesso não permitido para este perfil", "FORBIDDEN", 403);
}

export function notFound(msg = "Recurso não encontrado") {
  return errorResponse(msg, "NOT_FOUND", 404);
}

export function conflict(msg: string) {
  return errorResponse(msg, "CONFLICT", 409);
}

export function badRequest(msg: string) {
  return errorResponse(msg, "BAD_REQUEST", 400);
}
