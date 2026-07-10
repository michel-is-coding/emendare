-- AlterTable
ALTER TABLE "Amendment" ADD COLUMN     "embeddedAt" TIMESTAMP(3),
ADD COLUMN     "embedding" vector(1536),
ADD COLUMN     "embeddingModel" TEXT;

-- Index kNN cosine (hors Prisma : type d'index non supporté par le schema).
-- Params m/ef_construction = défauts éprouvés (cf. approche k-uriage).
CREATE INDEX "Amendment_embedding_hnsw_idx" ON "Amendment"
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
