import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "conhecimento");

export async function saveAnexoConhecimento(
  artigoId: string,
  file: File,
  ext: string
): Promise<{ url: string; tamanhoBytes: number }> {
  const dir = path.join(UPLOAD_DIR, artigoId);
  await mkdir(dir, { recursive: true });

  const filename = `${nanoid()}.${ext}`;
  const filepath = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return {
    url: `/uploads/conhecimento/${artigoId}/${filename}`,
    tamanhoBytes: buffer.length,
  };
}

export async function deleteAnexoConhecimento(url: string): Promise<void> {
  try {
    const filepath = path.join(process.cwd(), "public", url);
    await unlink(filepath);
  } catch {
    // ignora se já não existir
  }
}
