import { Injectable, Logger } from '@nestjs/common';
import type {
  Amendment,
  LegislativeText,
  Prisma,
} from '../../generated/prisma/client.js';
import { AmendmentsService } from '../amendments/amendments.service';
import { MOTS_ART40 } from './lexique-art40';
import {
  MOTIFS,
  PrecedentSignal,
  Regime45,
  ReviewContext,
  ReviewSignals,
  TraceEntry,
} from './types';

export type AmendmentWithText = Amendment & {
  lawText: LegislativeText | null;
};

/** Conclusion déterministe atteinte par une gate (prouvée : prime sur le LLM). */
export interface GateConclusion {
  motifCode: string;
  constat: string;
}

export interface GatesResult {
  context: ReviewContext;
  signals: ReviewSignals;
  trace: TraceEntry[];
  conclusion: GateConclusion | null;
  /** Aucun signal de risque : verdict RECEVABLE sans appel LLM. */
  fastTrackRecevable: boolean;
  /** Codes des motifs (catalogue MOTIFS) que le LLM doit examiner en G5. */
  checklist: string[];
}

/** Seuil de quasi-duplication (cf. smoke-test similarité : dupes multi-groupes à 95-99,6 %). */
const DOUBLON_THRESHOLD_PCT = 97;
const PRECEDENTS_TAKE = 8;

/** Structure du dispositif de crédits PLF/PLFR (dump AN, conservée dans Amendment.raw). */
interface DispositifCredit {
  soldeAE?: string | number;
  soldeCP?: string | number;
}

@Injectable()
export class GatesService {
  private readonly logger = new Logger(GatesService.name);

  constructor(private readonly amendments: AmendmentsService) {}

  async run(amendment: AmendmentWithText): Promise<GatesResult> {
    const trace: TraceEntry[] = [];
    const context = this.gate0Context(amendment, trace);
    const signals: ReviewSignals = {
      gagePresent: false,
      perteRecettesSansGage: false,
      redFlags40: [],
      demandeRapport: false,
      injonction: false,
      sousAmendement: false,
      exposeSommaireAbsent: false,
      doublonProbable: null,
      creditsSolde: null,
      precedents: [],
    };

    this.gate1Forme(amendment, signals, trace);
    const conclusion =
      this.gate2Lexicale(amendment, context, signals, trace) ??
      (await this.gate3Precedents(amendment, signals, trace));
    const { fastTrackRecevable, checklist } = this.gate4Aiguillage(
      context,
      signals,
      conclusion,
      trace,
    );

    return {
      context,
      signals,
      trace,
      conclusion,
      fastTrackRecevable,
      checklist,
    };
  }

  // --- G0 : contexte -------------------------------------------------------

  private gate0Context(
    a: AmendmentWithText,
    trace: TraceEntry[],
  ): ReviewContext {
    const lectureCode = a.lawText?.lectureCode ?? null;
    const regime45 = regime45FromLecture(lectureCode);
    const estGouvernement = a.auteurType === 'Gouvernement';

    const context: ReviewContext = {
      nature: a.nature ?? a.lawText?.nature ?? null,
      lectureCode,
      regime45,
      auteurType: a.auteurType,
      estGouvernement,
      organeExamen: a.organeExamen,
      articleAdditionnel: a.articleAdditionnel,
      soumisArticle40: a.soumisArticle40,
    };

    trace.push({
      gate: 'G0',
      regle: 'CONTEXTE',
      constat: `nature=${context.nature ?? '?'}, lecture=${lectureCode ?? '?'} (régime 45: ${regime45}), auteur=${a.auteurType ?? '?'}, stade=${a.organeExamen ?? '?'}`,
      evidence: context,
      effet: 'INFO',
    });

    if (estGouvernement) {
      trace.push({
        gate: 'G0',
        regle: 'AUTEUR_GOUVERNEMENT',
        fondement:
          'Art. 40 et 41 Constitution (visent les seuls parlementaires) ; art. 99 RAN',
        constat:
          'Amendement du Gouvernement : art. 40, recevabilité organique et délais inapplicables. Seul le régime art. 45 demeure.',
        effet: 'SIGNAL',
      });
    }
    if (regime45 === 'inconnu') {
      trace.push({
        gate: 'G0',
        regle: 'LECTURE_INCONNUE',
        constat:
          "Phase de lecture du texte inconnue (ingestor textes-an pas encore passé sur ce dossier) : régime art. 45 traité par défaut comme première lecture (sens favorable à l'initiative).",
        effet: 'INFO',
      });
    }
    return context;
  }

