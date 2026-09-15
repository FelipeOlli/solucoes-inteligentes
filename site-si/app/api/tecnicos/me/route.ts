import { NextRequest } from "next/server";
import { requireTecnico } from "@/lib/guards";
import { jsonResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const guard = await requireTecnico(request);
  if (!guard.ok) return guard.res;

  return jsonResponse({ id: guard.tecnicoId, nome: guard.nome });
}
