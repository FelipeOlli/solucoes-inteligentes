import { NaturezaObrigacao, Prisma, TipoDocumentoFiscal, TipoObrigacaoFiscal } from "@prisma/client";
import { prisma } from "@/lib/db";
import { detectarTipo } from "./extractors/detector";
import { extrairDas } from "./extractors/das";
import { extrairDarfMaed } from "./extractors/darf-maed";
import { extrairPgdasRecibo } from "./extractors/pgdas-recibo";
import { extrairDefisRecibo } from "./extractors/defis-recibo";
import { extrairNotificacaoMaed } from "./extractors/notificacao-maed";
import { extrairRelatorioSituacao } from "./extractors/relatorio-situacao";
import { extrairComIA } from "./extractor-ia";

export type ModoProcessamento = "MANUAL" | "SEMI_AUTO" | "IA";

type ResultadoProcessamento = {
  tipo: TipoDocumentoFiscal;
  dadosExtraidos: Record<string, unknown>;
  competencia: Date | null;
  vencimento: Date | null;
  valorTotal: number | null;
  numeroDocumento: string | null;
  razaoSocial: string | null;
  obrigacaoId: string | null;
  obrigacoesGeradas: number;
  confidence: number;
};

async function atualizarRazaoSocialEmpresa(empresaFiscalId: string, razaoSocial: string) {
  const empresa = await prisma.empresaFiscal.findUnique({
    where: { id: empresaFiscalId },
    select: { razaoSocial: true, cnpj: true },
  });
  if (!empresa) return;
  // Atualiza somente se a razão social atual parece vazia ou igual ao CNPJ
  const atual = empresa.razaoSocial.trim();
  const semDados = !atual || atual === empresa.cnpj || atual.length < 4;
  if (semDados) {
    await prisma.empresaFiscal.update({
      where: { id: empresaFiscalId },
      data: { razaoSocial },
    });
  }
}

async function processarComIA(
  documentoId: string,
  texto: string,
  empresaFiscalId: string
): Promise<ResultadoProcessamento> {
  await prisma.documentoFiscal.update({
    where: { id: documentoId },
    data: { statusProcessamento: "PROCESSANDO", textoExtraido: texto },
  });

  try {
    const ext = await extrairComIA(texto);

    const tipoValido = Object.values(TipoDocumentoFiscal).includes(ext.tipo as TipoDocumentoFiscal)
      ? (ext.tipo as TipoDocumentoFiscal)
      : TipoDocumentoFiscal.OUTROS;

    const competencia = ext.competencia ? new Date(ext.competencia) : null;
    const vencimento = ext.vencimento ? new Date(ext.vencimento) : null;
    const valorTotal = ext.valorTotal ?? null;
    const razaoSocial = ext.razaoSocial ?? null;

    let obrigacaoId: string | null = null;
    let obrigacoesGeradas = 0;

    const naturezaPorTipo: Record<string, NaturezaObrigacao> = {
      DAS: "PAGAMENTO",
      DARF_MAED: "MULTA",
      NOTIFICACAO_MAED: "MULTA",
      PGDAS_D_RECIBO: "DECLARACAO",
      DEFIS_RECIBO: "DECLARACAO",
    };
    const tipoObrigacao: Record<string, TipoObrigacaoFiscal> = {
      DAS: "DAS",
      DARF_MAED: "MAED",
      NOTIFICACAO_MAED: "MAED",
      PGDAS_D_RECIBO: "PGDAS_D",
      DEFIS_RECIBO: "DEFIS",
    };

    if (competencia && tipoObrigacao[tipoValido]) {
      const venc = vencimento ?? (() => {
        const d = new Date(competencia);
        d.setMonth(d.getMonth() + 1);
        d.setDate(20);
        return d;
      })();
      const status = ["PGDAS_D_RECIBO", "DEFIS_RECIBO"].includes(tipoValido) ? "CUMPRIDA" : "PENDENTE";
      const obrigacao = await prisma.obrigacaoFiscal.create({
        data: {
          empresaFiscalId,
          tipo: tipoObrigacao[tipoValido],
          natureza: naturezaPorTipo[tipoValido],
          competencia,
          vencimento: venc,
          valorTotal: valorTotal ?? undefined,
          status,
          dataCumprimento: status === "CUMPRIDA" ? new Date() : undefined,
        },
      });
      obrigacaoId = obrigacao.id;
      obrigacoesGeradas = 1;
    }

    if (razaoSocial) await atualizarRazaoSocialEmpresa(empresaFiscalId, razaoSocial);

    const statusFinal = ext.confidence >= 0.6 ? "PROCESSADO" : ext.confidence > 0 ? "PROCESSADO_COM_AVISOS" : "MANUAL";

    await prisma.documentoFiscal.update({
      where: { id: documentoId },
      data: {
        tipoDocumento: tipoValido,
        statusProcessamento: statusFinal,
        dadosExtraidos: ext as unknown as Prisma.JsonObject,
        competencia: competencia ?? undefined,
        vencimento: vencimento ?? undefined,
        valorTotal: valorTotal ?? undefined,
        numeroDocumento: ext.numeroDocumento ?? undefined,
        obrigacaoId: obrigacaoId ?? undefined,
      },
    });

    if (obrigacaoId) {
      await prisma.obrigacaoFiscal.update({
        where: { id: obrigacaoId },
        data: { documento: { connect: { id: documentoId } } },
      });
    }

    return {
      tipo: tipoValido,
      dadosExtraidos: ext as unknown as Record<string, unknown>,
      competencia,
      vencimento,
      valorTotal,
      numeroDocumento: ext.numeroDocumento,
      razaoSocial,
      obrigacaoId,
      obrigacoesGeradas,
      confidence: ext.confidence,
    };
  } catch (err) {
    await prisma.documentoFiscal.update({
      where: { id: documentoId },
      data: {
        statusProcessamento: "ERRO",
        erroProcessamento: err instanceof Error ? err.message : "Erro desconhecido",
      },
    });
    throw err;
  }
}

