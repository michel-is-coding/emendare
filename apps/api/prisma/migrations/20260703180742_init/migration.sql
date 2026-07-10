CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "AmendmentStatus" AS ENUM ('PENDING', 'RECEIVABLE', 'IRRECEIVABLE');

-- CreateTable
CREATE TABLE "LawText" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reference" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LawText_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amendment" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'assemblee_nationale',
    "externalId" TEXT NOT NULL,
    "legislature" INTEGER,
    "articleReference" TEXT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "status" "AmendmentStatus" NOT NULL DEFAULT 'PENDING',
    "lawTextId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Amendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmendmentAnalysis" (
    "id" TEXT NOT NULL,
    "amendmentId" TEXT NOT NULL,
    "reviewerType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmendmentAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LawText_externalId_key" ON "LawText"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Amendment_externalId_key" ON "Amendment"("externalId");

-- CreateIndex
CREATE INDEX "Amendment_status_idx" ON "Amendment"("status");

-- CreateIndex
CREATE INDEX "AmendmentAnalysis_amendmentId_createdAt_idx" ON "AmendmentAnalysis"("amendmentId", "createdAt");

-- AddForeignKey
ALTER TABLE "Amendment" ADD CONSTRAINT "Amendment_lawTextId_fkey" FOREIGN KEY ("lawTextId") REFERENCES "LawText"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmendmentAnalysis" ADD CONSTRAINT "AmendmentAnalysis_amendmentId_fkey" FOREIGN KEY ("amendmentId") REFERENCES "Amendment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
