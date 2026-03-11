import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-in-production-min-32-chars"
);

export type PayloadDono = { role: "dono"; userId: string };
export type PayloadCliente = { role: "cliente"; id_cliente: string };
export type Payload = PayloadDono | PayloadCliente;

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
