// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;

export async function parsePdf(file: File): Promise<{ text: string; nPages: number }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const data = await pdfParse(buffer);
  return { text: data.text, nPages: data.numpages };
}

export async function parsePdfBuffer(buffer: Buffer): Promise<{ text: string; nPages: number }> {
  const data = await pdfParse(buffer);
  return { text: data.text, nPages: data.numpages };
}
