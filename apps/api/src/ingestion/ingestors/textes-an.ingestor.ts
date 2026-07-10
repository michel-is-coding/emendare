import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  Prisma,
  TextNature,
  TextVersion,
} from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { downloadAndExtractAnDataset, walkJsonFiles } from '../an-dataset.util';
import {
  IngestionContext,
  Ingestor,
  IngestorRunOptions,
} from '../ingestor.interface';

/** Vue minimale du document nettoyé par @tricoteuses/assemblee (cleanDocumentOrDivision). */
interface DocumentClean {
  uid: string;
  legislature?: number | string;
  xsiType: string;
  denominationStructurelle: string;
  provenance?: string;
  titres?: { titrePrincipal?: string; titrePrincipalCourt?: string };
  dossierRef?: string;
  classification?: {
    sousType?: { code?: string; libelle?: string };
    type?: { code?: string; libelle?: string };
  };
}

/**
 * Vue minimale d'un acte législatif nettoyé (structure récursive du dossier).
 * NB : le cleaner suffixe les renvois d'uid par `Ref` (texteAssocie → texteAssocieRef).
 */
interface ActeLegislatifClean {
  codeActe?: string;
  texteAssocieRef?: string;
  texteAdopteRef?: string | null;
  actesLegislatifs?: ActeLegislatifClean[] | ActeLegislatifClean | null;
}

/** Vue minimale du dossier parlementaire nettoyé. */
interface DossierParlementaireClean {
  uid?: string;
  actesLegislatifs?: ActeLegislatifClean[] | null;
}

interface TricoteusesDataset {
  name: string;
  legislature: number;
  url?: string;
}

const UPSERT_CHUNK_SIZE = 100;
const PROGRESS_EVERY = 1000;

/**
 * Nature PRÉCISE d'un texte, depuis denominationStructurelle + classification.sousType.code.
 * C'est ici — pas en Phase 1 — qu'on distingue PLFSS de PLF (sousType FINSSOC vs FIN…).
 * Valeurs cibles = enum E0 (e0_fiche_texte.schema.json). Un code inconnu retombe sur la
 * nature générique (projet/proposition) ; les résolutions/avis/rapports restent sans nature.
 */
function natureFromDocument(
  denomination: string,
  sousTypeCode?: string,
): TextNature | undefined {
  const code = sousTypeCode?.toUpperCase();

  // Loi constitutionnelle (projet OU proposition) → révision constitutionnelle.
  if (code === 'CONST') return 'revision_constitutionnelle';

  if (denomination === 'Projet de loi') {
    switch (code) {
      case 'FINSSOC':
      case 'FINSSOCREC':
        return 'projet_loi_financement_securite_sociale';
      case 'FIN':
      case 'FINRECT':
      case 'FINGEST':
      case 'RGLTBUDG':
      case 'RGLTBUDG2':
        return 'projet_loi_finances';
      case 'ORG':
        return 'projet_loi_organique';
      default:
        // AUTRATCONV (ratification de convention) et autres → PJL ordinaire.
        return 'projet_de_loi';
    }
  }

  if (denomination === 'Proposition de loi') {
    return code === 'ORG' ? 'proposition_loi_organique' : 'proposition_de_loi';
  }

  // Proposition de résolution, Avis, Rapport, Motion, … : pas une nature de loi.
  return undefined;
}

/**
 * Phase de lecture depuis un codeActe du dossier législatif : "AN1-DEPOT" → "AN1".
 * Valeurs attendues : AN1/ANLUNI (1re lecture), AN2/AN3/ANNLEC (lectures suivantes),
 * ANLDEF (définitive), CMP, SN1/SN2/SNNLEC (Sénat), PROM… — pilote le régime art. 45.
 */
function lectureCodeFromCodeActe(codeActe?: string): string | undefined {
  if (!codeActe) return undefined;
  return codeActe.split('-')[0] || undefined;
}

/**
 * Parcourt récursivement les actes d'un dossier et associe chaque texte référencé
 * (texteAssocie/texteAdopte = uid du Document) à sa phase de lecture.
 */
function collectLecturesFromActes(
  actes: ActeLegislatifClean[] | ActeLegislatifClean | null | undefined,
  out: Map<string, string>,
): void {
  const list = Array.isArray(actes) ? actes : actes ? [actes] : [];
  for (const acte of list) {
    const lecture = lectureCodeFromCodeActe(acte.codeActe);
    if (lecture) {
      // Un texte est associé à sa lecture au moment de son DÉPÔT : on ne réécrit pas
      // une lecture déjà posée (un même uid peut réapparaître sous des actes ultérieurs).
      if (acte.texteAssocieRef && !out.has(acte.texteAssocieRef))
        out.set(acte.texteAssocieRef, lecture);
      if (acte.texteAdopteRef && !out.has(acte.texteAdopteRef))
        out.set(acte.texteAdopteRef, lecture);
    }
    collectLecturesFromActes(acte.actesLegislatifs, out);
  }
}

