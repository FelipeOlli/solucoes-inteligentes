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

function checkLimit(key: string, windowMsLimit: number, max: number): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMsLimit };
    store.set(key, entry);
  }

  entry.count += 1;
  if (entry.count > max) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true };
}

export function checkLoginRateLimit(request: Request): { ok: true } | { ok: false; retryAfter: number } {
  return checkLimit(`login:${getClientKey(request)}`, windowMs, maxAttempts);
}

/** Esqueci a senha: por IP (5 por 15 min) e por email (2 por 15 min) para evitar abuso. */
export function checkForgotPasswordRateLimit(
  request: Request,
  email: string
): { ok: true } | { ok: false; retryAfter: number } {
  const ip = getClientKey(request);
  const window15 = 15 * 60 * 1000;
  const byIp = checkLimit(`forgot:ip:${ip}`, window15, 5);
  if (!byIp.ok) return byIp;
  const emailNorm = email.trim().toLowerCase().slice(0, 128);
  const byEmail = checkLimit(`forgot:email:${emailNorm}`, window15, 2);
  if (!byEmail.ok) return byEmail;
  return { ok: true };
}

/** Redefinir senha: por IP (10 tentativas por 15 min) para evitar abuso. */
export function checkResetPasswordRateLimit(request: Request): { ok: true } | { ok: false; retryAfter: number } {
  const window15 = 15 * 60 * 1000;
  return checkLimit(`reset:ip:${getClientKey(request)}`, window15, 10);
}
