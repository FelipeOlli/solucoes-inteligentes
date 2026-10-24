import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Criptografia em repouso para segredos guardados no banco
 * (ex.: senha do certificado digital PFX em DocumentoEmpresa.senha).
 *
 * AES-256-GCM. A chave vem de ENCRYPTION_KEY (qualquer string longa e aleatória,
 * ex.: `openssl rand -base64 48`) e é normalizada para 32 bytes via SHA-256.
 *
 * Formato gravado: "enc:v1:" + base64url(iv[12] | tag[16] | ciphertext).
 * Valores sem o prefixo são texto puro legado — decryptSegredo devolve como está
 * e o seed os criptografa na próxima subida do container.
 */

const PREFIXO = "enc:v1:";

function getChave(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 32) {
    throw new Error(
      "ENCRYPTION_KEY deve ser definida no ambiente com pelo menos 32 caracteres (gere com `openssl rand -base64 48`). Veja SEGURANCA.md."
    );
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

export function isEncryptionConfigured(): boolean {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  return !!raw && raw.length >= 32;
}

export function isSegredoCriptografado(valor: string | null | undefined): boolean {
  return typeof valor === "string" && valor.startsWith(PREFIXO);
}

export function encryptSegredo(texto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getChave(), iv);
  const ciphertext = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIXO + Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function decryptSegredo(valor: string | null | undefined): string | null {
  if (valor == null) return null;
  if (!isSegredoCriptografado(valor)) return valor; // legado em texto puro
  const dados = Buffer.from(valor.slice(PREFIXO.length), "base64url");
  const iv = dados.subarray(0, 12);
  const tag = dados.subarray(12, 28);
  const ciphertext = dados.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getChave(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
