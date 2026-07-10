import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  AmendmentStatus,
  TextNature,
} from '../../../generated/prisma/client.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { downloadAndExtractAnDataset, walkJsonFiles } from '../an-dataset.util';
import { CitationExtractionService } from '../citations/citation-extraction.service';
import type { ParsedReference } from '../citations/citation-extractor.interface';
import {
  IngestionContext,
  Ingestor,
  IngestorRunOptions,
} from '../ingestor.interface';

/** Minimal view of the cleaned amendement produced by @tricoteuses/assemblee. */
interface AmendementClean {
  uid: string;
  legislature: string;
  texteLegislatifRef: string;
  examenRef?: string;
  amendementParentRef?: string;
  identification: {
    numeroLong: string;
    numeroRect?: string;
    prefixeOrganeExamen?: string;
  };
  // NB : le cleaner renomme cosignataires.acteurRef → cosignatairesRefs (string[]).
  signataires?: {
    auteur?: {
      typeAuteur?: string;
      acteurRef?: string;
      gouvernementRef?: string;
      groupePolitiqueRef?: string;
    };
    cosignatairesRefs?: string[];
  };
  // NB : le cleaner remonte amendementStandard.alinea → alinea.
  pointeurFragmentTexte?: {
    division?: {
      titre?: string;
      articleDesignation?: string;
      divisionRattachee?: string;
      type?: string;
      articleAdditionnel?: string;
    };
    alinea?: { numero?: string; alineaDesignation?: string };
  };
  corps?: {
    contenuAuteur?: { dispositif?: string; exposeSommaire?: string };
  };
  /** Renvoi structuré au code consolidé visé (émis par le cleaner, exploité pour TextReference). */
  loiReference?: { codeLoi?: string; divisionCodeLoi?: string };
  cycleDeVie: {
    dateDepot?: string;
    datePublication?: string;
    dateSort?: string;
    soumisArticle40: string;
    sort?: string;
    etatDesTraitements: {
      etat: { code?: string; libelle: string };
      sousEtat?: { code?: string; libelle?: string };
    };
  };
}

