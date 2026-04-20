-- CreateEnum
CREATE TYPE "TipoDocumentoFiscal" AS ENUM ('DAS', 'DARF_MAED', 'PGDAS_D_RECIBO', 'DEFIS_RECIBO', 'NOTIFICACAO_MAED', 'RELATORIO_SITUACAO', 'OUTROS');

-- CreateEnum
CREATE TYPE "StatusProcessamentoFiscal" AS ENUM ('PENDENTE', 'PROCESSANDO', 'PROCESSADO', 'PROCESSADO_COM_AVISOS', 'ERRO', 'MANUAL');

-- CreateEnum
CREATE TYPE "RegimeTributario" AS ENUM ('SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI');

-- CreateEnum
CREATE TYPE "PorteEmpresa" AS ENUM ('MEI', 'ME', 'EPP');

-- CreateEnum
CREATE TYPE "TipoObrigacaoFiscal" AS ENUM ('PGDAS_D', 'DAS', 'DEFIS', 'MAED');

-- CreateEnum
CREATE TYPE "NaturezaObrigacao" AS ENUM ('DECLARACAO', 'PAGAMENTO', 'MULTA');

-- CreateEnum
CREATE TYPE "StatusObrigacaoFiscal" AS ENUM ('PENDENTE', 'ATRASADA', 'CUMPRIDA', 'CUMPRIDA_ATRASO', 'CANCELADA');

-- CreateTable
CREATE TABLE "EmpresaFiscal" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "regime" "RegimeTributario" NOT NULL DEFAULT 'SIMPLES_NACIONAL',
    "porte" "PorteEmpresa" NOT NULL DEFAULT 'ME',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmpresaFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObrigacaoFiscal" (
    "id" TEXT NOT NULL,
    "empresaFiscalId" TEXT NOT NULL,
    "tipo" "TipoObrigacaoFiscal" NOT NULL,
    "natureza" "NaturezaObrigacao" NOT NULL,
    "competencia" TIMESTAMP(3) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusObrigacaoFiscal" NOT NULL DEFAULT 'PENDENTE',
    "dataCumprimento" TIMESTAMP(3),
    "valorTotal" DECIMAL(12,2),
    "observacoes" TEXT,
    "obrigacaoPaiId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObrigacaoFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoFiscal" (
    "id" TEXT NOT NULL,
    "empresaFiscalId" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumentoFiscal" NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "arquivoUrl" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "hashArquivo" TEXT NOT NULL,
    "statusProcessamento" "StatusProcessamentoFiscal" NOT NULL DEFAULT 'PENDENTE',
    "erroProcessamento" TEXT,
    "textoExtraido" TEXT,
    "dadosExtraidos" JSONB,
    "competencia" TIMESTAMP(3),
    "vencimento" TIMESTAMP(3),
    "valorTotal" DECIMAL(12,2),
    "numeroDocumento" TEXT,
    "obrigacaoId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmpresaFiscal_cnpj_key" ON "EmpresaFiscal"("cnpj");
CREATE INDEX "EmpresaFiscal_cnpj_idx" ON "EmpresaFiscal"("cnpj");

-- CreateIndex
CREATE INDEX "ObrigacaoFiscal_empresaFiscalId_vencimento_idx" ON "ObrigacaoFiscal"("empresaFiscalId", "vencimento");
CREATE INDEX "ObrigacaoFiscal_status_idx" ON "ObrigacaoFiscal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoFiscal_obrigacaoId_key" ON "DocumentoFiscal"("obrigacaoId");
CREATE INDEX "DocumentoFiscal_empresaFiscalId_tipoDocumento_idx" ON "DocumentoFiscal"("empresaFiscalId", "tipoDocumento");
CREATE INDEX "DocumentoFiscal_competencia_idx" ON "DocumentoFiscal"("competencia");
CREATE INDEX "DocumentoFiscal_hashArquivo_idx" ON "DocumentoFiscal"("hashArquivo");

-- AddForeignKey
ALTER TABLE "ObrigacaoFiscal" ADD CONSTRAINT "ObrigacaoFiscal_empresaFiscalId_fkey" FOREIGN KEY ("empresaFiscalId") REFERENCES "EmpresaFiscal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObrigacaoFiscal" ADD CONSTRAINT "ObrigacaoFiscal_obrigacaoPaiId_fkey" FOREIGN KEY ("obrigacaoPaiId") REFERENCES "ObrigacaoFiscal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoFiscal" ADD CONSTRAINT "DocumentoFiscal_empresaFiscalId_fkey" FOREIGN KEY ("empresaFiscalId") REFERENCES "EmpresaFiscal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoFiscal" ADD CONSTRAINT "DocumentoFiscal_obrigacaoId_fkey" FOREIGN KEY ("obrigacaoId") REFERENCES "ObrigacaoFiscal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
