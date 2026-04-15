import { randomUUID } from "crypto";
import type { GoogleCalendarIntegration, ObrigacaoContabil, Servico } from "@prisma/client";
import { prisma } from "@/lib/db";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";
const GOOGLE_OAUTH_SCOPE = "https://www.googleapis.com/auth/calendar";

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GoogleEvent = {
  id?: string;
  etag?: string;
  status?: string;
  updated?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
};

function getGoogleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Variáveis GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI são obrigatórias.");
  }
  return { clientId, clientSecret, redirectUri };
}

function asUtcISOString(d: Date | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toISOString();
}

function buildServicoSummary(servico: Pick<Servico, "codigo" | "descricao">): string {
  return `${servico.codigo} - ${servico.descricao.slice(0, 60)}`;
}

function buildObrigacaoSummary(obrigacao: Pick<ObrigacaoContabil, "nome" | "tipo">): string {
  return `Contabilidade: ${obrigacao.nome} (${obrigacao.tipo})`;
}

export function createGoogleOAuthState(): string {
  return randomUUID();
}

export function getGoogleConnectUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: GOOGLE_OAUTH_SCOPE,
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = getGoogleEnv();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha ao trocar code por token: ${txt}`);
  }
  return (await res.json()) as TokenResponse;
}

async function refreshAccessToken(integration: GoogleCalendarIntegration): Promise<GoogleCalendarIntegration> {
  const { clientId, clientSecret } = getGoogleEnv();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: integration.refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha ao renovar token do Google: ${txt}`);
  }
  const token = (await res.json()) as TokenResponse;
  const expiryDate = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : integration.expiryDate;
  return prisma.googleCalendarIntegration.update({
    where: { id: integration.id },
    data: {
      accessToken: token.access_token,
      tokenType: token.token_type ?? integration.tokenType,
      scope: token.scope ?? integration.scope,
      expiryDate: expiryDate ?? null,
    },
  });
}

export async function getGoogleIntegration() {
  return prisma.googleCalendarIntegration.findUnique({ where: { provider: "google" } });
}

export async function getValidGoogleAccessToken(): Promise<{ integration: GoogleCalendarIntegration; accessToken: string }> {
  const integration = await getGoogleIntegration();
  if (!integration) throw new Error("Google Agenda não conectado.");
  const expiry = integration.expiryDate ? new Date(integration.expiryDate).getTime() : 0;
  const needsRefresh = !expiry || Date.now() > expiry - 60_000;
  if (!needsRefresh) return { integration, accessToken: integration.accessToken };
  const refreshed = await refreshAccessToken(integration);
  return { integration: refreshed, accessToken: refreshed.accessToken };
}

