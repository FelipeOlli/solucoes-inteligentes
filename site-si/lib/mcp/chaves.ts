import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

const PREFIXO_CHAVE = "simcp_";

export function hashChave(chave: string): string {
  return createHash("sha256").update(chave).digest("hex");
}

/** Gera uma chave nova. A chave em claro só existe neste retorno. */
export function gerarChaveMcp(): { chave: string; hash: string; prefixo: string } {
  const chave = PREFIXO_CHAVE + randomBytes(32).toString("base64url");
  return { chave, hash: hashChave(chave), prefixo: chave.slice(0, 10) };
}

/** Confere a chave contra o banco (hash, não revogada) e registra o último uso. */
export async function validarChaveMcp(chave: string): Promise<boolean> {
  const registro = await prisma.chaveMcp.findUnique({
    where: { hash: hashChave(chave) },
    select: { id: true, revogadaEm: true },
  });
  if (!registro || registro.revogadaEm) return false;
  prisma.chaveMcp
    .update({ where: { id: registro.id }, data: { ultimoUso: new Date() } })
    .catch(() => {});
  return true;
}

/**
 * Registra na tabela a chave legada (SI_MCP_TOKEN) para que apareça na página,
 * mostre último uso e possa ser revogada. Só guarda o hash; não sobrescreve revogação.
 */
export async function sincronizarChaveEnv(): Promise<void> {
  const token = process.env.SI_MCP_TOKEN?.trim();
  if (!token) return;
  const hash = hashChave(token);
  await prisma.chaveMcp.upsert({
    where: { hash },
    create: { nome: "Chave original (SI_MCP_TOKEN)", hash, prefixo: "SI_MCP_TOKEN" },
    update: {},
  });
}
