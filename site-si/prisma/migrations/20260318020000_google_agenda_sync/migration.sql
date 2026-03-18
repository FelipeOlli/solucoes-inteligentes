-- Google Agenda integration, sync metadata and queue

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GoogleSyncState') THEN
    CREATE TYPE "GoogleSyncState" AS ENUM ('PENDING_CREATE', 'PENDING_UPDATE', 'PENDING_DELETE', 'IN_SYNC', 'ERROR');
  END IF;
END$$;

ALTER TABLE "Servico"
  ADD COLUMN IF NOT EXISTS "googleEventId" TEXT,
  ADD COLUMN IF NOT EXISTS "googleEtag" TEXT,
  ADD COLUMN IF NOT EXISTS "googleUpdatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "googleSyncState" "GoogleSyncState" DEFAULT 'IN_SYNC',
  ADD COLUMN IF NOT EXISTS "googleLastError" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Servico_googleEventId_key'
  ) THEN
    CREATE UNIQUE INDEX "Servico_googleEventId_key" ON "Servico"("googleEventId");
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "GoogleCalendarIntegration" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'google',
  "accountEmail" TEXT,
  "calendarId" TEXT NOT NULL DEFAULT 'primary',
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "tokenType" TEXT,
  "scope" TEXT,
  "expiryDate" TIMESTAMP(3),
  "watchChannelId" TEXT,
  "watchResourceId" TEXT,
  "watchExpiresAt" TIMESTAMP(3),
  "nextSyncToken" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarIntegration_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'GoogleCalendarIntegration_provider_key'
  ) THEN
    CREATE UNIQUE INDEX "GoogleCalendarIntegration_provider_key" ON "GoogleCalendarIntegration"("provider");
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "AgendaSyncQueue" (
  "id" TEXT NOT NULL,
  "servicoId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "payload" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgendaSyncQueue_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'AgendaSyncQueue_servicoId_fkey'
  ) THEN
    ALTER TABLE "AgendaSyncQueue"
      ADD CONSTRAINT "AgendaSyncQueue_servicoId_fkey"
      FOREIGN KEY ("servicoId") REFERENCES "Servico"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "AgendaSyncQueue_processedAt_createdAt_idx"
  ON "AgendaSyncQueue"("processedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "AgendaSyncQueue_servicoId_createdAt_idx"
  ON "AgendaSyncQueue"("servicoId", "createdAt");

