-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DONO', 'TECNICO');

-- AlterTable: User ganha papel e flag de ativação. Default DONO preserva
-- os usuários existentes — ninguém vira técnico por acidente.
ALTER TABLE "User" ADD COLUMN "role"  "UserRole" NOT NULL DEFAULT 'DONO';
ALTER TABLE "User" ADD COLUMN "ativo" BOOLEAN    NOT NULL DEFAULT true;

-- AlterTable: Tecnico ganha vínculo opcional com User (login) e flag de
-- técnico próprio (substitui a comparação por nome hardcoded em lib/lucro.ts)
ALTER TABLE "Tecnico" ADD COLUMN "userId"    TEXT;
ALTER TABLE "Tecnico" ADD COLUMN "ehProprio" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Tecnico_userId_key" ON "Tecnico"("userId");

-- AddForeignKey
ALTER TABLE "Tecnico" ADD CONSTRAINT "Tecnico_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Nota ganha visibilidade para o técnico, separada da
-- visibilidade para o cliente. Default true preserva o comportamento atual.
ALTER TABLE "Nota" ADD COLUMN "visivelTecnico" BOOLEAN NOT NULL DEFAULT true;
