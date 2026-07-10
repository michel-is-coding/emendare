/**
 * Types de l'agent recevabilité — cf. docs/metier/procedure-recevabilite-agent.md.
 * Chaque choix de la pipeline (G0→G6) émet une TraceEntry : la décision est traçable
 * de bout en bout (exigence produit + art. 89 al. 6 RAN : explication due à l'auteur).
 */

export type Gate = 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6';

export type TraceEffet = 'SIGNAL' | 'CONCLUT' | 'PASSE' | 'INFO';

export interface TraceEntry {
  gate: Gate;
  regle: string;
  fondement?: string;
  constat: string;
  evidence?: unknown;
  effet: TraceEffet;
}

/** Régime art. 45 applicable, déduit de la phase de lecture du texte (G0). */
export type Regime45 =
  | 'premiere_lecture'
  | 'lecture_suivante'
  | 'lecture_definitive'
  | 'cmp'
  | 'inconnu';

/** Contexte G0 : tout ce qui conditionne l'applicabilité des règles. */
export interface ReviewContext {
  nature: string | null;
  lectureCode: string | null;
  regime45: Regime45;
  auteurType: string | null;
  estGouvernement: boolean;
  organeExamen: string | null;
  articleAdditionnel: boolean | null;
  soumisArticle40: boolean | null;
}

/** Signaux accumulés par les gates déterministes, transmis à l'aiguillage et au LLM. */
export interface ReviewSignals {
  gagePresent: boolean;
  perteRecettesSansGage: boolean;
  redFlags40: { terme: string; occurrences: number }[];
  demandeRapport: boolean;
  injonction: boolean;
  sousAmendement: boolean;
  exposeSommaireAbsent: boolean;
  doublonProbable: { id: string; similarityPct: number } | null;
  creditsSolde: { ae: number; cp: number } | null;
  precedents: PrecedentSignal[];
}

export interface PrecedentSignal {
  id: string;
  numero: string | null;
  similarityPct: number;
  sort: string | null;
  etat: string | null;
  status: string;
}

/** Avis du LLM sur une règle examinée (G5). */
export interface RegleAvis {
  code: string;
  avis: 'OK' | 'RISQUE' | 'IRRECEVABLE';
  raisonnement: string;
  evidence?: string[];
}

/** Verdict final (G6) — persisté dans AmendmentAnalysis, affiché bloc (iv). */
export interface ReviewVerdict {
  sort: 'RECEVABLE' | 'IRRECEVABLE';
  motifCode: string | null;
  motifLibelle: string | null;
  fondement: string | null;
  confiance: number;
  justificatif: string;
  fastTrack: boolean;
  model: string | null;
  regles?: RegleAvis[];
  trace: TraceEntry[];
}

export interface Motif {
  code: string;
  libelle: string;
  fondement: string;
  /** Description courte injectée dans la checklist LLM. */
  regle: string;
}

/**
 * Catalogue des motifs d'irrecevabilité. Codes alignés sur la taxonomie Eloi
 * (sousEtat.code / libellés de sort des dumps AN) pour l'évaluation contre le réel.
 */
