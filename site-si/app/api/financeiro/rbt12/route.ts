import { NextRequest } from "next/server";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden } from "@/lib/api-response";
import { obterRbt12 } from "@/lib/rbt12";

/**
 * RBT12 para pré-preencher a calculadora de precificação — ver [[obterRbt12]].
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  return jsonResponse(await obterRbt12());
}
