import {
  PeriodicidadeObrigacao,
  PrismaClient,
  StatusObrigacaoContabil,
  TipoObrigacaoContabil,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { encryptSegredo, isEncryptionConfigured, isSegredoCriptografado } from "../lib/cripto-segredo";

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
    // Nunca usar senha fixa: vem de SEED_OWNER_PASSWORD ou é gerada aleatoriamente
    // e exibida UMA única vez no log da primeira subida. Trocar no primeiro login.
    const envPassword = process.env.SEED_OWNER_PASSWORD?.trim();
    if (envPassword && envPassword.length < 12) {
      throw new Error("SEED_OWNER_PASSWORD deve ter pelo menos 12 caracteres.");
    }
    const password = envPassword || randomBytes(18).toString("base64url");
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email, passwordHash },
    });
    if (envPassword) {
      console.log("Usuário dono criado:", email, "| senha: definida em SEED_OWNER_PASSWORD");
    } else {
      console.log("Usuário dono criado:", email, "| senha temporária (exibida só agora, troque no primeiro login):", password);
    }
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

  // Criptografa senhas de certificado (PFX) que ainda estejam em texto puro.
  // Idempotente: valores já criptografados ("enc:v1:") são ignorados.
  await criptografarSenhasLegadas();

  // EmpresaFiscal padrão
  const cnpjPadrao = "20.273.228/0001-62";
  const empresaExistente = await prisma.empresaFiscal.findUnique({ where: { cnpj: cnpjPadrao } });
  if (!empresaExistente) {
    await prisma.empresaFiscal.create({
      data: {
        cnpj: cnpjPadrao,
        razaoSocial: "Soluções Inteligentes",
        regime: "SIMPLES_NACIONAL",
        porte: "ME",
      },
    });
    console.log("EmpresaFiscal padrão criada.");
  } else {
    console.log("EmpresaFiscal já existe.");
  }
}

async function criptografarSenhasLegadas() {
  const docs = await prisma.documentoEmpresa.findMany({
    where: { senha: { not: null } },
    select: { id: true, senha: true },
  });
  const pendentes = docs.filter((d) => d.senha && !isSegredoCriptografado(d.senha));
  if (pendentes.length === 0) return;

  if (!isEncryptionConfigured()) {
    console.warn(
      `ATENÇÃO: ${pendentes.length} senha(s) de certificado em texto puro no banco. Defina ENCRYPTION_KEY no EasyPanel e reinicie para criptografar.`
    );
    return;
  }

  for (const doc of pendentes) {
    await prisma.documentoEmpresa.update({
      where: { id: doc.id },
      data: { senha: encryptSegredo(doc.senha as string) },
    });
  }
  console.log(`Senhas de certificado criptografadas: ${pendentes.length}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
