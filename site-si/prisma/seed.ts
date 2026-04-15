import {
  PeriodicidadeObrigacao,
  PrismaClient,
  StatusObrigacaoContabil,
  TipoObrigacaoContabil,
} from "@prisma/client";
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

const OBRIGACOES_CONTABEIS_INICIAIS: Array<{
  nome: string;
  tipo: TipoObrigacaoContabil;
  periodicidade: PeriodicidadeObrigacao;
}> = [
  { nome: "DEFIS", tipo: TipoObrigacaoContabil.DEFIS, periodicidade: PeriodicidadeObrigacao.ANUAL },
  { nome: "PGDAS", tipo: TipoObrigacaoContabil.PGDAS, periodicidade: PeriodicidadeObrigacao.MENSAL },
  { nome: "RAIS / eSocial", tipo: TipoObrigacaoContabil.RAIS_ESOCIAL, periodicidade: PeriodicidadeObrigacao.ANUAL },
  { nome: "Renovação do Alvará", tipo: TipoObrigacaoContabil.ALVARA, periodicidade: PeriodicidadeObrigacao.ANUAL },
  { nome: "Certificado Digital", tipo: TipoObrigacaoContabil.CERTIFICADO_DIGITAL, periodicidade: PeriodicidadeObrigacao.ANUAL },
];

function nextDueBaseDate(periodicidade: PeriodicidadeObrigacao): Date {
  const now = new Date();
  if (periodicidade === PeriodicidadeObrigacao.MENSAL) {
    return new Date(now.getFullYear(), now.getMonth() + 1, 20);
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
}

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

  for (const item of OBRIGACOES_CONTABEIS_INICIAIS) {
    const existingObrigacao = await prisma.obrigacaoContabil.findFirst({
      where: { nome: item.nome, tipo: item.tipo, ativo: true },
      select: { id: true },
    });
    if (!existingObrigacao) {
      await prisma.obrigacaoContabil.create({
        data: {
          nome: item.nome,
          tipo: item.tipo,
          periodicidade: item.periodicidade,
          proximoVencimento: nextDueBaseDate(item.periodicidade),
          status: StatusObrigacaoContabil.PENDENTE,
        },
      });
    }
  }
  console.log("Obrigações contábeis iniciais verificadas/criadas.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
