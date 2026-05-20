import { prisma } from "@/lib/db";

const ML_API = "https://api.mercadolibre.com";

function getRedirectUri(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/api/integrations/ml/callback`;
}

export function getMLConnectUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ML_CLIENT_ID ?? "",
    redirect_uri: getRedirectUri(),
    state,
  });
  return `https://auth.mercadolivre.com.br/authorization?${params}`;
}

export async function exchangeMLCode(code: string): Promise<MLTokenResponse> {
  const res = await fetch(`${ML_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ML_CLIENT_ID ?? "",
      client_secret: process.env.ML_CLIENT_SECRET ?? "",
      code,
      redirect_uri: getRedirectUri(),
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ML token exchange falhou (${res.status}): ${body}`);
  }
  return res.json();
}

async function refreshMLToken(refreshToken: string): Promise<MLTokenResponse> {
  const res = await fetch(`${ML_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ML_CLIENT_ID ?? "",
      client_secret: process.env.ML_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ML refresh falhou (${res.status}): ${body}`);
  }
  return res.json();
}

export async function getMLToken(): Promise<string> {
  const integration = await prisma.mLIntegration.findUnique({ where: { provider: "ml" } });
  if (!integration) throw new Error("ML não autorizado. Acesse /dashboard/afiliado e clique em 'Autorizar ML'.");

  const now = new Date();
  const expiresIn5min = integration.expiryDate ? new Date(integration.expiryDate.getTime() - 5 * 60 * 1000) : null;

  if (!expiresIn5min || now < expiresIn5min) {
    return integration.accessToken;
  }

  // Token expirado — renovar
  const tokens = await refreshMLToken(integration.refreshToken);
  const expiryDate = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null;

  await prisma.mLIntegration.update({
    where: { provider: "ml" },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || integration.refreshToken,
      tokenType: tokens.token_type ?? null,
      expiryDate,
    },
  });

  return tokens.access_token;
}

export async function saveMLTokens(tokens: MLTokenResponse) {
  const expiryDate = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null;
  await prisma.mLIntegration.upsert({
    where: { provider: "ml" },
    create: {
      provider: "ml",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || "",
      tokenType: tokens.token_type ?? null,
      scope: tokens.scope ?? null,
      expiryDate,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || undefined,
      tokenType: tokens.token_type ?? null,
      scope: tokens.scope ?? null,
      expiryDate,
    },
  });
}

type MLTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
};
