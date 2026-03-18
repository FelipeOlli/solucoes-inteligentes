import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncFromGoogleIncremental } from "@/lib/agenda-sync";

export async function POST(request: NextRequest) {
  const channelId = request.headers.get("x-goog-channel-id");
  const resourceId = request.headers.get("x-goog-resource-id");
  const resourceState = request.headers.get("x-goog-resource-state");

  const integration = await prisma.googleCalendarIntegration.findUnique({
    where: { provider: "google" },
    select: { watchChannelId: true, watchResourceId: true },
  });
  if (!integration?.watchChannelId || !integration.watchResourceId) {
    return new NextResponse(null, { status: 204 });
  }
  if (channelId !== integration.watchChannelId || resourceId !== integration.watchResourceId) {
    return new NextResponse(null, { status: 202 });
  }

  // sync can be skipped for "sync" initial ping, but harmless to run.
  if (resourceState !== "sync") {
    await syncFromGoogleIncremental().catch((err) => {
      console.error("Falha ao sincronizar webhook Google:", err);
    });
  }

  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  return new NextResponse("ok", { status: 200 });
}

