import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { forbidden, unauthorized } from "@/lib/api-response";
import { getMLConnectUrl } from "@/lib/afiliados/ml-auth";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("ml_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(getMLConnectUrl(state));
}