  // --- G1 : contrôles formels ----------------------------------------------

  private gate1Forme(
    a: AmendmentWithText,
    signals: ReviewSignals,
    trace: TraceEntry[],
  ): void {
    if (a.amendementParentRef) {
      signals.sousAmendement = true;
      trace.push({
        gate: 'G1',
        regle: 'FORME_SOUS_AMENDEMENT',
        fondement: 'Art. 98 al. 5 RAN',
        constat: `Sous-amendement de ${a.amendementParentRef} : vérifier qu'il ne contredit pas le sens de l'amendement parent (examen LLM).`,
        effet: 'SIGNAL',
      });
    }
    if (!a.exposeSommaire?.trim()) {
      signals.exposeSommaireAbsent = true;
      trace.push({
        gate: 'G1',
        regle: 'FORME_EXPOSE_SOMMAIRE',
        fondement: 'Art. 98 al. 4 RAN (amendements sommairement motivés)',
        constat: 'Exposé sommaire absent ou vide.',
        effet: 'SIGNAL',
      });
    }
    // Délais (art. 86/99 RAN) : les dates limites de dépôt par examen ne sont pas encore
    // ingérées (agendas AN) — contrôle dégradé, tracé pour transparence.
    trace.push({
      gate: 'G1',
      regle: 'FORME_DELAI',
      fondement: 'Art. 86 al. 5 et 99 RAN',
      constat:
        'Non vérifiable : dates limites de dépôt non ingérées (le sort officiel IRRHD reste la référence).',
      effet: 'PASSE',
    });
  }

  // --- G2 : analyse lexicale et structurelle --------------------------------

