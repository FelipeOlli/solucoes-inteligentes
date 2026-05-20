import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const result = await prisma.$executeRawUnsafe(
    `UPDATE "_prisma_migrations" SET rolled_back_at = NOW() WHERE migration_name = $1 AND finished_at IS NULL AND rolled_back_at IS NULL`,
    "20260520000001_add_nao_aplicavel_status"
  );
  console.log(`fix-failed-migration: ${result} row(s) updated`);
} catch (e) {
  console.error("fix-failed-migration error (non-fatal):", e.message);
} finally {
  await prisma.$disconnect();
}