/** Le cleaner laisse parfois passer des objets xsi:nil — on ne garde que les vraies chaînes. */
function asStr(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function asDate(v: unknown): Date | null {
  const s = asStr(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Un amendement prêt à l'upsert, avec son texte parent (BILL) et ses renvois extraits. */
interface AmendmentBatchItem {
  row: Prisma.AmendmentCreateInput;
  /** uid du texte législatif parent (= texteLegislatifRef), s'il est renseigné. */
  billExternalId?: string;
  refs: ParsedReference[];
}

/**
 * Nature grossière déduite du préfixe de l'uid du texte législatif AN.
 * Le préfixe ne distingue PAS PLFSS de PLF : la nature précise est posée en Phase 2
 * (ingestor textes-an, via classification.sousType). Ici on ne fait que projet vs proposition.
 */
function coarseNatureFromBillUid(uid: string): TextNature | undefined {
  if (uid.startsWith('PRJL')) return 'projet_de_loi';
  if (uid.startsWith('PION')) return 'proposition_de_loi';
  return undefined;
}

interface TricoteusesDataset {
  name: string;
  legislature: number;
  url?: string;
}

const UPSERT_CHUNK_SIZE = 100;
const PROGRESS_EVERY = 2000;

/**
 * Harvester (a) du CLAUDE.md : historique des amendements AN.
 * Télécharge le dump officiel open data de l'Assemblée nationale
 * (data.assemblee-nationale.fr), nettoie chaque amendement avec
 * @tricoteuses/assemblee, et upsert dans la table Amendment.
 * Aucun appel à l'infra Tricoteuses : seule la source étatique est contactée.
 */
@Injectable()
export class AmendementsAnIngestor implements Ingestor {
  readonly name = 'amendements-an';
  readonly description =
    "Amendements de l'Assemblée nationale (dump open data officiel, nettoyage @tricoteuses/assemblee)";

  private readonly logger = new Logger(AmendementsAnIngestor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly citations: CitationExtractionService,
  ) {}

  async run(
    ctx: IngestionContext,
    options?: IngestorRunOptions,
  ): Promise<void> {
    const legislatures =
      options?.legislatures ??
      (this.config.get<string>('AN_LEGISLATURES') ?? '17')
        .split(',')
        .map((l) => Number(l.trim()))
        .filter((l) => Number.isInteger(l) && l > 0);

    const dataDir = join(
      this.config.get<string>('DATA_DIR') ?? './data',
      'assemblee',
    );
    await mkdir(dataDir, { recursive: true });

    // @tricoteuses/assemblee is ESM-only; this API build is CJS → dynamic import.
    const loaders = (await import('@tricoteuses/assemblee/loaders')) as {
      datasets: { amendements: TricoteusesDataset[] };
    };
    const cleaners = (await import('@tricoteuses/assemblee/cleaners')) as {
      cleanAmendement: (data: unknown) => AmendementClean;
    };

    let remaining = options?.maxItems ?? Infinity;

    for (const legislature of legislatures) {
      const dataset = loaders.datasets.amendements.find(
        (d) => d.legislature === legislature && d.url,
      );
      if (!dataset?.url) {
        await ctx.log(
          'WARN',
          `No amendements dataset URL for legislature ${legislature}, skipping`,
        );
        continue;
      }

      const extractDir = join(dataDir, dataset.name);
      await downloadAndExtractAnDataset(dataset.url, extractDir, ctx.log);

      const processed = await this.ingestDirectory(
        ctx,
        extractDir,
        legislature,
        cleaners.cleanAmendement,
        remaining,
      );
      remaining -= processed;
      if (remaining <= 0) {
        await ctx.log('INFO', 'maxItems reached, stopping');
        break;
      }
    }
  }

  private async ingestDirectory(
    ctx: IngestionContext,
    dir: string,
    legislature: number,
    cleanAmendement: (data: unknown) => AmendementClean,
    maxItems: number,
  ): Promise<number> {
    let seen = 0;
    let failed = 0;
    let firstErrors = 0;
    let batch: AmendmentBatchItem[] = [];
    let sinceProgress = 0;

    const flush = async () => {
      if (batch.length === 0) return;
      const items = batch;
      batch = [];

      // 1. Upsert (idempotent) des textes parents (BILL) référencés par ce lot.
      //    Fait avant les amendements → l'amendement se contente d'un `connect`,
      //    évitant les courses de connectOrCreate quand N amendements pointent le même texte.
      const billRefs = [
        ...new Set(
          items
            .map((it) => it.billExternalId)
            .filter((ref): ref is string => !!ref),
        ),
      ];
      if (billRefs.length > 0) {
        await this.prisma.legislativeText.createMany({
          data: billRefs.map((externalId) => ({
            kind: 'BILL' as const,
            source: 'assemblee_nationale',
            externalId,
            legislature,
            nature: coarseNatureFromBillUid(externalId) ?? null,
          })),
          skipDuplicates: true,
        });
      }

      // 2. Upsert les amendements, liés à leur BILL par externalId.
      const upserted = await this.prisma.$transaction(
        items.map((it) => {
          const data: Prisma.AmendmentCreateInput = it.billExternalId
            ? {
                ...it.row,
                lawText: { connect: { externalId: it.billExternalId } },
              }
            : it.row;
          return this.prisma.amendment.upsert({
            where: { externalId: data.externalId },
            create: data,
            update: data,
          });
        }),
      );

      // 3. Renvois (TextReference) : purge PAR LOT des origins gérées, puis recréation.
      //    Purger tous les amendements du lot (pas seulement ceux qui ont encore des renvois)
      //    garde l'idempotence même quand un amendement n'en produit plus (évolution des extracteurs).
      const idByExternal = new Map(upserted.map((a) => [a.externalId, a.id]));
      const refData = items.flatMap((it) => {
        const amendmentId = idByExternal.get(it.row.externalId);
        if (!amendmentId) return [];
        return it.refs.map((r) => ({
          amendmentId,
          rawCitation: r.rawCitation,
          origin: r.origin,
          texteSource: r.texteSource ?? null,
          article: r.article ?? null,
          typeModification: r.typeModification ?? null,
          identifiantLegi: r.identifiantLegi ?? null,
        }));
      });
      await this.prisma.$transaction([
        this.prisma.textReference.deleteMany({
          where: {
            amendmentId: { in: upserted.map((a) => a.id) },
            origin: { in: this.citations.origins },
          },
        }),
        ...(refData.length > 0
          ? [
              this.prisma.textReference.createMany({
                data: refData,
                skipDuplicates: true,
              }),
            ]
          : []),
      ]);

      await ctx.progress({ upserted: upserted.length });
    };

    const reportProgress = async () => {
      sinceProgress += 1;
      if (sinceProgress >= PROGRESS_EVERY) {
        await ctx.progress({ seen: sinceProgress });
        sinceProgress = 0;
        await ctx.log(
          'INFO',
          `Progress: ${seen} seen, ${failed} failed (legislature ${legislature})`,
        );
      }
    };

    for await (const filePath of walkJsonFiles(dir)) {
      if (seen >= maxItems) break;
      let rawItems: unknown[];
      try {
        rawItems = this.extractRawAmendements(
          JSON.parse(await readFile(filePath, 'utf-8')),
        );
      } catch (error) {
        failed += 1;
        if (firstErrors < 5) {
          firstErrors += 1;
          await ctx.log(
            'WARN',
            `Unreadable file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        continue;
      }

      for (const raw of rawItems) {
        if (seen >= maxItems) break;
        seen += 1;
        await reportProgress();
        try {
          const clean = cleanAmendement(raw);
          const contenu = clean.corps?.contenuAuteur;
          batch.push({
            row: this.toAmendmentRow(clean, legislature),
            billExternalId: clean.texteLegislatifRef?.trim() || undefined,
            refs: this.citations.extract({
              content: contenu?.dispositif ?? '',
              exposeSommaire: contenu?.exposeSommaire ?? null,
              loiReference: clean.loiReference ?? null,
            }),
          });
        } catch (error) {
          failed += 1;
          if (firstErrors < 5) {
            firstErrors += 1;
            await ctx.log(
              'WARN',
              `cleanAmendement failed for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
        if (batch.length >= UPSERT_CHUNK_SIZE) await flush();
      }
    }

    await flush();
    await ctx.progress({ seen: sinceProgress, failed });
    await ctx.log(
      'INFO',
      `Legislature ${legislature} done: ${seen} seen, ${failed} failed`,
    );
    return seen;
  }

  /** The AN dump mixes per-amendement files and texteLegislatif containers. */
  private extractRawAmendements(parsed: unknown): unknown[] {
    if (parsed == null || typeof parsed !== 'object') return [];
    const obj = parsed as Record<string, unknown>;

    if (obj.amendement) return [obj.amendement];

    const texte = obj.texteLegislatif as Record<string, unknown> | undefined;
    const container = (texte?.amendements ?? obj.amendements) as
      Record<string, unknown> | unknown[] | undefined;
    if (Array.isArray(container)) return container;
    if (container && typeof container === 'object') {
      const inner = container.amendement;
      if (Array.isArray(inner)) return inner;
      if (inner) return [inner];
    }
    return [];
  }

  private toAmendmentRow(
    a: AmendementClean,
    legislature: number,
  ): Prisma.AmendmentCreateInput {
    const division = a.pointeurFragmentTexte?.division;
    const alinea = a.pointeurFragmentTexte?.alinea;
    const contenu = a.corps?.contenuAuteur;
    const auteur = a.signataires?.auteur;
    const cosign = a.signataires?.cosignatairesRefs;
    const sort = a.cycleDeVie.sort;
    const etat = a.cycleDeVie.etatDesTraitements.etat.libelle;
    const articleAdditionnel = asStr(division?.articleAdditionnel);

    return {
      source: 'assemblee_nationale',
      externalId: a.uid,
      legislature: Number(a.legislature) || legislature,
      numero: a.identification.numeroLong,
      texteRef: a.texteLegislatifRef,
      articleReference:
        division?.divisionRattachee ??
        division?.articleDesignation ??
        division?.titre ??
        null,
      title: a.identification.numeroLong,
      // Nature grossière (projet/proposition) ; affinée en Phase 2 depuis le BILL.
      nature: coarseNatureFromBillUid(a.texteLegislatifRef) ?? null,
      content: contenu?.dispositif ?? '',
      exposeSommaire: contenu?.exposeSommaire ?? null,
      etat,
      // Les codes Eloi (IRR45, IRRAIF, IRRHD…) sont plus fins que les libellés :
      // ils portent le motif d'irrecevabilité exploité par l'agent recevabilité.
      etatCode: asStr(a.cycleDeVie.etatDesTraitements.etat.code),
      sousEtat: asStr(a.cycleDeVie.etatDesTraitements.sousEtat?.libelle),
      sousEtatCode: asStr(a.cycleDeVie.etatDesTraitements.sousEtat?.code),
      sort: sort ?? null,
      // Le dump encode "true"/"false" (pas "1") — l'ancien test `=== '1'` était toujours faux.
      soumisArticle40: ['true', '1'].includes(a.cycleDeVie.soumisArticle40),
      dateDepot: asDate(a.cycleDeVie.dateDepot),
      datePublication: asDate(a.cycleDeVie.datePublication),
      dateSort: asDate(a.cycleDeVie.dateSort),
      status: this.deriveStatus(sort, etat),
      // Identification étendue + signataires (référentiels acteurs/organes AN)
      numeroRect: asStr(a.identification.numeroRect),
      organeExamen: asStr(a.identification.prefixeOrganeExamen),
      examenRef: asStr(a.examenRef),
      amendementParentRef: asStr(a.amendementParentRef),
      auteurType: asStr(auteur?.typeAuteur),
      auteurRef: asStr(auteur?.acteurRef) ?? asStr(auteur?.gouvernementRef),
      groupePolitiqueRef: asStr(auteur?.groupePolitiqueRef),
      cosignataireRefs: (cosign ?? [])
        .map(asStr)
        .filter((r): r is string => r !== null),
      // Pointeur de fragment : scalaires requêtables + objet complet
      alineaNumero: asStr(alinea?.numero),
      alineaDesignation: asStr(alinea?.alineaDesignation),
      articleAdditionnel:
        articleAdditionnel === null ? null : articleAdditionnel === 'true',
      pointeurFragment: a.pointeurFragmentTexte ?? Prisma.JsonNull,
      // Amendement nettoyé complet — garantie « rien n'est perdu »
      raw: a as unknown as Prisma.InputJsonValue,
    };
  }

  /**
   * Le sort officiel AN fournit un corpus labellisé pour la recevabilité :
   * un amendement discuté (adopté/rejeté/retiré/tombé) a passé le filtre.
   */
  private deriveStatus(
    sort: string | undefined,
    etat: string,
  ): AmendmentStatus {
    const haystack = `${sort ?? ''} ${etat}`.toLowerCase();
    if (haystack.includes('irrecevable')) return 'IRRECEIVABLE';
    if (sort) return 'RECEIVABLE';
    return 'PENDING';
  }
}
