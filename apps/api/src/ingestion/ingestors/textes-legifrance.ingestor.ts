import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { downloadFileWithResume } from '../an-dataset.util';
import {
  extractTarGz,
  normalizeArticleNum,
  normalizeCodeName,
  parseJorfTexte,
  parseLegiArticle,
  walkFilesByExt,
} from '../legifrance-dila.util';
import {
  IngestionContext,
  Ingestor,
  IngestorRunOptions,
} from '../ingestor.interface';

const UPSERT_CHUNK_SIZE = 100;
const REF_SEP = ' — art. ';

/**
 * Harvester (b) du CLAUDE.md — niveau DROIT EN VIGUEUR (Légifrance), sur dumps DILA LOCAUX.
 * Télécharge les fonds officiels DILA (echanges.dila.gouv.fr/OPENDATA/ : LEGI = codes/articles
 * consolidés, JORF = lois promulguées dont les LFSS/LFI) et les parse en local (fast-xml-parser).
 * Décision 2026-07-04 : dumps DILA locaux, PAS l'API PISTE ni l'infra Tricoteuses (souveraineté).
 *
 * Crée des LegislativeText(kind=CONSOLIDATED) puis :
 *  - résout Amendment→TextReference.consolidatedText (renvois vers un article de code) ;
 *  - relie chaque PLFSS/PLF (BILL) à la LFSS/LFI de l'année N-1 (priorYearText).
 * Sans dump configuré ni données locales : étape ignorée proprement, le reste de l'app tourne.
 */
@Injectable()
export class TextesLegifranceIngestor implements Ingestor {
  readonly name = 'textes-legifrance';
  readonly description =
    'Droit consolidé Légifrance (dumps DILA locaux LEGI/JORF) : résout les renvois vers le droit en vigueur + relie la LFSS N-1';

