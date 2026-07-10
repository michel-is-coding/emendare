import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { EmbeddingService } from '../../embedding/embedding.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IngestionContext,
  Ingestor,
  IngestorRunOptions,
} from '../ingestor.interface';

interface PendingRow {
  id: string;
  articleReference: string | null;
  content: string;
  exposeSommaire: string | null;
}

/** Une page DB = un appel API d'embeddings (batch). */
const PAGE_SIZE = 200;
const LOG_EVERY_PAGES = 10;

/**
 * Backfill + fil de l'eau des embeddings pgvector des amendements.
 * Sélectionne tout amendement sans embedding OU embeddé avec un autre modèle
 * (idempotent ; un changement d'EMBEDDING_MODEL re-vectorise tout naturellement).
 * EXCLU du cron (autoRun=false, coût API) : déclenchement manuel uniquement,
 * POST /ingestion/amendment-embeddings/run (body {maxItems, legislatures} possible).
 */
@Injectable()
export class AmendmentEmbeddingsIngestor implements Ingestor {
  readonly name = 'amendment-embeddings';
  readonly description =
    'Vectorisation des amendements (pgvector) pour la recherche de similarité — manuel uniquement (coût API)';
  readonly autoRun = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingService,
  ) {}

  async run(
    ctx: IngestionContext,
    options?: IngestorRunOptions,
  ): Promise<void> {
    if (!this.embedding.isConfigured) {
      throw new Error(
        'Embedding provider not configured (EMBEDDING_API_KEY) — run skipped',
      );
    }

    const model = this.embedding.model;
    const legislatures = options?.legislatures;
    let remaining = options?.maxItems ?? Infinity;
    let cursor = '';
    let processed = 0;
    let pages = 0;

    await ctx.log('INFO', `Embedding pending amendments (model: ${model})`);

    for (;;) {
      if (remaining <= 0) {
        await ctx.log('INFO', 'maxItems reached, stopping');
        break;
      }
      const take = Math.min(PAGE_SIZE, remaining);
      const legislatureFilter =
        legislatures && legislatures.length > 0
          ? Prisma.sql`AND legislature IN (${Prisma.join(legislatures)})`
          : Prisma.empty;

      // Keyset pagination sur id (cuid, trié) — stable même si des lignes
      // sortent du filtre au fil des updates.
      const rows = await this.prisma.$queryRaw<PendingRow[]>`
        SELECT id, "articleReference", content, "exposeSommaire"
        FROM "Amendment"
        WHERE (embedding IS NULL OR "embeddingModel" IS DISTINCT FROM ${model})
          AND content <> ''
          AND id > ${cursor}
          ${legislatureFilter}
        ORDER BY id
        LIMIT ${take}`;
      if (rows.length === 0) break;
      cursor = rows[rows.length - 1].id;
      remaining -= rows.length;

      const texts = rows.map((row) => this.embedding.buildEmbeddingText(row));
      const embeddings = await this.embedding.generateEmbeddings(texts);

      // Un seul UPDATE par page : 200 statements individuels en transaction
      // dépassent le timeout Prisma (5s) à cause du poids des vecteurs (~19 Ko).
      const ids = rows.map((row) => row.id);
      const literals = embeddings.map((e) => this.embedding.toVectorLiteral(e));
      await this.prisma.$executeRaw`
        UPDATE "Amendment" AS a
        SET embedding = u.embedding::vector,
            "embeddingModel" = ${model},
            "embeddedAt" = now()
        FROM unnest(${ids}::text[], ${literals}::text[]) AS u(id, embedding)
        WHERE a.id = u.id`;

      processed += rows.length;
      await ctx.progress({ seen: rows.length, upserted: rows.length });
      pages += 1;
      if (pages % LOG_EVERY_PAGES === 0) {
        await ctx.log('INFO', `Progress: ${processed} amendments embedded`);
      }
    }

    await ctx.log('INFO', `Done: ${processed} amendments embedded`);
  }
}
