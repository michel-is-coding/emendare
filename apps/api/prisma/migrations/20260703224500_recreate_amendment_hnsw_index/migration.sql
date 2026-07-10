-- Recrée l'index HNSW kNN cosine sur Amendment.embedding.
--
-- PIÈGE PRISMA : la colonne `embedding` est `Unsupported("vector(1536)")`, donc l'index HNSW
-- (créé en SQL brut dans 20260703201101_amendment_embeddings) est INVISIBLE au modèle Prisma.
-- Chaque nouvelle migration générée par `prisma migrate dev` émet donc un `DROP INDEX
-- "Amendment_embedding_hnsw_idx"` (cf. 20260703224306_legislative_text_two_level) — sans le
-- recréer. Il FAUT le recréer à la main après toute migration qui le droppe, sinon la recherche
-- de similarité repasse en full-scan silencieux.
CREATE INDEX IF NOT EXISTS "Amendment_embedding_hnsw_idx" ON "Amendment"
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
