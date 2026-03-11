import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIAS_PADRAO = [
  "Manutenção PC",
  "Rede",
  "CFTV",
  "Elétrica",
  "Porteiro eletrônico",
  "Formatação",
  "Suporte remoto",
  "Suporte presencial",
];

async function main() {
  const email = "dono@solucoesinteligentes.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Usuário dono já existe:", email);
  } else {
    const passwordHash = await bcrypt.hash("senha123", 10);
    await prisma.user.create({
      data: { email, passwordHash },
    });
    console.log("Usuário dono criado:", email, "| senha: senha123");
  }

  for (const nome of CATEGORIAS_PADRAO) {
    await prisma.categoriaServico.upsert({
      where: { nome },
      create: { nome },
      update: {},
    });
  }
  console.log("Categorias de serviço verificadas/criadas.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
