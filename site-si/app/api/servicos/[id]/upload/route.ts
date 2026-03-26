import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { jsonResponse, unauthorized, forbidden, notFound, badRequest } from "@/lib/api-response";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

async function getServicoId(idOrCodigo: string): Promise<string | null> {
  const byId = await prisma.servico.findUnique({ where: { id: idOrCodigo }, select: { id: true } });
  if (byId) return byId.id;
  const byCodigo = await prisma.servico.findUnique({ where: { codigo: idOrCodigo }, select: { id: true } });
  return byCodigo?.id ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const id = await getServicoId((await params).id);
  if (!id) return notFound();

  const formData = await request.formData();
  const files = formData.getAll("file") as File[];
  if (!files.length) return badRequest("Envie pelo menos um arquivo (campo 'file').");

  const uploadDir = path.join(process.cwd(), "public", "uploads", "servicos", id);
  await mkdir(uploadDir, { recursive: true });

  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file?.size || !file?.name) continue;
    const ext = path.extname(file.name) || ".jpg";
    const base = path.basename(file.name, ext).replace(/\W/g, "_") || "img";
    const filename = `${base}_${Date.now()}_${i}${ext}`;
    const filepath = path.join(uploadDir, filename);
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buf);
    urls.push(`/uploads/servicos/${id}/${filename}`);
  }

  if (urls.length === 0) return badRequest("Nenhum arquivo válido enviado.");

  const servico = await prisma.servico.findUnique({ where: { id }, select: { imagens: true } });
  const existing = servico?.imagens ? (JSON.parse(servico.imagens) as string[]) : [];
  const newImagens = JSON.stringify([...existing, ...urls]);
  await prisma.servico.update({ where: { id }, data: { imagens: newImagens } });

  return jsonResponse({ urls, imagens: [...existing, ...urls] }, 201);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const id = await getServicoId((await params).id);
  if (!id) return notFound();

  const urlRaw = request.nextUrl.searchParams.get("url");
  if (!urlRaw) return badRequest("Parâmetro url é obrigatório.");

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(urlRaw);
  } catch {
    return badRequest("URL inválida.");
  }
  if (targetUrl.includes("\0")) return badRequest("URL inválida.");

  const expectedPrefix = `/uploads/servicos/${id}/`;
  if (!targetUrl.startsWith(expectedPrefix)) {
    return badRequest("URL não pertence a este serviço.");
  }

  const servico = await prisma.servico.findUnique({ where: { id }, select: { imagens: true } });
  if (!servico) return notFound();

  const list = servico.imagens ? (JSON.parse(servico.imagens) as string[]) : [];
  const next = list.filter((u) => u !== targetUrl);
  if (next.length === list.length) {
    return badRequest("Arquivo não encontrado na lista do serviço.");
  }

  const publicRoot = path.join(process.cwd(), "public");
  const uploadRoot = path.normalize(path.join(publicRoot, "uploads", "servicos", id));
  const relativeFromPublic = targetUrl.replace(/^\/+/, "");
  const filepath = path.normalize(path.join(publicRoot, ...relativeFromPublic.split("/")));

  const relToRoot = path.relative(uploadRoot, filepath);
  if (relToRoot.startsWith("..") || path.isAbsolute(relToRoot)) {
    return badRequest("Caminho inválido.");
  }

  await prisma.servico.update({
    where: { id },
    data: { imagens: next.length > 0 ? JSON.stringify(next) : null },
  });

  await unlink(filepath).catch(() => {});

  return jsonResponse({ imagens: next });
}
