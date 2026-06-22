import { mkdir, unlink } from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";
import { nanoid } from "nanoid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "orcamento-anexos");

export async function saveAnexoOrcamento(
  file: File,
  ext: string
): Promise<{ url: string; tamanhoBytes: number }> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${nanoid()}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  // stream direto para disco para não estourar memória/call stack em arquivos grandes
  const readable = Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]);
  const writable = createWriteStream(filepath);
  await pipeline(readable, writable);

  return {
    url: `/uploads/orcamento-anexos/${filename}`,
    tamanhoBytes: file.size,
  };
}

export async function deleteAnexoOrcamento(url: string): Promise<void> {
  try {
    const filepath = path.join(process.cwd(), "public", url);
    await unlink(filepath);
  } catch {
    // ignora se já não existir
  }
}
