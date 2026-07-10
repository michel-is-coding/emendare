import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { TextNature } from '../../generated/prisma/client.js';
import { EmbeddingService } from '../embedding/embedding.service';
import { PrismaService } from '../prisma/prisma.service';

export interface SimilarQueryOptions {
  take: number;
  legislature?: number;
  texteRef?: string;
  /** Restreindre à une nature de texte (ex: précédents à travers tous les PLFSS). */
  nature?: TextNature;
  /** Exclure les amendements du même texte (recherche de précédents ailleurs). */
  excludeSameTexte?: boolean;
}

export interface SimilarAmendment {
  id: string;
  numero: string | null;
  legislature: number | null;
  texteRef: string | null;
  nature: string | null;
  articleReference: string | null;
  sort: string | null;
  etat: string | null;
  status: string;
  dateDepot: Date | null;
  /** Similarité cosine [0..1] et son arrondi en % (1 décimale). */
  similarity: number;
  similarityPct: number;
}

@Injectable()
export class AmendmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingService,
  ) {}

  async getById(id: string) {
    const amendment = await this.prisma.amendment.findUnique({
      where: { id },
      include: {
        // Niveau 1 : le texte parent en navette (BILL, nature PLFSS/PLF…).
        lawText: true,
        // Niveau 2 : renvois vers le droit consolidé / la LFSS N-1 (résolus si dispo).
        references: { include: { consolidatedText: true } },
      },
    });
    if (!amendment) throw new NotFoundException(`Amendment "${id}" not found`);
    return amendment;
  }

  /** Les N amendements les plus proches d'un amendement déjà en base. */
  async findSimilarById(
    id: string,
    options: SimilarQueryOptions,
  ): Promise<SimilarAmendment[]> {
    const rows = await this.prisma.$queryRaw<
      { embedding: string | null; texteRef: string | null }[]
    >`SELECT embedding::text AS embedding, "texteRef" FROM "Amendment" WHERE id = ${id}`;
    if (rows.length === 0) {
      throw new NotFoundException(`Amendment "${id}" not found`);
    }
    if (!rows[0].embedding) {
      throw new ConflictException(
        `Amendment "${id}" has no embedding yet — run the "amendment-embeddings" ingestor first`,
      );
    }
    return this.knn(rows[0].embedding, options, {
      excludeId: id,
      excludeTexteRef: options.excludeSameTexte
        ? (rows[0].texteRef ?? undefined)
        : undefined,
    });
  }

  /** Les N amendements les plus proches d'un texte libre (brouillon, upload). */
  async findSimilarByText(
    text: string,
    options: SimilarQueryOptions,
  ): Promise<SimilarAmendment[]> {
    const vector = await this.embedding.generateEmbedding(text);
    return this.knn(this.embedding.toVectorLiteral(vector), options, {});
  }

  private async knn(
    vectorLiteral: string,
    options: SimilarQueryOptions,
    exclusions: { excludeId?: string; excludeTexteRef?: string },
  ): Promise<SimilarAmendment[]> {
    const filters: Prisma.Sql[] = [Prisma.sql`embedding IS NOT NULL`];
    if (exclusions.excludeId) {
      filters.push(Prisma.sql`id <> ${exclusions.excludeId}`);
    }
    if (exclusions.excludeTexteRef) {
      filters.push(
        Prisma.sql`"texteRef" IS DISTINCT FROM ${exclusions.excludeTexteRef}`,
      );
    }
    if (options.legislature !== undefined) {
      filters.push(Prisma.sql`legislature = ${options.legislature}`);
    }
    if (options.texteRef) {
      filters.push(Prisma.sql`"texteRef" = ${options.texteRef}`);
    }
    if (options.nature) {
      // Nature dénormalisée sur Amendment → filtre mono-table (ex: tous les PLFSS).
      filters.push(Prisma.sql`nature = ${options.nature}::"TextNature"`);
    }
    const where = Prisma.join(filters, ' AND ');

    const rows = await this.prisma.$queryRaw<
      (Omit<SimilarAmendment, 'similarityPct'> & { similarity: number })[]
    >`
      SELECT id, numero, legislature, "texteRef", nature::text AS nature,
             "articleReference", sort, etat, status::text AS status, "dateDepot",
             1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "Amendment"
      WHERE ${where}
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${options.take}`;

    return rows.map((row) => {
      const similarity = Math.min(1, Math.max(0, row.similarity));
      return {
        ...row,
        similarity,
        similarityPct: Math.round(similarity * 1000) / 10,
      };
    });
  }
}
