import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, isDono } from "@/lib/auth";
import { badRequest, forbidden, jsonResponse, notFound, unauthorized } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(_req);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const empresa = await prisma.empresaFiscal.findUnique({ where: { id, ativo: true } });
  if (!empresa) return notFound("Empresa não encontrada.");
  return jsonResponse(empresa);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !isDono(auth)) return auth ? forbidden() : unauthorized();

  const { id } = await params;
  const empresa = await prisma.empresaFiscal.findUnique({ where: { id, ativo: true } });
  if (!empresa) return notFound("Empresa não encontrada.");

  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Corpo inválido.");

  const {
    razaoSocial, regime, porte,
    inscricaoEstadual, inscricaoMunicipal,
    cnae, cnaeDescricao, endereco, telefone, email, regimeApuracao,
    tributacaoNacional, tributacaoMunicipal, tributacaoFederal,
  } = body;

  const atualizada = await prisma.empresaFiscal.update({
    where: { id },
    data: {
      ...(razaoSocial !== undefined && { razaoSocial }),
      ...(regime !== undefined && { regime }),
      ...(porte !== undefined && { porte }),
      ...(inscricaoEstadual !== undefined && { inscricaoEstadual }),
      ...(inscricaoMunicipal !== undefined && { inscricaoMunicipal }),
      ...(cnae !== undefined && { cnae }),
      ...(cnaeDescricao !== undefined && { cnaeDescricao }),
      ...(endereco !== undefined && { endereco }),
      ...(telefone !== undefined && { telefone }),
      ...(email !== undefined && { email }),
      ...(regimeApuracao !== undefined && { regimeApuracao }),
      ...(tributacaoNacional !== undefined && { tributacaoNacional }),
      ...(tributacaoMunicipal !== undefined && { tributacaoMunicipal }),
      ...(tributacaoFederal !== undefined && { tributacaoFederal }),
    },
  });

  return jsonResponse(atualizada);
}
