import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "documentos-fiscais");

export async function saveDocumentoFiscal(
  empresaId: string,
  uuid: string,
  file: File
): Promise<{ url: string; tamanhoBytes: number }> {
  const dir = path.join(UPLOAD_DIR, empresaId);
  await mkdir(dir, { recursive: true });

  const filename = `${uuid}.pdf`;
  const filepath = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return {
    url: `/uploads/documentos-fiscais/${empresaId}/${filename}`,
    tamanhoBytes: buffer.length,
  };
}

export async function saveDocumentoEmpresa(
  empresaId: string,
  uuid: string,
  file: File,
  ext: string
): Promise<{ url: string; tamanhoBytes: number }> {
  const dir = path.join(process.cwd(), "public", "uploads", "empresas-fiscais", empresaId);
  await mkdir(dir, { recursive: true });

  const filename = `${uuid}.${ext}`;
  const filepath = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return {
    url: `/uploads/empresas-fiscais/${empresaId}/${filename}`,
    tamanhoBytes: buffer.length,
  };
}

export async function deleteDocumentoEmpresa(arquivoUrl: string): Promise<void> {
  try {
    const filepath = path.join(process.cwd(), "public", arquivoUrl);
    await unlink(filepath);
  } catch {
    // ignora se já não existir
  }
}

export async function deleteDocumentoFiscal(arquivoUrl: string): Promise<void> {
  try {
    const filepath = path.join(process.cwd(), "public", arquivoUrl);
    await unlink(filepath);
  } catch {
    // arquivo pode já não existir; ignora
  }
}
