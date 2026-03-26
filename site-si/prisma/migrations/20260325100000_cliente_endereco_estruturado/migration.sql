-- AlterTable: substitui endereco único por campos estruturados (dados antigos vão para logradouro)
ALTER TABLE "Cliente" ADD COLUMN "logradouro" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "bairro" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "cidade" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "uf" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "cep" TEXT;

UPDATE "Cliente" SET "logradouro" = "endereco" WHERE "endereco" IS NOT NULL;

ALTER TABLE "Cliente" DROP COLUMN "endereco";
