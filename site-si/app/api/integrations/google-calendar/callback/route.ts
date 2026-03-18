import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeCodeForTokens, fetchGooglePrimaryCalendarEmail, startGoogleCalendarWatch } from "@/lib/google-calendar";

function getRedirectBase() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const base = getRedirectBase();

  if (error) {
    return NextResponse.redirect(`${base}/dashboard/agenda?google=error&reason=${encodeURIComponent(error)}`);
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value;
  cookieStore.delete("google_oauth_state");
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${base}/dashboard/agenda?google=error&reason=state_invalid`);
  }

  try {
    const token = await exchangeCodeForTokens(code);
    const expiryDate = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null;
    const accountEmail = await fetchGooglePrimaryCalendarEmail(token.access_token);

    await prisma.googleCalendarIntegration.upsert({
      where: { provider: "google" },
      create: {
        provider: "google",
        accountEmail,
        calendarId: "primary",
        accessToken: token.access_token,
        refreshToken: token.refresh_token || "",
        tokenType: token.token_type ?? null,
        scope: token.scope ?? null,
        expiryDate,
      },
      update: {
        accountEmail,
        calendarId: "primary",
        accessToken: token.access_token,
        refreshToken: token.refresh_token || undefined,
        tokenType: token.token_type ?? null,
        scope: token.scope ?? null,
        expiryDate,
      },
    });

    // Best effort: cria assinatura webhook, se falhar mantém integração conectada.
    try {
      await startGoogleCalendarWatch();
    } catch (watchErr) {
      console.warn("Falha ao iniciar watch do Google Calendar:", watchErr);
    }

    return NextResponse.redirect(`${base}/dashboard/agenda?google=connected`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(`${base}/dashboard/agenda?google=error&reason=${encodeURIComponent(msg.slice(0, 120))}`);
  }
}