/** Stade de navette (E1 version_texte) depuis Document.provenance. */
function versionFromProvenance(provenance?: string): TextVersion | undefined {
  switch (provenance) {
    case 'Texte Déposé':
      return 'texte_initial';
    case 'Commission':
      return 'texte_commission';
    // "Séance" et les stades Sénat/CMP ne se déduisent pas ici (pas de valeur E1 dédiée AN).
    default:
      return undefined;
  }
}

/** Label humain court : "PLFSS 2026" / "PLF 2025", sinon le titre court du texte. */
function referenceLabel(
  nature: TextNature | undefined,
  titres?: { titrePrincipal?: string; titrePrincipalCourt?: string },
): string | undefined {
  const year = /pour\s+(\d{4})/i.exec(titres?.titrePrincipal ?? '')?.[1];
  if (nature === 'projet_loi_financement_securite_sociale' && year)
    return `PLFSS ${year}`;
  if (nature === 'projet_loi_finances' && year) return `PLF ${year}`;
  return titres?.titrePrincipalCourt || titres?.titrePrincipal || undefined;
}

/**
 * Harvester (b') : textes législatifs de l'AN (projets/propositions), depuis le dump open data
 * "dossiers législatifs". Enrichit les stubs BILL créés par l'ingestor amendements (même clé
 * externalId = uid du document) avec la NATURE PRÉCISE (PLFSS/PLF/organique…), le titre, la
 * version de navette et le dossierRef, puis propage la nature aux amendements.
 * Souverain : dump étatique + nettoyage @tricoteuses/assemblee en local, aucune API tierce.
 */
@Injectable()
export class TextesAnIngestor implements Ingestor {
  readonly name = 'textes-an';
  readonly description =
    'Textes législatifs AN (projets/propositions — dump dossiers législatifs) : nature précise (PLFSS/PLF…), versions, dossierRef';

  private readonly logger = new Logger(TextesAnIngestor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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

    const loaders = (await import('@tricoteuses/assemblee/loaders')) as {
      datasets: { dossiersLegislatifs: TricoteusesDataset[] };
    };
    const cleaners = (await import('@tricoteuses/assemblee/cleaners')) as {
      cleanDocumentOrDivision: (data: unknown) => DocumentClean;
      cleanDossierParlementaire: (data: unknown) => DossierParlementaireClean;
    };

    let remaining = options?.maxItems ?? Infinity;

    for (const legislature of legislatures) {
      const dataset = loaders.datasets.dossiersLegislatifs.find(
        (d) => d.legislature === legislature && d.url,
      );
      if (!dataset?.url) {
        await ctx.log(
          'WARN',
          `No dossiersLegislatifs dataset URL for legislature ${legislature}, skipping`,
        );
        continue;
      }

      const extractDir = join(dataDir, dataset.name);
      await downloadAndExtractAnDataset(dataset.url, extractDir, ctx.log);

      const processed = await this.ingestDocuments(
        ctx,
        extractDir,
        legislature,
        cleaners.cleanDocumentOrDivision,
        cleaners.cleanDossierParlementaire,
        remaining,
      );
      remaining -= processed;
      if (remaining <= 0) {
        await ctx.log('INFO', 'maxItems reached, stopping');
        break;
      }
    }

    await this.backfillAmendmentNature(ctx);
  }

