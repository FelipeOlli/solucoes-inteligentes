import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { criarServidorSI } from "@/lib/mcp/server";
import { validarChaveMcp, sincronizarChaveEnv } from "@/lib/mcp/chaves";

/**
 * Servidor MCP do site, via HTTP (Streamable HTTP), stateless.
 * Conector: POST https://<dominio>/mcp com `Authorization: Bearer <SI_MCP_TOKEN>`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-api-key, mcp-session-id, Last-Event-ID, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
};

function igual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

async function autorizado(req: NextRequest): Promise<boolean> {
  const authorization = req.headers.get("authorization") ?? "";
  const candidatos = [
    authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : authorization.trim(),
    req.headers.get("x-api-key")?.trim() ?? "",
  ].filter((t) => t.length > 0);

  // A chave legada (SI_MCP_TOKEN) vira um registro na tabela, revogável pela página.
  await sincronizarChaveEnv().catch(() => {});

  for (const t of candidatos) {
    if (await validarChaveMcp(t)) return true;
  }
  return false;
}

async function tratar(req: NextRequest): Promise<Response> {
  if (!(await autorizado(req))) {
    return NextResponse.json(
      { erro: "Token inválido ou ausente. Use: Authorization: Bearer <chave MCP>" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const accept = req.headers.get("accept") ?? "";
  if (req.method === "GET" && !accept.includes("text/event-stream")) {
    return NextResponse.json(
      { erro: "Use POST (JSON-RPC do protocolo MCP)." },
      { status: 405, headers: CORS_HEADERS }
    );
  }

  const server = criarServidorSI();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    // Responde JSON quando o cliente aceita; senão SSE.
    enableJsonResponse: accept.includes("application/json"),
    keepAliveMs: 1_000,
  });
  await server.connect(transport);

  // O SDK exige os dois tipos no Accept; clientes que mandam só um levariam 406.
  const headers = new Headers(req.headers);
  headers.set("accept", "application/json, text/event-stream");
  if (req.method === "POST") headers.set("content-type", "application/json");

  const body = req.method === "POST" ? await req.text() : undefined;
  const resposta = await transport.handleRequest(new Request(req.url, { method: req.method, headers, body }));
  for (const [chave, valor] of Object.entries(CORS_HEADERS)) resposta.headers.set(chave, valor);
  resposta.headers.set("Cache-Control", "no-store");
  return resposta;
}

export async function POST(req: NextRequest) {
  return tratar(req);
}

export async function GET(req: NextRequest) {
  return tratar(req);
}

export async function DELETE(req: NextRequest) {
  return tratar(req);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