  private gate2Lexicale(
    a: AmendmentWithText,
    context: ReviewContext,
    signals: ReviewSignals,
    trace: TraceEntry[],
  ): GateConclusion | null {
    const dispositif = stripHtml(a.content);
    const expose = stripHtml(a.exposeSommaire ?? '');
    const texte = `${dispositif}\n${expose}`;

    // Gage : formules canoniques (ancienne "articles 575 et 575 A CGI" / nouvelle "accise tabacs").
    const compensation = /à due concurrence/i.test(dispositif);
    const gageTaxe =
      /(accise sur les tabacs|articles?\s*575(\s*et\s*575\s*A)?)/i.test(
        dispositif,
      );
    const perteRecettes = /pertes? de recettes/i.test(dispositif);
    signals.gagePresent = compensation && gageTaxe;
    signals.perteRecettesSansGage = perteRecettes && !signals.gagePresent;
    if (signals.gagePresent) {
      trace.push({
        gate: 'G2',
        regle: 'ART40_GAGE_PRESENT',
        fondement: 'Art. 40 Constitution (doctrine du gage)',
        constat:
          'Gage type détecté (compensation à due concurrence par taxe additionnelle). Couvre une perte de recettes, jamais une charge.',
        effet: 'SIGNAL',
      });
    } else if (signals.perteRecettesSansGage) {
      trace.push({
        gate: 'G2',
        regle: 'ART40_PERTE_SANS_GAGE',
        fondement: 'Art. 40 Constitution',
        constat:
          'Le dispositif évoque une perte de recettes sans gage type détecté : risque motif "Gage".',
        effet: 'SIGNAL',
      });
    }

    // Lexique art. 40 (surlignage red-flag, éditable — cf. lexique-art40.ts).
    signals.redFlags40 = matchLexique(texte, MOTS_ART40);
    if (signals.redFlags40.length > 0) {
      trace.push({
        gate: 'G2',
        regle: 'ART40_LEXIQUE',
        fondement: 'Lexique hackathon AN (indicatif, jamais concluant seul)',
        constat: `Mots à risque art. 40 : ${signals.redFlags40
          .map((f) => `${f.terme}×${f.occurrences}`)
          .join(', ')}`,
        evidence: signals.redFlags40,
        effet: 'SIGNAL',
      });
    }

    // Demande de rapport : recevable (ni charge ni injonction) — doctrine Coquerel.
    signals.demandeRapport =
      /gouvernement\s+(remet|présente|transmet|adresse)[^.]{0,160}rapport/i.test(
        texte,
      ) || /rapport\s+au\s+parlement/i.test(texte);
    if (signals.demandeRapport) {
      trace.push({
        gate: 'G2',
        regle: 'DEMANDE_RAPPORT',
        fondement: 'Doctrine art. 40 (rapport Coquerel n°1891)',
        constat:
          'Demande de rapport au Gouvernement détectée : présomption de recevabilité (pas une charge, pas une injonction).',
        effet: 'SIGNAL',
      });
    }

    // Injonction au Gouvernement (art. 20) — hors demande de rapport.
    signals.injonction =
      !signals.demandeRapport &&
      /le\s+gouvernement\s+(doit|est\s+tenu|s'engage|met\s+en\s+œuvre|prend\s+les\s+mesures)/i.test(
        dispositif,
      );
    if (signals.injonction) {
      trace.push({
        gate: 'G2',
        regle: 'INJONCTION_20',
        fondement: 'Art. 20 Constitution',
        constat:
          'Formulation injonctive envers le Gouvernement détectée dans le dispositif.',
        effet: 'SIGNAL',
      });
    }

    // Article additionnel : signal n°1 du risque cavalier (art. 45).
    if (context.articleAdditionnel) {
      trace.push({
        gate: 'G2',
        regle: 'ARTICLE_ADDITIONNEL',
        fondement: 'Art. 45 al. 1 Constitution ; art. 98 al. 6 RAN',
        constat:
          'Amendement portant article additionnel : le lien avec le texte doit être examiné (risque cavalier).',
        effet: 'SIGNAL',
      });
    }

    // Amendements de crédits PLF/PLFR : test arithmétique exact de l'art. 47 LOLF.
    const credit = extractDispositifCredit(a.raw);
    if (credit) {
      const ae = toNumber(credit.soldeAE);
      const cp = toNumber(credit.soldeCP);
      if (ae !== null && cp !== null) {
        signals.creditsSolde = { ae, cp };
        if (ae > 0 || cp > 0) {
          trace.push({
            gate: 'G2',
            regle: 'LOLF_CREDITS_SOLDE_POSITIF',
            fondement: 'Art. 47 LOLF',
            constat: `Solde de crédits positif (AE=${ae}, CP=${cp}) : augmentation du plafond de la mission — irrecevable.`,
            evidence: signals.creditsSolde,
            effet: 'CONCLUT',
          });
          return {
            motifCode: 'CREDITS',
            constat: `Solde de crédits positif (AE=${ae}, CP=${cp}) : l'amendement augmente le plafond de la mission (art. 47 LOLF).`,
          };
        }
        trace.push({
          gate: 'G2',
          regle: 'LOLF_CREDITS_EQUILIBRES',
          fondement: 'Art. 47 LOLF',
          constat: `Amendement de crédits à solde nul (AE=${ae}, CP=${cp}) : conforme au critère arithmétique de l'art. 47 LOLF.`,
          effet: 'SIGNAL',
        });
      }
    }

    return null;
  }

  // --- G3 : précédents (pgvector) -------------------------------------------

