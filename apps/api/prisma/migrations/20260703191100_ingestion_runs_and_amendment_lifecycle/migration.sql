-- CreateEnum
CREATE TYPE "IngestionTrigger" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "IngestionRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "IngestionLogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- AlterTable
ALTER TABLE "Amendment" ADD COLUMN     "dateDepot" TIMESTAMP(3),
ADD COLUMN     "etat" TEXT,
ADD COLUMN     "exposeSommaire" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "sort" TEXT,
ADD COLUMN     "soumisArticle40" BOOLEAN,
ADD COLUMN     "texteRef" TEXT;

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "ingestor" TEXT NOT NULL,
    "trigger" "IngestionTrigger" NOT NULL,
    "status" "IngestionRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemsSeen" INTEGER NOT NULL DEFAULT 0,
    "itemsUpserted" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionLog" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "level" "IngestionLogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngestionRun_ingestor_startedAt_idx" ON "IngestionRun"("ingestor", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "IngestionLog_runId_createdAt_idx" ON "IngestionLog"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "Amendment_texteRef_idx" ON "Amendment"("texteRef");

-- CreateIndex
CREATE INDEX "Amendment_legislature_idx" ON "Amendment"("legislature");

-- AddForeignKey
ALTER TABLE "IngestionLog" ADD CONSTRAINT "IngestionLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
