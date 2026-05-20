import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const integration = await prisma.mLIntegration.findUnique({ where: { provider: "ml" } });
  return jsonResponse({
    connected: !!integration,
    expiryDate: integration?.expiryDate ?? null,
  });
}
