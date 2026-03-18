import { prisma } from "@/lib/db";
import {
  deleteGoogleEvent,
  listGoogleEventsIncremental,
  upsertGoogleEventForServico,
} from "@/lib/google-calendar";

type SyncAction = "UPSERT" | "DELETE";

export async function enqueueServicoSync(servicoId: string, action: SyncAction, payload?: unknown) {
  await prisma.agendaSyncQueue.create({
    data: {
      servicoId,
      action,
      payload: payload ? JSON.stringify(payload) : null,
    },
  });
}

function shouldDeleteRemote(servico: {
  statusAtual: string;
  dataAgendamento: Date | null;
}) {
  return servico.statusAtual === "CANCELADO" || !servico.dataAgendamento;
}

export async function processAgendaSyncQueue(limit = 25) {
  const integration = await prisma.googleCalendarIntegration.findUnique({
    where: { provider: "google" },
    select: { id: true },
  });
  if (!integration) return { processed: 0, skipped: true };

  const jobs = await prisma.agendaSyncQueue.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { servico: true },
  });
  let processed = 0;

  for (const job of jobs) {
    try {
      const servico = job.servico;
      if (job.action === "DELETE" || shouldDeleteRemote(servico)) {
        if (servico.googleEventId) {
          await deleteGoogleEvent(servico.googleEventId);
        }
        await prisma.servico.update({
          where: { id: servico.id },
          data: {
            googleEventId: null,
            googleEtag: null,
            googleUpdatedAt: null,
            googleSyncState: "IN_SYNC",
            googleLastError: null,
          },
        });
      } else {
        const mapped = await upsertGoogleEventForServico(servico);
        await prisma.servico.update({
          where: { id: servico.id },
          data: {
            googleEventId: mapped.eventId,
            googleEtag: mapped.etag,
            googleUpdatedAt: mapped.updatedAt,
            googleSyncState: "IN_SYNC",
            googleLastError: null,
          },
        });
      }
      await prisma.agendaSyncQueue.update({
        where: { id: job.id },
        data: { processedAt: new Date(), lastError: null },
      });
      processed += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.agendaSyncQueue.update({
        where: { id: job.id },
        data: {
          attempts: { increment: 1 },
          lastError: msg.slice(0, 1000),
        },
      });
      await prisma.servico.update({
        where: { id: job.servicoId },
        data: {
          googleSyncState: "ERROR",
          googleLastError: msg.slice(0, 1000),
        },
      });
    }
  }
  return { processed, skipped: false };
}

function parseGoogleDateTime(start?: { dateTime?: string; date?: string }): Date | null {
  if (start?.dateTime) return new Date(start.dateTime);
  if (start?.date) return new Date(`${start.date}T00:00:00.000Z`);
  return null;
}

export async function syncFromGoogleIncremental() {
  const integration = await prisma.googleCalendarIntegration.findUnique({ where: { provider: "google" } });
  if (!integration) return { synced: 0, skipped: true };

  let data;
  try {
    data = await listGoogleEventsIncremental({ syncToken: integration.nextSyncToken });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // On invalid sync token, fallback to full window sync
    if (!msg.includes("410")) throw err;
    data = await listGoogleEventsIncremental({ syncToken: null });
  }

  let synced = 0;
  for (const item of data.items) {
    const eventId = item.id;
    if (!eventId) continue;
    const privateProps = item.extendedProperties?.private ?? {};
    const servicoIdFromProp = privateProps.servicoId;
    const servico = servicoIdFromProp
      ? await prisma.servico.findUnique({ where: { id: servicoIdFromProp } })
      : await prisma.servico.findFirst({ where: { googleEventId: eventId } });
    if (!servico) continue;

    if (item.status === "cancelled") {
      await prisma.servico.update({
        where: { id: servico.id },
        data: {
          dataAgendamento: null,
          googleEventId: eventId,
          googleEtag: item.etag ?? null,
          googleUpdatedAt: item.updated ? new Date(item.updated) : null,
          googleSyncState: "IN_SYNC",
          googleLastError: null,
        },
      });
      synced += 1;
      continue;
    }

    const mappedStart = parseGoogleDateTime(item.start);
    await prisma.servico.update({
      where: { id: servico.id },
      data: {
        dataAgendamento: mappedStart,
        googleEventId: eventId,
        googleEtag: item.etag ?? null,
        googleUpdatedAt: item.updated ? new Date(item.updated) : null,
        googleSyncState: "IN_SYNC",
        googleLastError: null,
      },
    });
    synced += 1;
  }

  await prisma.googleCalendarIntegration.update({
    where: { id: integration.id },
    data: {
      nextSyncToken: data.nextSyncToken,
      lastSyncedAt: new Date(),
    },
  });

  return { synced, skipped: false };
}

