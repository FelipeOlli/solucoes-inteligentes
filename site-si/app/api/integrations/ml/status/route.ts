import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden } from "@/lib/api-response";
import { getMLToken } from "@/lib/afiliados/ml-auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const integration = await prisma.mLIntegration.findUnique({ where: { provider: "ml" } });
  if (!integration) return jsonResponse({ connected: false });

  // Testa se o token realmente funciona chamando /users/me
  try {
    const token = await getMLToken();
    const me = await fetch("https://api.mercadolibre.com/users/me", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    const meBody = await me.json();

    // Testa o endpoint de busca também
    const search = await fetch("https://api.mercadolibre.com/sites/MLB/search?q=notebook&limit=1", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchStatus = search.status;
    const searchBody = await search.json().catch(() => null);

    return jsonResponse({
      connected: true,
      expiryDate: integration.expiryDate ?? null,
      tokenOk: me.ok,
      mlUserId: meBody.id ?? null,
      mlNickname: meBody.nickname ?? null,
      searchStatus,
      searchError: !search.ok ? searchBody : null,
    });
  } catch (e) {
    return jsonResponse({ connected: true, tokenOk: false, error: String(e) });
  }
}
