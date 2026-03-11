import { prisma } from "@/lib/db";

export async function gerarCodigoServico(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SI-${year}-`;
  const last = await prisma.servico.findFirst({
    where: { codigo: { startsWith: prefix } },
    orderBy: { codigo: "desc" },
    select: { codigo: true },
  });
  const nextNum = last ? parseInt(last.codigo.replace(prefix, ""), 10) + 1 : 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}