  private async gate3Precedents(
    a: AmendmentWithText,
    signals: ReviewSignals,
    trace: TraceEntry[],
  ): Promise<GateConclusion | null> {
    let similar: PrecedentSignal[] = [];
    try {
      const items = await this.amendments.findSimilarById(a.id, {
        take: PRECEDENTS_TAKE,
      });
      similar = items.map((s) => ({
        id: s.id,
        numero: s.numero,
        similarityPct: s.similarityPct,
        sort: s.sort,
        etat: s.etat,
        status: s.status,
      }));
    } catch (error) {
      trace.push({
        gate: 'G3',
        regle: 'PRECEDENTS_INDISPONIBLES',
        constat: `Recherche de similarité indisponible (${error instanceof Error ? error.message : 'erreur'}) : analyse sans précédents.`,
        effet: 'PASSE',
      });
      return null;
    }

    signals.precedents = similar;

    const dupe = similar.find((s) => s.similarityPct >= DOUBLON_THRESHOLD_PCT);
    if (dupe) {
      signals.doublonProbable = {
        id: dupe.id,
        similarityPct: dupe.similarityPct,
      };
      trace.push({
        gate: 'G3',
        regle: 'DOUBLON_PROBABLE',
        fondement: 'Pratique Eloi (IRRD) — ou discussion commune',
        constat: `Quasi-duplication à ${dupe.similarityPct} % avec ${dupe.numero ?? dupe.id} : doublon probable (ou amendement multi-groupes à traiter en discussion commune).`,
        evidence: signals.doublonProbable,
        effet: 'SIGNAL',
      });
    }

    const irrecevables = similar.filter(
      (s) => s.status === 'IRRECEIVABLE' && s.similarityPct >= 80,
    );
    if (irrecevables.length > 0) {
      trace.push({
        gate: 'G3',
        regle: 'PRECEDENTS_IRRECEVABLES',
        constat: `${irrecevables.length}/${similar.length} précédents proches (≥80 %) ont été déclarés irrecevables : ${irrecevables
          .map(
            (s) =>
              `${s.numero ?? s.id} (${s.similarityPct} %, ${s.sort ?? s.etat})`,
          )
          .join(' ; ')}`,
        evidence: irrecevables,
        effet: 'SIGNAL',
      });
    } else if (similar.length > 0) {
      trace.push({
        gate: 'G3',
        regle: 'PRECEDENTS',
        constat: `${similar.length} précédents proches, aucun déclaré irrecevable à ≥80 % de similarité.`,
        effet: 'INFO',
      });
    }
    return null;
  }

  // --- G4 : aiguillage -------------------------------------------------------

