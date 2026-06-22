import { mkdir, unlink, writeFile } from "fs/promises";
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
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return {
    url: `/uploads/orcamento-anexos/${filename}`,
    tamanhoBytes: buffer.length,
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
