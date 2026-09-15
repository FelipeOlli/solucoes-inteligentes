import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const DEFAULT_SECRET = "default-secret-change-in-production-min-32-chars";

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET || DEFAULT_SECRET;
  if (process.env.NODE_ENV === "production" && (raw === DEFAULT_SECRET || raw.length < 32)) {
    throw new Error("JWT_SECRET deve ser definido e ter pelo menos 32 caracteres em produção. Veja SEGURANCA.md.");
  }
  return new TextEncoder().encode(raw);
}

const SECRET = getSecret();

export type PayloadDono = { role: "dono"; userId: string };
export type PayloadCliente = { role: "cliente"; id_cliente: string };
export type PayloadTecnico = { role: "tecnico"; userId: string; tecnicoId: string };
export type Payload = PayloadDono | PayloadCliente | PayloadTecnico;

export async function createTokenDono(userId: string): Promise<string> {
  return new SignJWT({ role: "dono", userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(SECRET);
}

export async function createTokenCliente(id_cliente: string): Promise<string> {
  return new SignJWT({ role: "cliente", id_cliente })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("90d")
    .setIssuedAt()
    .sign(SECRET);
}

export async function createTokenTecnico(userId: string, tecnicoId: string): Promise<string> {
  return new SignJWT({ role: "tecnico", userId, tecnicoId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<Payload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as Payload;
  } catch {
    return null;
  }
}

export async function getAuthFromRequest(request: Request): Promise<Payload | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) return verifyToken(token);

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("si_token")?.value;
  if (cookieToken) return verifyToken(cookieToken);

  return null;
}

export function isDono(p: Payload): p is PayloadDono {
  return p.role === "dono";
}

export function isCliente(p: Payload): p is PayloadCliente {
  return p.role === "cliente";
}

export function isTecnico(p: Payload): p is PayloadTecnico {
  return p.role === "tecnico";
}

/**
 * Popula o cookie httpOnly `si_token` na resposta, para que rotas que não
 * podem levar header Authorization (ex.: <img src="/uploads/...">) consigam
 * autenticar via getAuthFromRequest (que já faz fallback para este cookie).
 */
export function setAuthCookie(res: NextResponse, token: string, maxAgeSeconds: number) {
  res.cookies.set("si_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set("si_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
