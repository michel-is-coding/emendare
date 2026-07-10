import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AmendmentStatus,
  LegislativeTextKind,
  Prisma,
  TextNature,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service';

export interface TextListOptions {
  kind?: LegislativeTextKind;
  nature?: TextNature;
  legislature?: number;
  take: number;
  skip: number;
}

/** Valeur sentinelle du filtre `sort` : amendements sans sort (à instruire). */
export const SORT_AUCUN = 'aucun';

export type AmendmentOrderBy = 'numero' | 'dateDepot';
export type VerdictFilter = 'RECEVABLE' | 'IRRECEVABLE';

export interface AmendmentListFilters {
  sort?: string;
  status?: AmendmentStatus;
  article?: string;
  q?: string;
  orderBy?: AmendmentOrderBy;
  verdict?: VerdictFilter;
}

/** Construit le `where` Prisma des filtres de liasse (pur, testé unitairement). */
export function buildAmendmentWhere(
  externalId: string,
  f: AmendmentListFilters,
): Prisma.AmendmentWhereInput {
  const where: Prisma.AmendmentWhereInput = { texteRef: externalId };
  if (f.sort === SORT_AUCUN) {
    where.OR = [{ sort: null }, { sort: '' }];
  } else if (f.sort) {
    where.sort = f.sort;
  }
  if (f.status) where.status = f.status;
  if (f.article) {
    where.articleReference = { contains: f.article, mode: 'insensitive' };
  }
  if (f.q) {
    // AND séparé : ne pas écraser le OR posé par sort=aucun.
    where.AND = [
      {
        OR: [
          { numero: { contains: f.q, mode: 'insensitive' } },
          { articleReference: { contains: f.q, mode: 'insensitive' } },
        ],
      },
    ];
  }
  return where;
}

/** Tri de la liasse — `numero` reste lexicographique (l'ordre d'appel = tbd n°6). */
export function buildAmendmentOrderBy(
  orderBy?: AmendmentOrderBy,
): Prisma.AmendmentOrderByWithRelationInput[] {
  if (orderBy === 'dateDepot') return [{ dateDepot: 'asc' }, { numero: 'asc' }];
  return [{ numero: 'asc' }];
}

/** Champs "carte" d'un texte (liste + versions + priorYear). */
const TEXT_SELECT = {
  id: true,
  kind: true,
  source: true,
  externalId: true,
  nature: true,
  legislature: true,
  reference: true,
  title: true,
  version: true,
  dossierRef: true,
  createdAt: true,
} satisfies Prisma.LegislativeTextSelect;

