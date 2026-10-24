import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const DEFAULT_SECRET = "default-secret-change-in-production-min-32-chars";
/** Valor usado só durante o `next build` no Dockerfile; nunca é aceito em runtime. */
export const BUILD_ONLY_SECRET = "build-only-secret-never-used-at-runtime-0000";
/** Valores que já estiveram públicos no repositório — rejeitados em produção. */
const SECRETS_CONHECIDOS = new Set([
  DEFAULT_SECRET,
  BUILD_ONLY_SECRET,
  "build-secret-at-least-32-characters-long-123456",
  "your-secret-at-least-32-chars-long",
]);

let cachedSecret: Uint8Array | null = null;

/**
 * Lido sob demanda (não no import do módulo), para o `next build` não precisar
 * do segredo real. Em produção, falha se o segredo estiver ausente, curto ou
 * for um valor conhecido/público.
 */
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const raw = process.env.JWT_SECRET || DEFAULT_SECRET;
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (
    process.env.NODE_ENV === "production" &&
    !isBuildPhase &&
    (SECRETS_CONHECIDOS.has(raw) || raw.length < 32)
  ) {
    throw new Error(
      "JWT_SECRET deve ser definido no ambiente, ter pelo menos 32 caracteres e não pode ser um valor padrão/público. Veja SEGURANCA.md."
    );
  }
  cachedSecret = new TextEncoder().encode(raw);
  return cachedSecret;
}

export type PayloadDono = { role: "dono"; userId: string };
export type PayloadCliente = { role: "cliente"; id_cliente: string };
export type PayloadTecnico = { role: "tecnico"; userId: string; tecnicoId: string };
export type Payload = PayloadDono | PayloadCliente | PayloadTecnico;

export async function createTokenDono(userId: string): Promise<string> {
  return new SignJWT({ role: "dono", userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(getSecret());
}

export async function createTokenCliente(id_cliente: string): Promise<string> {
  return new SignJWT({ role: "cliente", id_cliente })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("90d")
    .setIssuedAt()
    .sign(getSecret());
}

export async function createTokenTecnico(userId: string, tecnicoId: string): Promise<string> {
  return new SignJWT({ role: "tecnico", userId, tecnicoId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<Payload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
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