export const MOTIFS: Record<string, Motif> = {
  CHARGE: {
    code: 'CHARGE',
    libelle: 'Charge',
    fondement: 'Art. 40 Constitution ; art. 89 RAN',
    regle:
      "Création ou aggravation d'une charge publique (dépense nouvelle, directe ou différée, pour l'État, les collectivités, la sécurité sociale ou un organisme financé par fonds publics). Jamais compensable, même gagée. Les simples charges de gestion et les demandes de rapport ne sont PAS des charges.",
  },
  GAGE: {
    code: 'GAGE',
    libelle: 'Gage',
    fondement: 'Art. 40 Constitution ; art. 89 RAN',
    regle:
      "Diminution d'une ressource publique sans gage, ou gage défectueux (non réel, différé, ou ne bénéficiant pas à la même personne publique que celle qui subit la perte).",
  },
  CREDITS: {
    code: 'CREDITS',
    libelle: 'Crédits',
    fondement: 'Art. 47 LOLF',
    regle:
      "PLF : un amendement de crédits doit rester à solde nul au sein d'une même mission (redéploiement entre programmes) ; augmenter le plafond d'une mission ou créer une mission est irrecevable.",
  },
  CAVALIER_BUDGETAIRE: {
    code: 'CAVALIER_BUDGETAIRE',
    libelle: 'Cavalier budgétaire',
    fondement: 'Art. 34 LOLF ; art. 121 RAN',
    regle: 'Disposition hors du domaine des lois de finances.',
  },
  CAVALIER_SOCIAL: {
    code: 'CAVALIER_SOCIAL',
    libelle: 'Cavalier social',
    fondement: 'Art. L.O. 111-3 s. CSS ; art. 121-2 RAN',
    regle:
      'Disposition hors du domaine des lois de financement de la sécurité sociale.',
  },
  IRR45_CAVALIER: {
    code: 'IRR45_CAVALIER',
    libelle: 'Cavalier (45)',
    fondement: 'Art. 45 al. 1 Constitution ; art. 98 al. 6 RAN',
    regle:
      "Première lecture : absence de lien, MÊME INDIRECT, avec le texte déposé. Le doute profite à l'amendement (lien indirect suffit).",
  },
  IRR45_ENTONNOIR: {
    code: 'IRR45_ENTONNOIR',
    libelle: 'Entonnoir (45)',
    fondement: 'Art. 45 Constitution ; art. 108 al. 3-5 RAN',
    regle:
      "Après la première lecture : l'amendement doit porter sur une disposition restant en discussion (exceptions : constitutionnalité, coordination, erreur matérielle).",
  },
  IRR45_CMP: {
    code: 'IRR45_CMP',
    libelle: 'CMP (45)',
    fondement: 'Art. 45 al. 3 Constitution',
    regle:
      'Après CMP : aucun amendement recevable sans accord du Gouvernement.',
  },
  IRR41: {
    code: 'IRR41',
    libelle: 'Domaine de la loi (41)',
    fondement: 'Art. 41 Constitution ; art. 93 RAN',
    regle: 'La disposition ne relève pas du domaine de la loi (art. 34 C.).',
  },
  IRR37: {
    code: 'IRR37',
    libelle: 'Disposition réglementaire (37)',
    fondement: 'Art. 37 Constitution',
    regle: 'La disposition relève du pouvoir réglementaire.',
  },
  IRR38: {
    code: 'IRR38',
    libelle: "Champ de l'habilitation (38)",
    fondement: 'Art. 38 Constitution ; art. 93 al. 2 RAN',
    regle:
      'Empiète sur une matière déléguée au Gouvernement par ordonnance, ou étend une habilitation (réservé au Gouvernement).',
  },
  IRR20: {
    code: 'IRR20',
    libelle: 'Injonction (20)',
    fondement: 'Art. 20 Constitution (jurisprudence CC)',
    regle:
      "Injonction au Gouvernement (obligation de faire adressée au pouvoir exécutif). La demande de rapport au Parlement n'est PAS une injonction.",
  },
  IRR42: {
    code: 'IRR42',
    libelle: 'Satisfait ou inopérant (42)',
    fondement: 'Pratique parlementaire ; CC 2005-512 DC',
    regle:
      'Amendement déjà satisfait par le texte, sans objet ou dépourvu de portée normative.',
  },
  IRR127: {
    code: 'IRR127',
    libelle: 'Domaine loi organique (127)',
    fondement: 'Art. 127 RAN',
    regle:
      'Dispositions non organiques dans un texte organique, ou organiques dans un texte ordinaire.',
  },
  IRRHD: {
    code: 'IRRHD',
    libelle: 'Hors-délais',
    fondement: 'Art. 86 al. 5 et 99 RAN',
    regle:
      'Dépôt après le délai (3e jour ouvrable avant examen, 17 h), hors exceptions.',
  },
  IRRSA: {
    code: 'IRRSA',
    libelle: 'Sous-amendement (98)',
    fondement: 'Art. 98 al. 5 RAN',
    regle:
      "Sous-amendement contredisant le sens de l'amendement, ou amendement portant sur plusieurs articles.",
  },
  IRRD: {
    code: 'IRRD',
    libelle: 'Doublon',
    fondement: 'Pratique Eloi',
    regle:
      "Duplication d'un amendement déjà déposé sur le même texte au même stade.",
  },
};