@Injectable()
export class TextsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Liste paginée des textes (par défaut les BILL), filtrable par nature/législature. */
  async list(opts: TextListOptions) {
    const where: Prisma.LegislativeTextWhereInput = {
      kind: opts.kind,
      nature: opts.nature,
      legislature: opts.legislature,
    };
    const [total, rows] = await Promise.all([
      this.prisma.legislativeText.count({ where }),
      this.prisma.legislativeText.findMany({
        where,
        orderBy: [{ legislature: 'desc' }, { reference: 'asc' }],
        take: opts.take,
        skip: opts.skip,
        select: TEXT_SELECT,
      }),
    ]);
    // Les amendements sont rattachés par `texteRef = externalId` (champ indexé peuplé
    // par l'ingestor), pas par la FK `lawTextId` — cf. getById. Comptage par lot.
    const externalIds = rows.map((r) => r.externalId);
    const counts = externalIds.length
      ? await this.prisma.amendment.groupBy({
          by: ['texteRef'],
          where: { texteRef: { in: externalIds } },
          _count: { _all: true },
        })
      : [];
    const countByRef = new Map(counts.map((c) => [c.texteRef, c._count._all]));
    const items = rows.map((r) => ({
      ...r,
      _count: { amendments: countByRef.get(r.externalId) ?? 0 },
    }));
    return { total, items };
  }

  /** Détail d'un texte : versions de navette, amendements, renvois agrégés, loi N-1. */
  async getById(id: string) {
    const text = await this.prisma.legislativeText.findUnique({
      where: { id },
      select: {
        ...TEXT_SELECT,
        content: true,
        priorYearText: { select: TEXT_SELECT },
        // Renvois portés par le texte lui-même (Phase 2+ : citations d'articles du texte).
        references: {
          select: {
            id: true,
            rawCitation: true,
            origin: true,
            texteSource: true,
            article: true,
            consolidatedText: { select: TEXT_SELECT },
          },
        },
      },
    });
    if (!text) throw new NotFoundException(`Text "${id}" not found`);

    // Autres versions du même dossier (navette : texte initial / commission / Sénat / …).
    // Filtré sur la même nature quand elle est connue → écarte avis/lettres/rapports du dossier.
    const versions = text.dossierRef
      ? await this.prisma.legislativeText.findMany({
          where: {
            dossierRef: text.dossierRef,
            kind: 'BILL',
            ...(text.nature ? { nature: text.nature } : {}),
          },
          orderBy: { createdAt: 'asc' },
          select: TEXT_SELECT,
        })
      : [];

    // Rattachement amendement→texte par `texteRef = externalId` (peuplé pour tous les
    // amendements et indexé), et non par la FK `lawTextId` (non fiable à l'ingestion).
    const [amendmentCount, amendments, referenced] = await Promise.all([
      this.prisma.amendment.count({ where: { texteRef: text.externalId } }),
      this.prisma.amendment.findMany({
        where: { texteRef: text.externalId },
        take: 50,
        orderBy: { numero: 'asc' },
        select: {
          id: true,
          numero: true,
          articleReference: true,
          nature: true,
          sort: true,
          status: true,
        },
      }),
      // Renvois agrégés des amendements → "ce PLFSS touche : CSS, LFSS 2025, …".
      this.prisma.textReference.groupBy({
        by: ['texteSource'],
        where: {
          amendment: { texteRef: text.externalId },
          texteSource: { not: null },
        },
        _count: { texteSource: true },
        orderBy: { _count: { texteSource: 'desc' } },
        take: 25,
      }),
    ]);

    return {
      ...text,
      versions,
      amendmentCount,
      amendments,
      referencedTexts: referenced.map((r) => ({
        texteSource: r.texteSource,
        count: r._count.texteSource,
      })),
    };
  }

  /** Amendements d'un texte, paginés, filtrés serveur + dernier verdict agent joint. */
  async listAmendments(
    id: string,
    take: number,
    skip: number,
    filters: AmendmentListFilters = {},
  ) {
    const externalId = await this.ensureExists(id);
    const where = buildAmendmentWhere(externalId, filters);
    if (filters.verdict) {
      // « Dernière analyse par amendement » n'est pas exprimable en filtre Prisma
      // (some() matcherait n'importe quelle analyse) → DISTINCT ON en SQL.
      where.id = {
        in: await this.amendmentIdsByLatestVerdict(externalId, filters.verdict),
      };
    }
    const [total, rows] = await Promise.all([
      this.prisma.amendment.count({ where }),
      this.prisma.amendment.findMany({
        where,
        take,
        skip,
        orderBy: buildAmendmentOrderBy(filters.orderBy),
        select: {
          id: true,
          numero: true,
          articleReference: true,
          nature: true,
          sort: true,
          etat: true,
          status: true,
          dateDepot: true,
          // Dernière analyse jointe en une requête (pas de N+1 côté front, tbd n°4).
          analyses: {
            select: {
              sort: true,
              motifCode: true,
              confidence: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);
    const items = rows.map(({ analyses, ...a }) => ({
      ...a,
      verdict: analyses[0] ?? null,
    }));
    return { total, items };
  }

  /** Compteurs sur TOUTE la liasse d'un texte (bandeau front, tbd n°2). */
  async stats(id: string) {
    const externalId = await this.ensureExists(id);
    const where = { texteRef: externalId };
    const [total, parSort, parStatus] = await Promise.all([
      this.prisma.amendment.count({ where }),
      this.prisma.amendment.groupBy({
        by: ['sort'],
        where,
        _count: { _all: true },
        orderBy: { _count: { sort: 'desc' } },
      }),
      this.prisma.amendment.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);
    return {
      total,
      parSort: parSort.map((g) => ({ sort: g.sort, count: g._count._all })),
      parStatus: parStatus.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
    };
  }

  /** Ids des amendements dont la DERNIÈRE analyse conclut au verdict donné. */
  private async amendmentIdsByLatestVerdict(
    externalId: string,
    verdict: VerdictFilter,
  ): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ amendmentId: string }[]>`
      SELECT sub."amendmentId" FROM (
        SELECT DISTINCT ON (an."amendmentId") an."amendmentId", an."sort"
        FROM "AmendmentAnalysis" an
        JOIN "Amendment" a ON a."id" = an."amendmentId"
        WHERE a."texteRef" = ${externalId}
        ORDER BY an."amendmentId", an."createdAt" DESC
      ) sub WHERE sub."sort" = ${verdict}`;
    return rows.map((r) => r.amendmentId);
  }

  /** Vérifie l'existence et renvoie l'externalId (clé de rattachement des amendements). */
  private async ensureExists(id: string): Promise<string> {
    const text = await this.prisma.legislativeText.findUnique({
      where: { id },
      select: { externalId: true },
    });
    if (!text) throw new NotFoundException(`Text "${id}" not found`);
    return text.externalId;
  }
}
