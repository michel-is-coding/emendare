-- Agent recevabilité (docs/metier/procedure-recevabilite-agent.md)
-- Migration écrite à la main : ADD COLUMN uniquement, ne touche pas l'index HNSW
-- (le diff automatique Prisma le droppe — cf. migrations *_recreate_amendment_hnsw_index).

-- Codes Eloi fins (le libellé seul ne distingue pas Cavalier/Entonnoir/CMP → IRR45 etc.)
ALTER TABLE "Amendment" ADD COLUMN "etatCode" TEXT;
ALTER TABLE "Amendment" ADD COLUMN "sousEtatCode" TEXT;

-- Phase de lecture du texte (préfixe codeActe du dossier législatif : AN1, ANNLEC, ANLDEF, CMP…)
ALTER TABLE "LegislativeText" ADD COLUMN "lectureCode" TEXT;

-- Verdict structuré de l'agent recevabilité
ALTER TABLE "AmendmentAnalysis" ADD COLUMN "sort" TEXT;
ALTER TABLE "AmendmentAnalysis" ADD COLUMN "motifCode" TEXT;
ALTER TABLE "AmendmentAnalysis" ADD COLUMN "motifLibelle" TEXT;
ALTER TABLE "AmendmentAnalysis" ADD COLUMN "fondement" TEXT;
ALTER TABLE "AmendmentAnalysis" ADD COLUMN "fastTrack" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AmendmentAnalysis" ADD COLUMN "model" TEXT;
ALTER TABLE "AmendmentAnalysis" ADD COLUMN "trace" JSONB;
