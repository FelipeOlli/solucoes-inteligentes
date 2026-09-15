import { clearAuthCookie } from "@/lib/auth";
import { jsonResponse } from "@/lib/api-response";

export async function POST() {
  const res = jsonResponse({ ok: true });
  clearAuthCookie(res);
  return res;
}
