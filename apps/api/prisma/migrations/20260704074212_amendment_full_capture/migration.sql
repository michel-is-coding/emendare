-- DropIndex
DROP INDEX "Amendment_embedding_hnsw_idx";

-- AlterTable
ALTER TABLE "Amendment" ADD COLUMN     "alineaDesignation" TEXT,
ADD COLUMN     "alineaNumero" TEXT,
ADD COLUMN     "amendementParentRef" TEXT,
ADD COLUMN     "articleAdditionnel" BOOLEAN,
ADD COLUMN     "auteurRef" TEXT,
ADD COLUMN     "auteurType" TEXT,
ADD COLUMN     "cosignataireRefs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "datePublication" TIMESTAMP(3),
ADD COLUMN     "dateSort" TIMESTAMP(3),
ADD COLUMN     "examenRef" TEXT,
ADD COLUMN     "groupePolitiqueRef" TEXT,
ADD COLUMN     "numeroRect" TEXT,
ADD COLUMN     "organeExamen" TEXT,
ADD COLUMN     "pointeurFragment" JSONB,
ADD COLUMN     "raw" JSONB,
ADD COLUMN     "sousEtat" TEXT;

-- CreateIndex
CREATE INDEX "Amendment_auteurRef_idx" ON "Amendment"("auteurRef");
