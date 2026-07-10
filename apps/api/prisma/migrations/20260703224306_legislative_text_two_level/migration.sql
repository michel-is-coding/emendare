/*
  Warnings:

  - You are about to drop the `LawText` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "LegislativeTextKind" AS ENUM ('BILL', 'CONSOLIDATED');

-- CreateEnum
CREATE TYPE "TextNature" AS ENUM ('projet_de_loi', 'proposition_de_loi', 'projet_loi_finances', 'projet_loi_financement_securite_sociale', 'projet_loi_ratification_ordonnance', 'revision_constitutionnelle', 'proposition_loi_organique', 'projet_loi_organique');

-- CreateEnum
CREATE TYPE "TextVersion" AS ENUM ('texte_initial', 'texte_commission', 'texte_transmis_senat', 'texte_retour_senat', 'texte_cmp', 'lecture_definitive');

-- CreateEnum
CREATE TYPE "TextModificationType" AS ENUM ('modification', 'creation', 'abrogation', 'ratification', 'codification');

-- DropForeignKey
ALTER TABLE "Amendment" DROP CONSTRAINT "Amendment_lawTextId_fkey";

-- DropIndex
DROP INDEX "Amendment_embedding_hnsw_idx";

-- AlterTable
ALTER TABLE "Amendment" ADD COLUMN     "nature" "TextNature";

-- DropTable
DROP TABLE "LawText";

-- CreateTable
CREATE TABLE "LegislativeText" (
    "id" TEXT NOT NULL,
    "kind" "LegislativeTextKind" NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "nature" "TextNature",
    "legislature" INTEGER,
    "reference" TEXT,
    "title" TEXT,
    "version" "TextVersion",
    "content" TEXT,
    "dossierRef" TEXT,
    "priorYearTextId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegislativeText_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextReference" (
    "id" TEXT NOT NULL,
    "amendmentId" TEXT,
    "billTextId" TEXT,
    "rawCitation" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "texteSource" TEXT,
    "article" TEXT,
    "typeModification" "TextModificationType",
    "identifiantLegi" TEXT,
    "dateVersionConsultee" TIMESTAMP(3),
    "consolidatedTextId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegislativeText_externalId_key" ON "LegislativeText"("externalId");

-- CreateIndex
CREATE INDEX "LegislativeText_kind_nature_legislature_idx" ON "LegislativeText"("kind", "nature", "legislature");

-- CreateIndex
CREATE INDEX "LegislativeText_dossierRef_idx" ON "LegislativeText"("dossierRef");

-- CreateIndex
CREATE INDEX "TextReference_billTextId_idx" ON "TextReference"("billTextId");

-- CreateIndex
CREATE INDEX "TextReference_consolidatedTextId_idx" ON "TextReference"("consolidatedTextId");

-- CreateIndex
CREATE UNIQUE INDEX "TextReference_amendmentId_origin_rawCitation_key" ON "TextReference"("amendmentId", "origin", "rawCitation");

-- CreateIndex
CREATE INDEX "Amendment_nature_idx" ON "Amendment"("nature");

-- AddForeignKey
ALTER TABLE "LegislativeText" ADD CONSTRAINT "LegislativeText_priorYearTextId_fkey" FOREIGN KEY ("priorYearTextId") REFERENCES "LegislativeText"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextReference" ADD CONSTRAINT "TextReference_amendmentId_fkey" FOREIGN KEY ("amendmentId") REFERENCES "Amendment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextReference" ADD CONSTRAINT "TextReference_billTextId_fkey" FOREIGN KEY ("billTextId") REFERENCES "LegislativeText"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextReference" ADD CONSTRAINT "TextReference_consolidatedTextId_fkey" FOREIGN KEY ("consolidatedTextId") REFERENCES "LegislativeText"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amendment" ADD CONSTRAINT "Amendment_lawTextId_fkey" FOREIGN KEY ("lawTextId") REFERENCES "LegislativeText"("id") ON DELETE SET NULL ON UPDATE CASCADE;
