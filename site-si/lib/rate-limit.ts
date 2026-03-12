/**
 * Rate limit simples em memória (por processo).
 * Em produção com múltiplas instâncias, considere Redis ou similar.
 */

const windowMs = 60 * 1000; // 1 minuto
const maxAttempts = 8;

const store = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return (forwarded?.split(",")[0]?.trim() || realIp || "unknown").slice(0, 64);
}

export function checkLoginRateLimit(request: Request): { ok: true } | { ok: false; retryAfter: number } {
  const key = `login:${getClientKey(request)}`;
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count += 1;
  if (entry.count > maxAttempts) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true };
}