async function googleRequest<T>(
  method: string,
  path: string,
  accessToken: string,
  query?: Record<string, string>,
  body?: unknown
): Promise<T> {
  const url = new URL(`${GOOGLE_CALENDAR_BASE}${path}`);
  Object.entries(query || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Google Calendar API ${method} ${path} falhou: ${txt}`);
  }
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

export async function fetchGooglePrimaryCalendarEmail(accessToken: string): Promise<string | null> {
  const data = await googleRequest<{ items?: Array<{ id: string; summary?: string }> }>(
    "GET",
    "/users/me/calendarList",
    accessToken
  );
  const primary = data.items?.find((c) => c.id === "primary");
  return primary?.summary ?? null;
}

export async function upsertGoogleEventForServico(servico: Servico): Promise<{
  eventId: string;
  etag: string | null;
  updatedAt: Date | null;
}> {
  const { integration, accessToken } = await getValidGoogleAccessToken();
  if (!servico.dataAgendamento) throw new Error("Serviço sem dataAgendamento não pode sincronizar evento.");
  const start = new Date(servico.dataAgendamento);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const eventBody: GoogleEvent = {
    summary: buildServicoSummary(servico),
    description: `Serviço ${servico.codigo}\n\n${servico.descricao}`,
    start: { dateTime: asUtcISOString(start) || undefined, timeZone: "America/Sao_Paulo" },
    end: { dateTime: asUtcISOString(end) || undefined, timeZone: "America/Sao_Paulo" },
    extendedProperties: {
      private: { servicoId: servico.id, codigo: servico.codigo },
    },
  };

  let event: GoogleEvent;
  if (servico.googleEventId) {
    event = await googleRequest<GoogleEvent>(
      "PATCH",
      `/calendars/${encodeURIComponent(integration.calendarId)}/events/${encodeURIComponent(servico.googleEventId)}`,
      accessToken,
      undefined,
      eventBody
    );
  } else {
    event = await googleRequest<GoogleEvent>(
      "POST",
      `/calendars/${encodeURIComponent(integration.calendarId)}/events`,
      accessToken,
      undefined,
      eventBody
    );
  }
  if (!event.id) throw new Error("Google retornou evento sem id.");
  return {
    eventId: event.id,
    etag: event.etag ?? null,
    updatedAt: event.updated ? new Date(event.updated) : null,
  };
}

export async function upsertGoogleEventForObrigacao(
  obrigacao: Pick<ObrigacaoContabil, "id" | "nome" | "tipo" | "proximoVencimento" | "calendarioEventId">,
): Promise<{ eventId: string }> {
  const { integration, accessToken } = await getValidGoogleAccessToken();
  const start = new Date(obrigacao.proximoVencimento);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const eventBody: GoogleEvent = {
    summary: buildObrigacaoSummary(obrigacao),
    description: `Obrigação contábil ${obrigacao.tipo}\nVencimento: ${obrigacao.proximoVencimento.toLocaleDateString("pt-BR")}`,
    start: { dateTime: asUtcISOString(start) || undefined, timeZone: "America/Sao_Paulo" },
    end: { dateTime: asUtcISOString(end) || undefined, timeZone: "America/Sao_Paulo" },
    extendedProperties: {
      private: { obrigacaoContabilId: obrigacao.id, tipo: obrigacao.tipo },
    },
  };

  let event: GoogleEvent;
  if (obrigacao.calendarioEventId) {
    event = await googleRequest<GoogleEvent>(
      "PATCH",
      `/calendars/${encodeURIComponent(integration.calendarId)}/events/${encodeURIComponent(obrigacao.calendarioEventId)}`,
      accessToken,
      undefined,
      eventBody
    );
  } else {
    event = await googleRequest<GoogleEvent>(
      "POST",
      `/calendars/${encodeURIComponent(integration.calendarId)}/events`,
      accessToken,
      undefined,
      eventBody
    );
  }

  if (!event.id) throw new Error("Google retornou evento sem id.");
  return { eventId: event.id };
}

export async function deleteGoogleEvent(eventId: string): Promise<void> {
  const { integration, accessToken } = await getValidGoogleAccessToken();
  try {
    await googleRequest(
      "DELETE",
      `/calendars/${encodeURIComponent(integration.calendarId)}/events/${encodeURIComponent(eventId)}`,
      accessToken
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 404 on delete should not block sync
    if (!msg.includes("404")) throw err;
  }
}

export async function listGoogleEventsIncremental(params: {
  syncToken?: string | null;
  timeMin?: string;
  timeMax?: string;
}) {
  const { integration, accessToken } = await getValidGoogleAccessToken();
  const query: Record<string, string> = {
    singleEvents: "true",
    showDeleted: "true",
    maxResults: "2500",
  };
  if (params.syncToken) query.syncToken = params.syncToken;
  else {
    query.timeMin = params.timeMin ?? new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString();
    query.timeMax = params.timeMax ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString();
  }
  const data = await googleRequest<{ items?: GoogleEvent[]; nextSyncToken?: string }>(
    "GET",
    `/calendars/${encodeURIComponent(integration.calendarId)}/events`,
    accessToken,
    query
  );
  return {
    integration,
    items: data.items ?? [],
    nextSyncToken: data.nextSyncToken ?? null,
  };
}

export async function startGoogleCalendarWatch() {
  const { integration, accessToken } = await getValidGoogleAccessToken();
  const webhookBase = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  if (!webhookBase) throw new Error("NEXT_PUBLIC_APP_URL é obrigatório para criar webhook do Google.");
  const channelId = randomUUID();
  const body = {
    id: channelId,
    type: "web_hook",
    address: `${webhookBase}/api/integrations/google-calendar/webhook`,
  };
  const data = await googleRequest<{ id?: string; resourceId?: string; expiration?: string }>(
    "POST",
    `/calendars/${encodeURIComponent(integration.calendarId)}/events/watch`,
    accessToken,
    undefined,
    body
  );
  return prisma.googleCalendarIntegration.update({
    where: { id: integration.id },
    data: {
      watchChannelId: data.id ?? channelId,
      watchResourceId: data.resourceId ?? null,
      watchExpiresAt: data.expiration ? new Date(Number(data.expiration)) : null,
    },
  });
}

export async function stopGoogleCalendarWatch() {
  const integration = await getGoogleIntegration();
  if (!integration?.watchChannelId || !integration.watchResourceId) return;
  const { accessToken } = await getValidGoogleAccessToken();
  try {
    await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: integration.watchChannelId,
        resourceId: integration.watchResourceId,
      }),
    });
  } finally {
    await prisma.googleCalendarIntegration.update({
      where: { id: integration.id },
      data: { watchChannelId: null, watchResourceId: null, watchExpiresAt: null },
    });
  }
}

