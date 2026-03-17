import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;
const EXPIRY_MS = 60 * 60 * 1000; // 1 hora

export function generateSecureToken(): { raw: string; hash: string } {
  const raw = randomBytes(TOKEN_BYTES).toString("hex");
  const hash = createHash("sha256").update(raw, "utf8").digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function getExpiry(): Date {
  return new Date(Date.now() + EXPIRY_MS);
}