  private async ingestDocuments(
    ctx: IngestionContext,
    dir: string,
    legislature: number,
    cleanDocument: (data: unknown) => DocumentClean,
    cleanDossier: (data: unknown) => DossierParlementaireClean,
    maxItems: number,
  ): Promise<number> {
    let seen = 0;
    let upsertedTexts = 0;
    let failed = 0;
    let firstErrors = 0;
    let sinceProgress = 0;
    let batch: Prisma.LegislativeTextUpsertArgs[] = [];
    // uid de texte → phase de lecture (AN1, ANNLEC, CMP…), depuis les actes des dossiers.
    const lectureByTexte = new Map<string, string>();

    const flush = async () => {
      if (batch.length === 0) return;
      const rows = batch;
      batch = [];
      await this.prisma.$transaction(
        rows.map((args) => this.prisma.legislativeText.upsert(args)),
      );
      upsertedTexts += rows.length;
      await ctx.progress({ upserted: rows.length });
    };

    for await (const filePath of walkJsonFiles(dir)) {
      if (seen >= maxItems) break;
      let parsed: unknown;
      try {
        parsed = JSON.parse(await readFile(filePath, 'utf-8'));
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

      // Le dump mêle documents et dossiers parlementaires. Les dossiers portent la
      // phase de lecture (codeActe des actes législatifs) : on la collecte au passage.
      const rawDossier = (parsed as { dossierParlementaire?: unknown })
        ?.dossierParlementaire;
      if (rawDossier) {
        try {
          const dossier = cleanDossier(rawDossier);
          collectLecturesFromActes(dossier.actesLegislatifs, lectureByTexte);
        } catch {
          // Dossier illisible : la lecture restera inconnue pour ses textes — non bloquant.
        }
        continue;
      }

      const rawDoc = (parsed as { document?: unknown })?.document;
      if (!rawDoc) continue;

      seen += 1;
      sinceProgress += 1;
      if (sinceProgress >= PROGRESS_EVERY) {
        await ctx.progress({ seen: sinceProgress });
        sinceProgress = 0;
        await ctx.log(
          'INFO',
          `Progress: ${seen} documents vus, ${upsertedTexts} textes, ${failed} échecs`,
        );
      }

      let doc: DocumentClean;
      try {
        doc = cleanDocument(rawDoc);
      } catch (error) {
        failed += 1;
        if (firstErrors < 5) {
          firstErrors += 1;
          await ctx.log(
            'WARN',
            `cleanDocumentOrDivision failed for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        continue;
      }

      // On ne garde que les vrais textes de loi (pas les divisions/annexes internes).
      if (doc.xsiType !== 'texteLoi_Type' || !doc.uid) continue;

      const nature = natureFromDocument(
        doc.denominationStructurelle,
        doc.classification?.sousType?.code,
      );
      const version = versionFromProvenance(doc.provenance);
      const reference = referenceLabel(nature, doc.titres);
      const title = doc.titres?.titrePrincipal ?? null;
      const leg = Number(doc.legislature) || legislature;
      const dossierRef = doc.dossierRef ?? null;

      batch.push({
        where: { externalId: doc.uid },
        create: {
          kind: 'BILL',
          source: 'assemblee_nationale',
          externalId: doc.uid,
          nature: nature ?? null,
          legislature: leg,
          reference,
          title,
          version: version ?? null,
          dossierRef,
        },
        // Enrichit le stub Phase 1 sans écraser une nature connue par une valeur inconnue
        // (nature `undefined` ⇒ Prisma ignore le champ ; on ne rétrograde jamais vers null).
        update: {
          nature,
          legislature: leg,
          reference,
          title,
          version,
          dossierRef,
        },
      });
      if (batch.length >= UPSERT_CHUNK_SIZE) await flush();
    }

    await flush();
    await this.applyLectures(ctx, lectureByTexte);
    await ctx.progress({ seen: sinceProgress, failed });
    await ctx.log(
      'INFO',
      `Legislature ${legislature}: ${seen} documents vus, ${upsertedTexts} textes upsertés, ${failed} échecs`,
    );
    return seen;
  }

  /** Pose la phase de lecture sur les textes déjà en base (0 ligne si le texte est absent). */
  private async applyLectures(
    ctx: IngestionContext,
    lectureByTexte: Map<string, string>,
  ): Promise<void> {
    if (lectureByTexte.size === 0) return;
    const entries = [...lectureByTexte.entries()];
    let updated = 0;
    for (let i = 0; i < entries.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = entries.slice(i, i + UPSERT_CHUNK_SIZE);
      const results = await this.prisma.$transaction(
        chunk.map(([externalId, lectureCode]) =>
          this.prisma.legislativeText.updateMany({
            where: { externalId },
            data: { lectureCode },
          }),
        ),
      );
      updated += results.reduce((n, r) => n + r.count, 0);
    }
    await ctx.log(
      'INFO',
      `Lecture (navette) posée sur ${updated} texte(s) depuis ${lectureByTexte.size} acte(s) de dossier`,
    );
  }

  /**
   * Propage la nature précise du BILL vers ses amendements (la Phase 1 n'avait qu'une nature
   * grossière). Un seul UPDATE ... FROM, idempotent (ne touche que les lignes à corriger).
   */
  private async backfillAmendmentNature(ctx: IngestionContext): Promise<void> {
    const updated = await this.prisma.$executeRaw`
      UPDATE "Amendment" a
      SET nature = lt.nature
      FROM "LegislativeText" lt
      WHERE a."lawTextId" = lt.id
        AND lt.nature IS NOT NULL
        AND a.nature IS DISTINCT FROM lt.nature`;
    await ctx.log(
      'INFO',
      `Nature d'amendement recalée depuis le texte parent : ${updated} ligne(s)`,
    );
  }
}
