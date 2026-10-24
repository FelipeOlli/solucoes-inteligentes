import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";
import { saveDocumentoEmpresa } from "@/lib/storage-fiscal";
import { CategoriaDocumentoEmpresa } from "@prisma/client";
import { decryptSegredo, encryptSegredo } from "@/lib/cripto-segredo";

type Params = { params: Promise<{ id: string }> };

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const CATS_VALIDAS: CategoriaDocumentoEmpresa[] = ["CONTRATO_SOCIAL", "CERTIFICADO_DIGITAL"];
const EXTS_VALIDAS = ["pdf", "jpg", "jpeg", "png", "webp", "pfx", "p12"];
const DIAS_ANTECEDENCIA = 5;

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(_req);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const empresa = await prisma.empresaFiscal.findUnique({ where: { id, ativo: true } });
  if (!empresa) return notFound("Empresa não encontrada.");

  const docs = await prisma.documentoEmpresa.findMany({
    where: { empresaFiscalId: id, ativo: true },
    orderBy: { createdAt: "desc" },
  });

  // Senha do PFX fica criptografada no banco; só o dono recebe o valor aberto.
  const docsComSenha = docs.map((doc) => {
    if (!doc.senha) return doc;
    try {
      return { ...doc, senha: decryptSegredo(doc.senha) };
    } catch (e) {
      console.error("Falha ao descriptografar senha do documento", doc.id, e);
      return { ...doc, senha: null };
    }
  });

  return jsonResponse(docsComSenha);
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const empresa = await prisma.empresaFiscal.findUnique({ where: { id, ativo: true } });
  if (!empresa) return notFound("Empresa não encontrada.");

  const formData = await request.formData().catch(() => null);
  if (!formData) return badRequest("Multipart esperado.");

  const file = formData.get("file");
  const categoriaRaw = String(formData.get("categoria") || "").trim();
  const nome = String(formData.get("nome") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim() || null;
  const dataValidadeRaw = String(formData.get("dataValidade") || "").trim();
  const senha = String(formData.get("senha") || "").trim() || null;

  if (!file || !(file instanceof File)) return badRequest("file é obrigatório.");
  if (!CATS_VALIDAS.includes(categoriaRaw as CategoriaDocumentoEmpresa))
    return badRequest("categoria inválida.");
  if (!nome) return badRequest("nome é obrigatório.");
  if (file.size > MAX_SIZE) return badRequest("Arquivo maior que 10MB.");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!EXTS_VALIDAS.includes(ext)) return badRequest("Tipo de arquivo não permitido.");

  // Criptografa antes de gravar; sem ENCRYPTION_KEY recusa em vez de salvar em texto puro.
  let senhaCriptografada: string | null = null;
  if (senha) {
    try {
      senhaCriptografada = encryptSegredo(senha);
    } catch (e) {
      console.error(e);
      return badRequest("Não foi possível proteger a senha do certificado: ENCRYPTION_KEY não configurada no servidor.");
    }
  }

  const uuid = nanoid();
  const { url, tamanhoBytes } = await saveDocumentoEmpresa(id, uuid, file, ext);

  const dataValidade = dataValidadeRaw ? new Date(dataValidadeRaw) : null;

  // Cria lembrete na agenda para Certificado Digital com validade informada
  let obrigacaoContabilId: string | undefined;
  if (categoriaRaw === "CERTIFICADO_DIGITAL" && dataValidade) {
    const dataLembrete = new Date(dataValidade);
    dataLembrete.setDate(dataLembrete.getDate() - DIAS_ANTECEDENCIA);

    const obrigacao = await prisma.obrigacaoContabil.create({
      data: {
        nome: `Renovar Certificado Digital — ${nome}`,
        tipo: "CERTIFICADO_DIGITAL",
        periodicidade: "ANUAL",
        proximoVencimento: dataLembrete,
        observacao: `Certificado vence em ${dataValidade.toLocaleDateString("pt-BR")}. Lembrete gerado automaticamente ${DIAS_ANTECEDENCIA} dias antes.`,
      },
    });
    obrigacaoContabilId = obrigacao.id;
  }

  const doc = await prisma.documentoEmpresa.create({
    data: {
      empresaFiscalId: id,
      categoria: categoriaRaw as CategoriaDocumentoEmpresa,
      nome,
      descricao,
      arquivoUrl: url,
      nomeArquivo: file.name,
      tamanhoBytes,
      dataValidade: dataValidade ?? undefined,
      senha: senhaCriptografada ?? undefined,
      obrigacaoContabilId,
    },
  });

  return jsonResponse({ ...doc, senha, lembreteAgendado: !!obrigacaoContabilId }, 201);
}