  private gate4Aiguillage(
    context: ReviewContext,
    signals: ReviewSignals,
    conclusion: GateConclusion | null,
    trace: TraceEntry[],
  ): { fastTrackRecevable: boolean; checklist: string[] } {
    if (conclusion) {
      trace.push({
        gate: 'G4',
        regle: 'AIGUILLAGE_CONCLU',
        constat: `Conclusion déterministe atteinte (${conclusion.motifCode}) : pas d'appel LLM.`,
        effet: 'INFO',
      });
      return { fastTrackRecevable: false, checklist: [] };
    }

    const risques: string[] = [];
    if (!context.estGouvernement) {
      if (
        signals.redFlags40.length > 0 ||
        signals.perteRecettesSansGage ||
        signals.gagePresent ||
        context.soumisArticle40
      ) {
        risques.push('CHARGE', 'GAGE');
      }
      if (context.nature === 'projet_loi_finances') {
        risques.push('CAVALIER_BUDGETAIRE');
      }
      if (context.nature === 'projet_loi_financement_securite_sociale') {
        risques.push('CAVALIER_SOCIAL');
      }
      if (
        context.nature === 'projet_loi_organique' ||
        context.nature === 'proposition_loi_organique'
      ) {
        risques.push('IRR127');
      }
    }
    if (signals.injonction) risques.push('IRR20');
    if (signals.sousAmendement) risques.push('IRRSA');
    if (signals.doublonProbable) risques.push('IRRD');
    // Art. 45 : s'applique à tous les auteurs, régime selon la lecture.
    const motif45 =
      context.regime45 === 'cmp'
        ? 'IRR45_CMP'
        : context.regime45 === 'lecture_suivante' ||
            context.regime45 === 'lecture_definitive'
          ? 'IRR45_ENTONNOIR'
          : 'IRR45_CAVALIER';
    const risque45 =
      context.articleAdditionnel === true ||
      context.regime45 === 'cmp' ||
      context.regime45 === 'lecture_suivante' ||
      context.regime45 === 'lecture_definitive';

    if (risque45) risques.push(motif45);

    const checklist = [...new Set(risques)].filter((code) => MOTIFS[code]);

    if (checklist.length === 0) {
      trace.push({
        gate: 'G4',
        regle: 'FAST_TRACK',
        constat: context.estGouvernement
          ? 'Amendement du Gouvernement sans signal art. 45 : recevable sans examen approfondi.'
          : 'Aucun signal de risque (lexique, gage, injonction, additionnel, précédents) : recevable sans appel LLM.',
        effet: 'CONCLUT',
      });
      return { fastTrackRecevable: true, checklist: [] };
    }

    // Le lien art. 45 mérite toujours un examen quand on appelle déjà le LLM
    // (motif le plus fréquent : ~23 % depuis 2022).
    if (!checklist.includes(motif45)) checklist.push(motif45);

    trace.push({
      gate: 'G4',
      regle: 'AIGUILLAGE_LLM',
      constat: `Examen LLM requis sur : ${checklist.join(', ')}`,
      evidence: checklist,
      effet: 'INFO',
    });
    return { fastTrackRecevable: false, checklist };
  }
}

// --- Helpers ---------------------------------------------------------------

function regime45FromLecture(lectureCode: string | null): Regime45 {
  if (!lectureCode) return 'inconnu';
  if (
    lectureCode === 'AN1' ||
    lectureCode === 'ANLUNI' ||
    lectureCode === 'SN1'
  )
    return 'premiere_lecture';
  if (lectureCode === 'ANLDEF') return 'lecture_definitive';
  if (lectureCode.startsWith('CMP')) return 'cmp';
  if (/^(AN\d+|ANNLEC|SN\d+|SNNLEC)$/.test(lectureCode))
    return 'lecture_suivante';
  return 'inconnu';
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Compte les occurrences des termes du lexique (insensible casse/accents, mot entier). */
function matchLexique(
  texte: string,
  termes: string[],
): { terme: string; occurrences: number }[] {
  const normalized = normalize(texte);
  const hits: { terme: string; occurrences: number }[] = [];
  for (const terme of termes) {
    const t = normalize(terme);
    // Racine + suffixe flexionnel (financ… → financement, financer, financiers).
    const pattern = new RegExp(`\\b${escapeRegExp(t)}\\w*`, 'g');
    const occurrences = normalized.match(pattern)?.length ?? 0;
    if (occurrences > 0) hits.push({ terme, occurrences });
  }
  return hits;
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function asJsonObject(
  value: Prisma.JsonValue | null | undefined,
): Prisma.JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : null;
}

function extractDispositifCredit(raw: unknown): DispositifCredit | null {
  const root = asJsonObject(raw as Prisma.JsonValue | null | undefined);
  if (!root) return null;
  const corps = asJsonObject(root.corps);
  if (!corps) return null;
  const contenuAuteur = asJsonObject(corps.contenuAuteur);
  if (!contenuAuteur) return null;
  const credit =
    asJsonObject(contenuAuteur.dispositifAmdtCreditPLF) ??
    asJsonObject(contenuAuteur.dispositifAmdtCreditPLFR);
  if (!credit || typeof credit !== 'object') return null;
  return credit;
}

function toNumber(v: string | number | undefined): number | null {
  if (v === undefined || v === null) return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, ''));
  return Number.isFinite(n) ? n : null;
}