  private readonly logger = new Logger(TextesLegifranceIngestor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async run(
    ctx: IngestionContext,
    options?: IngestorRunOptions,
  ): Promise<void> {
    const baseDir = join(
      this.config.get<string>('DATA_DIR') ?? './data',
      'legifrance',
    );
    await mkdir(baseDir, { recursive: true });

    const legiDir = await this.ensureFond(
      ctx,
      baseDir,
      'legi',
      this.config.get<string>('LEGIFRANCE_LEGI_URL'),
    );
    const jorfDir = await this.ensureFond(
      ctx,
      baseDir,
      'jorf',
      this.config.get<string>('LEGIFRANCE_JORF_URL'),
    );

    if (!legiDir && !jorfDir) {
      await ctx.log(
        'WARN',
        "Aucun dump DILA disponible (ni LEGIFRANCE_LEGI_URL/JORF_URL, ni données locales) — étape ignorée. Le reste de l'application fonctionne.",
      );
      return;
    }

    if (legiDir) {
      await this.ingestLegi(ctx, legiDir, options?.maxItems ?? Infinity);
      await this.resolveCodeReferences(ctx);
    }
    if (jorfDir) {
      await this.ingestJorfLois(ctx, jorfDir, options?.maxItems ?? Infinity);
      await this.resolveLawReferences(ctx);
    }
    await this.linkPriorYear(ctx);
  }

  /**
   * Rend un fond DILA prêt à lire : données locales déjà extraites, sinon extraction d'un
   * tar.gz déjà téléchargé, sinon téléchargement depuis `url`. `null` si rien de disponible.
   */
  private async ensureFond(
    ctx: IngestionContext,
    baseDir: string,
    name: string,
    url: string | undefined,
  ): Promise<string | null> {
    const dir = join(baseDir, name);
    if (await this.dirHasFiles(dir)) return dir;

    const tgz = join(baseDir, `${name}.tar.gz`);
    if (!(await this.fileExists(tgz))) {
      if (!url) return null;
      await ctx.log(
        'INFO',
        `Téléchargement du fond ${name.toUpperCase()} DILA`,
      );
      await downloadFileWithResume(url, tgz, ctx.log);
    }
    await mkdir(dir, { recursive: true });
    await ctx.log('INFO', `Extraction ${tgz}`);
    await extractTarGz(tgz, dir);
    return (await this.dirHasFiles(dir)) ? dir : null;
  }

  // --- LEGI : articles de codes consolidés (droit en vigueur, cible du diff bloc ii) ---

  private async ingestLegi(
    ctx: IngestionContext,
    dir: string,
    maxItems: number,
  ): Promise<void> {
    // Sélectif : on ne matérialise que les articles effectivement RÉFÉRENCÉS (DB lean).
    const wanted = await this.wantedCodeArticles();
    if (wanted.size === 0) {
      await ctx.log(
        'INFO',
        'Aucun renvoi article de code à résoudre — parsing LEGI ignoré',
      );
      return;
    }

    let seen = 0;
    let kept = 0;
    let batch: Prisma.LegislativeTextUpsertArgs[] = [];
    const flush = async () => {
      if (batch.length === 0) return;
      const rows = batch;
      batch = [];
      await this.prisma.$transaction(
        rows.map((args) => this.prisma.legislativeText.upsert(args)),
      );
      kept += rows.length;
      await ctx.progress({ upserted: rows.length });
    };

    for await (const file of walkFilesByExt(dir, '.xml')) {
      if (seen >= maxItems) break;
      const article = parseLegiArticle(await readFile(file, 'utf-8'));
      if (!article || article.etat !== 'VIGUEUR' || !article.codeTitre)
        continue;
      seen += 1;
      const key = `${normalizeCodeName(article.codeTitre)}|${normalizeArticleNum(article.num)}`;
      if (!wanted.has(key)) continue;

      const reference = `${article.codeTitre}${REF_SEP}${article.num}`;
      batch.push({
        where: { externalId: article.id },
        create: {
          kind: 'CONSOLIDATED',
          source: 'legifrance',
          externalId: article.id,
          title: article.codeTitre,
          reference,
          content: article.content,
        },
        update: {
          title: article.codeTitre,
          reference,
          content: article.content,
        },
      });
      if (batch.length >= UPSERT_CHUNK_SIZE) await flush();
    }
    await flush();
    await ctx.progress({ seen });
    await ctx.log(
      'INFO',
      `LEGI : ${seen} articles VIGUEUR parcourus, ${kept} articles référencés matérialisés`,
    );
  }

  /** Renvois article-de-code non résolus → set de clés "normCode|normArticle". */
  private async wantedCodeArticles(): Promise<Set<string>> {
    const refs = await this.prisma.textReference.findMany({
      where: {
        consolidatedTextId: null,
        article: { not: null },
        texteSource: { not: null },
      },
      select: { texteSource: true, article: true },
      distinct: ['texteSource', 'article'],
    });
    const set = new Set<string>();
    for (const r of refs) {
      if (!r.texteSource || !r.article) continue;
      set.add(
        `${normalizeCodeName(r.texteSource)}|${normalizeArticleNum(r.article)}`,
      );
    }
    return set;
  }

  private async resolveCodeReferences(ctx: IngestionContext): Promise<void> {
    const consolidated = await this.prisma.legislativeText.findMany({
      where: {
        kind: 'CONSOLIDATED',
        source: 'legifrance',
        reference: { contains: REF_SEP },
      },
      select: { id: true, externalId: true, title: true, reference: true },
    });
    const byKey = new Map<string, { id: string; externalId: string }>();
    for (const c of consolidated) {
      const num = c.reference?.split(REF_SEP)[1];
      if (!c.title || !num) continue;
      byKey.set(`${normalizeCodeName(c.title)}|${normalizeArticleNum(num)}`, {
        id: c.id,
        externalId: c.externalId,
      });
    }

    const refs = await this.prisma.textReference.findMany({
      where: {
        consolidatedTextId: null,
        article: { not: null },
        texteSource: { not: null },
      },
      select: { id: true, texteSource: true, article: true },
    });
    let resolved = 0;
    for (const r of refs) {
      const hit = byKey.get(
        `${normalizeCodeName(r.texteSource!)}|${normalizeArticleNum(r.article!)}`,
      );
      if (!hit) continue;
      await this.prisma.textReference.update({
        where: { id: r.id },
        data: { consolidatedTextId: hit.id, identifiantLegi: hit.externalId },
      });
      resolved += 1;
    }
    await ctx.log(
      'INFO',
      `Renvois article-de-code résolus vers Légifrance : ${resolved}`,
    );
  }

  // --- JORF : lois promulguées (LFSS/LFI de l'année N-1) ---

  private async ingestJorfLois(
    ctx: IngestionContext,
    dir: string,
    maxItems: number,
  ): Promise<void> {
    let seen = 0;
    let kept = 0;
    let batch: Prisma.LegislativeTextUpsertArgs[] = [];
    const flush = async () => {
      if (batch.length === 0) return;
      const rows = batch;
      batch = [];
      await this.prisma.$transaction(
        rows.map((args) => this.prisma.legislativeText.upsert(args)),
      );
      kept += rows.length;
      await ctx.progress({ upserted: rows.length });
    };

    for await (const file of walkFilesByExt(dir, '.xml')) {
      if (seen >= maxItems) break;
      const texte = parseJorfTexte(await readFile(file, 'utf-8'));
      if (!texte || texte.nature !== 'LOI') continue;
      const label = financialLawLabel(texte.titre ?? texte.titreFull);
      if (!label) continue; // on ne garde que les lois de finances / financement séc. sociale
      seen += 1;
      kept += 0;
      batch.push({
        where: { externalId: texte.id },
        create: {
          kind: 'CONSOLIDATED',
          source: 'legifrance',
          externalId: texte.id,
          title: texte.titreFull ?? texte.titre,
          reference: label, // "LFSS 2025" / "LFI 2025"
        },
        update: { title: texte.titreFull ?? texte.titre, reference: label },
      });
      if (batch.length >= UPSERT_CHUNK_SIZE) await flush();
    }
    await flush();
    await ctx.progress({ seen });
    await ctx.log('INFO', `JORF : ${kept} lois de finances/LFSS matérialisées`);
  }

  /** Renvois "LFSS YYYY" / "LFI YYYY" (sans article) → texte JORF consolidé. */
  private async resolveLawReferences(ctx: IngestionContext): Promise<void> {
    const laws = await this.prisma.legislativeText.findMany({
      where: {
        kind: 'CONSOLIDATED',
        source: 'legifrance',
        reference: { startsWith: 'LF' },
      },
      select: { id: true, externalId: true, reference: true },
    });
    const byRef = new Map(
      laws.map((l) => [l.reference?.toLowerCase() ?? '', l]),
    );

    const refs = await this.prisma.textReference.findMany({
      where: { consolidatedTextId: null, texteSource: { startsWith: 'LF' } },
      select: { id: true, texteSource: true },
    });
    let resolved = 0;
    for (const r of refs) {
      const hit = byRef.get((r.texteSource ?? '').toLowerCase());
      if (!hit) continue;
      await this.prisma.textReference.update({
        where: { id: r.id },
        data: { consolidatedTextId: hit.id, identifiantLegi: hit.externalId },
      });
      resolved += 1;
    }
    await ctx.log(
      'INFO',
      `Renvois LFSS/LFI résolus vers Légifrance : ${resolved}`,
    );
  }

  /** Relie chaque PLFSS/PLF (BILL année N) à la LFSS/LFI consolidée de l'année N-1. */
  private async linkPriorYear(ctx: IngestionContext): Promise<void> {
    const bills = await this.prisma.legislativeText.findMany({
      where: {
        kind: 'BILL',
        nature: {
          in: [
            'projet_loi_financement_securite_sociale',
            'projet_loi_finances',
          ],
        },
        priorYearTextId: null,
        reference: { not: null },
      },
      select: { id: true, nature: true, reference: true },
    });
    let linked = 0;
    for (const bill of bills) {
      const year = /\b(\d{4})\b/.exec(bill.reference ?? '')?.[1];
      if (!year) continue;
      const prefix = bill.nature === 'projet_loi_finances' ? 'LFI' : 'LFSS';
      const priorRef = `${prefix} ${Number(year) - 1}`;
      const prior = await this.prisma.legislativeText.findFirst({
        where: { kind: 'CONSOLIDATED', reference: priorRef },
        select: { id: true },
      });
      if (!prior) continue;
      await this.prisma.legislativeText.update({
        where: { id: bill.id },
        data: { priorYearTextId: prior.id },
      });
      linked += 1;
    }
    await ctx.log(
      'INFO',
      `Textes reliés à leur loi N-1 (priorYearText) : ${linked}`,
    );
  }

  private async dirHasFiles(dir: string): Promise<boolean> {
    try {
      const entries = await readdir(dir);
      return entries.length > 0;
    } catch {
      return false;
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    return stat(path)
      .then((s) => s.isFile())
      .catch(() => false);
  }
}

/** "…de financement de la sécurité sociale pour 2025" → "LFSS 2025" ; loi de finances → "LFI 2025". */
function financialLawLabel(title?: string): string | null {
  if (!title) return null;
  const year = /pour\s+(\d{4})/i.exec(title)?.[1];
  if (!year) return null;
  if (/financement de la s[ée]curit[ée] sociale/i.test(title))
    return `LFSS ${year}`;
  if (/loi de finances/i.test(title)) return `LFI ${year}`;
  return null;
}
