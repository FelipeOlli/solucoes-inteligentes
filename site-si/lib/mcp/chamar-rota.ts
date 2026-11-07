import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createTokenDono } from "@/lib/auth";

type Params = Promise<Record<string, string>>;
type Handler = (req: NextRequest, ctx: { params: Params }) => Promise<Response> | Response;

export type ChamadaRota = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  /** Caminho já com os ids resolvidos, ex.: /api/servicos/abc/status */
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  /** Parâmetros dinâmicos da rota, ex.: { id: "abc" } */
  params?: Record<string, string>;
};

let cache: { token: string; expira: number } | null = null;

/** JWT do primeiro dono ativo, reaproveitado até perto de expirar (7d). */
async function tokenDono(): Promise<string> {
  if (cache && cache.expira > Date.now()) return cache.token;
  const dono = await prisma.user.findFirst({
    where: { role: "DONO", ativo: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!dono) throw new Error("Nenhum usuário dono ativo encontrado para o MCP.");
  const token = await createTokenDono(dono.id);
  cache = { token, expira: Date.now() + 6 * 24 * 60 * 60 * 1000 };
  return token;
}

/**
 * Executa um route handler existente em processo, como se o dono tivesse
 * chamado a API. Reaproveita toda a regra de negócio das rotas.
 */
export async function chamarRota(handler: Handler, c: ChamadaRota): Promise<{ status: number; json: unknown }> {
  const url = new URL(c.path, "http://localhost");
  for (const [k, v] of Object.entries(c.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const headers = new Headers({ authorization: `Bearer ${await tokenDono()}` });
  let body: string | undefined;
  if (c.body !== undefined && c.method !== "GET") {
    headers.set("content-type", "application/json");
    body = JSON.stringify(c.body);
  }
  const req = new NextRequest(url, { method: c.method, headers, body });
  const res = await handler(req, { params: Promise.resolve(c.params ?? {}) });
  const texto = await res.text();
  let json: unknown = texto;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    /* resposta não-JSON: devolve o texto */
  }
  return { status: res.status, json };
}
