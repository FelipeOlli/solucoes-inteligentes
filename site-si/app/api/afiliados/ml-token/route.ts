import { NextRequest } from "next/server";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, errorResponse } from "@/lib/api-response";
import { getMLToken } from "@/lib/afiliados/ml-auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  try {
    const token = await getMLToken();
    return jsonResponse({
      token,
      affiliateTag: process.env.ML_AFFILIATE_TAG ?? "",
      affiliateTool: process.env.ML_AFFILIATE_TOOL ?? "",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse(msg, "ML_AUTH_ERROR", 503);
  }
}
