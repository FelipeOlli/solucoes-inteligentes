import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { forbidden, jsonResponse, unauthorized, badRequest } from "@/lib/api-response";
import { processAgendaSyncQueue, syncFromGoogleIncremental } from "@/lib/agenda-sync";
import { startGoogleCalendarWatch, stopGoogleCalendarWatch } from "@/lib/google-calendar";

async function requireDono(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();
  return null;
}

export async function GET(request: NextRequest) {
  const denied = await requireDono(request);
  if (denied) return denied;

  const integration = await prisma.googleCalendarIntegration.findUnique({
    where: { provider: "google" },
    select: {
      provider: true,
      accountEmail: true,
      calendarId: true,
      expiryDate: true,
      watchChannelId: true,
      watchResourceId: true,
      watchExpiresAt: true,
      lastSyncedAt: true,
      nextSyncToken: true,
      updatedAt: true,
    },
  });
  return jsonResponse({
    connected: Boolean(integration),
    integration,
  });
}

export async function POST(request: NextRequest) {
  const denied = await requireDono(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim();

  if (action === "resync") {
    const inbound = await syncFromGoogleIncremental().catch((err) => ({
      error: err instanceof Error ? err.message : String(err),
    }));
    const outbound = await processAgendaSyncQueue().catch((err) => ({
      error: err instanceof Error ? err.message : String(err),
    }));
    return jsonResponse({ ok: true, inbound, outbound });
  }

  if (action === "restart_watch") {
    await stopGoogleCalendarWatch().catch(() => undefined);
    const integration = await startGoogleCalendarWatch();
    return jsonResponse({ ok: true, watchExpiresAt: integration.watchExpiresAt });
  }

  return badRequest("Ação inválida. Use: resync | restart_watch");
}

export async function DELETE(request: NextRequest) {
  const denied = await requireDono(request);
  if (denied) return denied;

  await stopGoogleCalendarWatch().catch(() => undefined);
  await prisma.googleCalendarIntegration.deleteMany({ where: { provider: "google" } });
  return jsonResponse({ ok: true });
}