export async function processarDocumento(
  documentoId: string,
  texto: string,
  empresaFiscalId: string,
  modo: ModoProcessamento = "SEMI_AUTO"
): Promise<ResultadoProcessamento> {
  // Modo manual: apenas salva o texto, não extrai nada
  if (modo === "MANUAL") {
    await prisma.documentoFiscal.update({
      where: { id: documentoId },
      data: { statusProcessamento: "MANUAL", textoExtraido: texto },
    });
    return {
      tipo: TipoDocumentoFiscal.OUTROS,
      dadosExtraidos: {},
      competencia: null,
      vencimento: null,
      valorTotal: null,
      numeroDocumento: null,
      razaoSocial: null,
      obrigacaoId: null,
      obrigacoesGeradas: 0,
      confidence: 0,
    };
  }

  // Modo IA: delega toda a extração ao Claude Sonnet
  if (modo === "IA") {
    return processarComIA(documentoId, texto, empresaFiscalId);
  }

  // Modo SEMI_AUTO: fluxo original com regex
  await prisma.documentoFiscal.update({
    where: { id: documentoId },
    data: { statusProcessamento: "PROCESSANDO", textoExtraido: texto },
  });

  try {
    const tipo = detectarTipo(texto);
    let dados: Record<string, unknown> = {};
    let competencia: Date | null = null;
    let vencimento: Date | null = null;
    let valorTotal: number | null = null;
    let numeroDocumento: string | null = null;
    let razaoSocial: string | null = null;
    let obrigacaoId: string | null = null;
    let obrigacoesGeradas = 0;
    let confidence = 0;

    if (tipo === TipoDocumentoFiscal.DAS) {
      const ext = extrairDas(texto);
      dados = ext as Record<string, unknown>;
      competencia = ext.competencia;
      vencimento = ext.vencimento;
      valorTotal = ext.valorTotal;
      numeroDocumento = ext.numeroDocumento;
      razaoSocial = ext.razaoSocial;
      confidence = ext.confidence;

      if (competencia && vencimento) {
        const obrigacao = await prisma.obrigacaoFiscal.create({
          data: {
            empresaFiscalId,
            tipo: TipoObrigacaoFiscal.DAS,
            natureza: NaturezaObrigacao.PAGAMENTO,
            competencia,
            vencimento,
            valorTotal: valorTotal ?? undefined,
          },
        });
        obrigacaoId = obrigacao.id;
        obrigacoesGeradas = 1;
      }
    } else if (tipo === TipoDocumentoFiscal.DARF_MAED) {
      const ext = extrairDarfMaed(texto);
      dados = ext as Record<string, unknown>;
      competencia = ext.periodoApuracao;
      vencimento = ext.vencimento;
      valorTotal = ext.valorTotal;
      numeroDocumento = ext.numeroDocumento;
      razaoSocial = ext.razaoSocial;
      confidence = ext.confidence;

      if (competencia && vencimento) {
        const obrigacao = await prisma.obrigacaoFiscal.create({
          data: {
            empresaFiscalId,
            tipo: TipoObrigacaoFiscal.MAED,
            natureza: NaturezaObrigacao.MULTA,
            competencia,
            vencimento,
            valorTotal: valorTotal ?? undefined,
          },
        });
        obrigacaoId = obrigacao.id;
        obrigacoesGeradas = 1;
      }
    } else if (tipo === TipoDocumentoFiscal.PGDAS_D_RECIBO) {
      const ext = extrairPgdasRecibo(texto);
      dados = ext as Record<string, unknown>;
      competencia = ext.competencia;
      numeroDocumento = ext.numeroRecibo;
      razaoSocial = ext.razaoSocial;
      confidence = ext.confidence;

      if (competencia) {
        const venc = new Date(competencia);
        venc.setMonth(venc.getMonth() + 1);
        venc.setDate(20);
        const obrigacao = await prisma.obrigacaoFiscal.create({
          data: {
            empresaFiscalId,
            tipo: TipoObrigacaoFiscal.PGDAS_D,
            natureza: NaturezaObrigacao.DECLARACAO,
            competencia,
            vencimento: venc,
            status: "CUMPRIDA",
            dataCumprimento: ext.dataTransmissao ?? new Date(),
          },
        });
        obrigacaoId = obrigacao.id;
        obrigacoesGeradas = 1;
      }
    } else if (tipo === TipoDocumentoFiscal.DEFIS_RECIBO) {
      const ext = extrairDefisRecibo(texto);
      dados = ext as Record<string, unknown>;
      competencia = ext.anoCalendario ? new Date(`${ext.anoCalendario}-01-01`) : null;
      numeroDocumento = ext.numeroRecibo;
      razaoSocial = ext.razaoSocial;
      confidence = ext.confidence;

      if (competencia && ext.anoCalendario) {
        const venc = new Date(`${ext.anoCalendario + 1}-03-31`);
        const obrigacao = await prisma.obrigacaoFiscal.create({
          data: {
            empresaFiscalId,
            tipo: TipoObrigacaoFiscal.DEFIS,
            natureza: NaturezaObrigacao.DECLARACAO,
            competencia,
            vencimento: venc,
            status: "CUMPRIDA",
            dataCumprimento: ext.dataTransmissao ?? new Date(),
          },
        });
        obrigacaoId = obrigacao.id;
        obrigacoesGeradas = 1;
      }
    } else if (tipo === TipoDocumentoFiscal.NOTIFICACAO_MAED) {
      const ext = extrairNotificacaoMaed(texto);
      dados = ext as Record<string, unknown>;
      competencia = ext.periodoApuracao;
      vencimento = ext.vencimento;
      valorTotal = ext.valorMulta;
      numeroDocumento = ext.numeroNotificacao;
      razaoSocial = ext.razaoSocial;
      confidence = ext.confidence;

      // Agora cria obrigação se tiver pelo menos competência
      if (competencia) {
        const venc = vencimento ?? (() => {
          const d = new Date(competencia);
          d.setMonth(d.getMonth() + 2);
          d.setDate(30);
          return d;
        })();
        const obrigacao = await prisma.obrigacaoFiscal.create({
          data: {
            empresaFiscalId,
            tipo: TipoObrigacaoFiscal.MAED,
            natureza: NaturezaObrigacao.MULTA,
            competencia,
            vencimento: venc,
            valorTotal: valorTotal ?? undefined,
          },
        });
        obrigacaoId = obrigacao.id;
        obrigacoesGeradas = 1;
      }
    } else if (tipo === TipoDocumentoFiscal.RELATORIO_SITUACAO) {
      const ext = extrairRelatorioSituacao(texto);
      dados = ext as Record<string, unknown>;
      confidence = ext.confidence;

      for (const pendencia of ext.pendencias) {
        const venc = new Date(pendencia.competencia ?? new Date());
        venc.setMonth(venc.getMonth() + 1);
        venc.setDate(20);
        await prisma.obrigacaoFiscal.create({
          data: {
            empresaFiscalId,
            tipo: pendencia.tipo === "MAED" ? TipoObrigacaoFiscal.MAED : TipoObrigacaoFiscal.PGDAS_D,
            natureza: pendencia.tipo === "MAED" ? NaturezaObrigacao.MULTA : NaturezaObrigacao.DECLARACAO,
            competencia: pendencia.competencia ?? new Date(),
            vencimento: venc,
            observacoes: pendencia.observacao,
          },
        });
        obrigacoesGeradas++;
      }
    }

    // Atualiza razão social da empresa se foi extraída e a empresa ainda não tem
    if (razaoSocial) {
      await atualizarRazaoSocialEmpresa(empresaFiscalId, razaoSocial);
    }

    const statusFinal = confidence >= 0.6 ? "PROCESSADO" : confidence > 0 ? "PROCESSADO_COM_AVISOS" : "MANUAL";

    await prisma.documentoFiscal.update({
      where: { id: documentoId },
      data: {
        tipoDocumento: tipo,
        statusProcessamento: statusFinal,
        dadosExtraidos: dados as Prisma.JsonObject,
        competencia: competencia ?? undefined,
        vencimento: vencimento ?? undefined,
        valorTotal: valorTotal ?? undefined,
        numeroDocumento: numeroDocumento ?? undefined,
        obrigacaoId: obrigacaoId ?? undefined,
      },
    });

    if (obrigacaoId) {
      await prisma.obrigacaoFiscal.update({
        where: { id: obrigacaoId },
        data: { documento: { connect: { id: documentoId } } },
      });
    }

    return { tipo, dadosExtraidos: dados, competencia, vencimento, valorTotal, numeroDocumento, razaoSocial, obrigacaoId, obrigacoesGeradas, confidence };
  } catch (err) {
    await prisma.documentoFiscal.update({
      where: { id: documentoId },
      data: {
        statusProcessamento: "ERRO",
        erroProcessamento: err instanceof Error ? err.message : "Erro desconhecido",
      },
    });
    throw err;
  }
}
