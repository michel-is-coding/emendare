-- Recrée l'index HNSW kNN cosine sur Amendment.embedding.
--
-- PIÈGE PRISMA (récurrent) : la colonne `embedding` est `Unsupported("vector(1536)")`, donc
-- l'index HNSW est INVISIBLE au modèle Prisma. Chaque `prisma migrate dev` émet un
-- `DROP INDEX "Amendment_embedding_hnsw_idx"` — ici celui de 20260704074212_amendment_full_capture —
-- sans jamais le recréer. Il FAUT le recréer à la main après toute migration qui le droppe,
-- sinon la recherche de similarité repasse en full-scan silencieux.
-- Voir le premier rattrapage : 20260703224500_recreate_amendment_hnsw_index.
CREATE INDEX IF NOT EXISTS "Amendment_embedding_hnsw_idx" ON "Amendment"
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
