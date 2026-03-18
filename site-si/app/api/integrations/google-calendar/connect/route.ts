import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { forbidden, unauthorized } from "@/lib/api-response";
import { createGoogleOAuthState, getGoogleConnectUrl } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const state = createGoogleOAuthState();
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  const url = getGoogleConnectUrl(state);
  return NextResponse.redirect(url);
}

