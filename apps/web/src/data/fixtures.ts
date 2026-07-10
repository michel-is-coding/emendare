// Statut (refonte 2026-07-04) : contrat de types de la vue (Amendement, Decision, Segment…)
// + jeu de données de test pour src/lib/*.test.ts. Plus jamais importé par une page :
// les pages consomment l'API réelle via src/lib/api.ts et src/lib/adaptateurs.ts.
//
// Fixtures v2 — champs alignés sur la nomenclature e7 (convention de nommage) ; ce fichier
// fait foi comme contrat de données de la v1 (rapport de recommandations, section 4).
//
// Similarité (AD3) : l'API réelle (GET /amendments/:id/similar, pgvector) n'est pas encore
// présente dans ce worktree (apps/api n'expose que / et /health). Les champs `ressemblance`
// en reproduisent la sortie attendue (quasi-duplication > 90 %, proximité thématique ~ 60 %).
// Point de branchement futur : module Similaires du cockpit.

export type SortReel =
  | "adopté"
  | "rejeté"
  | "retiré"
  | "tombé"
  | "irrecevable"
  | "non-soutenu";

export type Stade = "commission" | "seance";
export type Lecture = "premiere" | "ulterieure";

export type Segment =
  | { kind: "text"; text: string }
  // segment généré par le lexique art. 40 (src/lib/lexique.ts) — plus jamais saisi à la main
  | { kind: "redflag"; text: string; tip: string; famille?: string }
  | {
      kind: "modif";
      text: string;
      tip: string;
      avant: string;
      apres: string;
      note: string;
    };

export type TexteLie = {
  ref: string;
  // extrait avec mark-change : avant/après posés par l'amendement
  extrait: Segment[];
};

export type Similaire = {
  numero: string;
  auteur: string;
  groupe: string;
  sort: SortReel;
  ressemblance: number; // % — score simulé, format de l'API pgvector (voir en-tête)
  stade?: Stade; // où le sort a été prononcé (un amendement porte deux sorts successifs)
  lecture?: Lecture;
  identique?: boolean; // identité formelle stricte (alerte de cohérence), pas la ressemblance
  degre?: 1 | 2 | 3; // portée de recherche : 1 même texte · 2 textes ciblés · 3 historique
};

export type Preconisation = {
  preSort: "recevable" | "irrecevable";
  motifType: string; // vide si recevable
  confiance: number; // % — jamais présenté comme une précision garantie
  niveau?: "signal_fort" | "a_verifier"; // rendu qualitatif, préféré au chiffre brut
  arguments: string[];
  preMotif: string; // vide si recevable
};

export type Gage = "present" | "absent" | "insuffisant";

export type Amendement = {
  numero: string;
  auteur: string;
  groupe: string;
  etape: Stade;
  // clé de jointure vers la session parlementaire (défaut = session.texte.id)
  texte_id?: string;
  // 0 à 2 sorts successifs (commission puis séance) ; sert le mode suivi, pas le verdict
  sorts?: SortStade[];
  article_vise: string;
  objet_resume: string;
  depose_le: string;
  // rang dans le dérouleur (feuille jaune) : pilote le tri par défaut et la navigation.
  // ponytail: entier précalculé saisi à la main ; moteur d'ordonnancement seulement
  // avec le moissonnage réel.
  ordre_appel: number;
  rectification?: { version: string; date: string };
  // « id » = rédactions rigoureusement identiques (sort commun légitime) ;
  // « dc » = discussion commune (rédactions concurrentes, votes séparés)
  regroupement?: { type: "id" | "dc"; cle: string };
  // discriminant art. 40 branche ressource (pertinent si signal_ressource)
  gage?: Gage;
  // garde anti-faux-positifs : recevable malgré des mots du lexique
  hors_champ_40?: "charge_de_gestion" | "demande_de_rapport";
  expose: string;
  dispositif: Segment[];
  signaux_recevabilite: {
    article_40: "aucun_signal" | "signal_charge" | "signal_ressource";
    article_45: "lien_direct" | "lien_indirect" | "lien_absent";
    justification: string;
    fondement?: string;
  };
  textes_lies: TexteLie[];
  similaires: Similaire[];
  preconisation: Preconisation;
};

export const MOTIF_TYPES = [
  "IRR-40 charge",
  "IRR-40 ressource",
  "IRR-45 cavalier",
  "IRR-45 entonnoir",
  "IRR-41",
  "IRR LOLF",
  "IRR LFSS",
] as const;

export type MotifType = (typeof MOTIF_TYPES)[number];

// la charge (singulier) n'est jamais compensable : irrecevabilité définitive ;
// tout le reste est curable (gage) ou contestable (lien, domaine de la loi)
export const MOTIF_GRAVITE: Record<MotifType, "bloquant" | "attention"> = {
  "IRR-40 charge": "bloquant",
  "IRR-40 ressource": "attention",
  "IRR-45 cavalier": "attention",
  "IRR-45 entonnoir": "attention",
  "IRR-41": "attention",
  "IRR LOLF": "attention",
  "IRR LFSS": "attention",
};

// fondement réglementaire cité dans le motif notifié (vocabulaire statutaire exact)
export const MOTIF_FONDEMENT: Record<MotifType, string> = {
  "IRR-40 charge":
    "article 40 de la Constitution (création ou aggravation d'une charge publique) ; article 89 du Règlement de l'Assemblée nationale",
  "IRR-40 ressource":
    "article 40 de la Constitution (diminution des ressources publiques sans gage valable) ; article 89 du Règlement de l'Assemblée nationale",
  "IRR-45 cavalier":
    "article 45 de la Constitution (absence de tout lien, même indirect, en première lecture) ; article 98 du Règlement de l'Assemblée nationale",
  "IRR-45 entonnoir":
    "article 45 de la Constitution (dispositions restant en discussion, lien direct exigé après la première lecture) ; article 98 du Règlement de l'Assemblée nationale",
  "IRR-41":
    "article 41 de la Constitution (hors domaine de la loi ou contraire à une délégation de l'article 38) ; article 93 du Règlement de l'Assemblée nationale",
  "IRR LOLF":
    "article 47 de la LOLF (plafond de la mission) ; article 89 du Règlement de l'Assemblée nationale",
  "IRR LFSS":
    "article L.O. 111-7-1 du code de la sécurité sociale (objectif de dépenses par branche ou ONDAM) ; article 89 du Règlement de l'Assemblée nationale",
};

// sorts constatés (échappatoire discrète : retiré, tombé et non soutenu se constatent,
// ce ne sont pas des jugements au fond)
export const AUTRES_SORTS = ["retiré", "tombé", "non soutenu"] as const;

export type DecisionSort = "recevable" | "irrecevable" | (typeof AUTRES_SORTS)[number];

// décision humaine loguée : état d'exécution de la session, pas une fixture
export type Decision = {
  sort: DecisionSort;
  motifType?: MotifType;
  motifTexte?: string;
};

// ══ Socle partagé administrateur-député (rapport député, section 3.5) ══
// Tout est additif : le cockpit compile et se comporte à l'identique.

// ── AXE 1 : session parlementaire (constante unique en v1) ──
// aligné e0.dossier.nature
export type TexteNature =
  | "projet_de_loi"
  | "proposition_de_loi"
  | "projet_loi_finances"
  | "projet_loi_financement_securite_sociale"
  | "projet_loi_ratification_ordonnance"
  | "revision_constitutionnelle"
  | "proposition_loi_organique"
  | "projet_loi_organique";

export type Texte = {
  id: string;
  uid_an?: string;
  titre: string;
  nature: TexteNature;
  numero: string;
  commission_fond?: string;
};

// sous-ensemble de l'enum e7.evenements.type
export type EvenementType =
  | "depot_amendements"
  | "examen_commission"
  | "texte_commission_adopte"
  | "examen_seance"
  | "transmission_autre_assemblee"
  | "retour_navette"
  | "convocation_cmp"
  | "accord_cmp"
  | "echec_cmp"
  | "lecture_definitive"
  | "promulgation";

export type EvenementProcedure = {
  type: EvenementType;
  date: string;
  lecture?: string;
  detail?: string;
};

export type Session = {
  legislature: number;
  session_ordinaire: string; // ex. "2026-2027"
  texte: Texte;
  lecture: Lecture;
  stade_courant: Stade;
  delai_limite: string; // échéance de dépôt, alimente le compte à rebours (F4)
  evenements: EvenementProcedure[];
};

export const session: Session = {
  legislature: 17,
  session_ordinaire: "2026-2027",
  texte: {
    id: "plf-2027",
    titre: "Projet de loi de finances pour 2027",
    nature: "projet_loi_finances",
    numero: "0000",
    commission_fond: "Finances",
  },
  lecture: "premiere",
  stade_courant: "commission",
  delai_limite: "2026-07-06T17:00:00+02:00",
  evenements: [
    { type: "depot_amendements", date: "2026-06-26" },
    { type: "examen_commission", date: "2026-07-07" },
  ],
};

// ── sorts successifs (commission puis séance) : mode suivi, PAS le verdict pré-dépôt ──
export type SortStade = { stade: Stade; lecture: Lecture; sort: SortReel };

// ── Objet-pont : BOUCLE DE RECEVABILITÉ (administrateur → auteur), distincte de la navette ──
export type Notification = {
  motifType: MotifType;
  motifTexte: string;
  fondement: string;
  stade: Stade;
  lecture: Lecture;
  date: string;
  voie_de_passage?: string; // ex. "ajouter un gage tabac à due concurrence"
};

// seed statique v1 : quels amendements ont reçu une notification (démo de la vue député)
export const notifications: Record<string, Notification> = {
  CD87: {
    motifType: "IRR-40 ressource",
    motifTexte:
      "L'amendement étend et majore un crédit d'impôt sans gage valable : diminution des ressources publiques, irrecevable au titre de l'article 40.",
    fondement: MOTIF_FONDEMENT["IRR-40 ressource"],
    stade: "commission",
    lecture: "premiere",
    date: "2026-06-27",
    voie_de_passage:
      "Ajouter un gage certain et intégral (taxe additionnelle à l'accise sur les tabacs, à due concurrence).",
  },
};

// ── AXE 2 : ressemblance (à matérialiser SEULEMENT si une vue par grappe l'exige) ──
export type Grappe = {
  cle: string;
  type: "quasi_duplication" | "proximite_thematique";
  membres: string[];
  regime?: "id" | "dc";
};

// ── Extension réservée, NON construite (rapport député, section 5) : avis du rapporteur.
// Adjacent à la recevabilité mais politique : ni saisi ni affiché en v1. ──
export type AvisRapporteur = {
  sens: "favorable" | "defavorable" | "demande_de_retrait" | "sagesse" | "satisfait";
  argumentaire?: string;
};

export const amendements: Amendement[] = [
  {
    numero: "CD87",
    auteur: "Mme Martin",
    groupe: "RE",
    etape: "commission",
    article_vise: "Article 2 du PLF 2027",
    objet_resume: "Crédit d'impôt rénovation énergétique",
    depose_le: "2026-06-26",
    ordre_appel: 3,
    gage: "absent",
    expose:
      "Cet amendement étend le crédit d'impôt pour la rénovation énergétique aux résidences secondaires situées en zone rurale.",
    dispositif: [
      {
        kind: "text",
        text: "À l'article 2, après le mot « principale », insérer les mots : « ou secondaire située en zone France ruralités revitalisation », et majorer le taux du crédit d'impôt de dix points pour ces biens.",
      },
    ],
    signaux_recevabilite: {
      article_40: "signal_ressource",
      article_45: "lien_direct",
      justification:
        "Extension et majoration d'un crédit d'impôt : diminution des ressources publiques ; aucun gage prévu.",
      fondement:
        "article 40 de la Constitution ; article 89 du Règlement de l'Assemblée nationale",
    },
    textes_lies: [
      {
        ref: "CGI, art. 200 quater",
        extrait: [
          { kind: "text", text: "Le crédit d'impôt s'applique aux dépenses afférentes à " },
          {
            kind: "modif",
            text: "l'habitation principale",
            tip: "Champ modifié par l'amendement : cliquer pour l'avant/après.",
            avant: "l'habitation principale du contribuable",
            apres: "l'habitation principale ou secondaire en zone FRR du contribuable",
            note: "Extension du champ = perte de recettes non gagée.",
          },
          { kind: "text", text: " situées en France…" },
        ],
      },
    ],
    similaires: [
      {
        numero: "CF12",
        auteur: "M. Bernard",
        groupe: "LR",
        sort: "irrecevable",
        ressemblance: 89,
        stade: "commission",
        lecture: "premiere",
        degre: 2,
      },
      {
        numero: "CD44",
        auteur: "Mme Rousseau",
        groupe: "ECO",
        sort: "rejeté",
        ressemblance: 71,
        stade: "seance",
        lecture: "premiere",
        degre: 2,
      },
      {
        numero: "CF56",
        auteur: "M. Blanc",
        groupe: "DEM",
        sort: "retiré",
        ressemblance: 58,
        stade: "commission",
        lecture: "premiere",
        degre: 3,
      },
    ],
    preconisation: {
      preSort: "irrecevable",
      motifType: "IRR-40 ressource",
      confiance: 82,
      niveau: "signal_fort",
      arguments: [
        "majoration d'un crédit d'impôt sans gage : diminution des ressources publiques",
        "précédent : CF12 déclaré irrecevable (art. 40) sur un champ identique",
      ],
      preMotif:
        "L'amendement étend et majore un crédit d'impôt sans gage valable : diminution des ressources publiques, irrecevable au titre de l'article 40 de la Constitution (article 89 du Règlement de l'Assemblée nationale).",
    },
  },
  {
    numero: "CD101",
    auteur: "M. Garnier",
    groupe: "SOC",
    etape: "commission",
    article_vise: "Article 3 du PLF 2027",
    objet_resume: "Rapport sur le fonds vert départemental",
    depose_le: "2026-06-27",
    ordre_appel: 5,
    hors_champ_40: "demande_de_rapport",
    expose:
      "Cet amendement demande au Gouvernement un rapport évaluant la territorialisation du fonds vert à l'échelle départementale.",
    dispositif: [
      {
        kind: "text",
        text: "Dans un délai de six mois à compter de la promulgation de la présente loi, le Gouvernement remet au Parlement un rapport évaluant la répartition départementale du fonds vert et son articulation avec les dotations d'investissement.",
      },
    ],
    signaux_recevabilite: {
      article_40: "aucun_signal",
      article_45: "lien_indirect",
      justification:
        "Demande de rapport : hors champ de l'article 40 malgré les mots du lexique (jurisprudence constante) ; lien indirect avec le texte.",
      fondement:
        "article 45 de la Constitution ; article 98 du Règlement de l'Assemblée nationale",
    },
    textes_lies: [
      {
        ref: "LOLF, art. 51",
        extrait: [
          {
            kind: "text",
            text: "Sont joints au projet de loi de finances de l'année… des annexes explicatives développant, pour chaque mission, le montant des crédits…",
          },
        ],
      },
    ],
    similaires: [
      {
        numero: "CD73",
        auteur: "Mme Adam",
        groupe: "SOC",
        sort: "adopté",
        ressemblance: 66,
        stade: "commission",
        lecture: "premiere",
        degre: 1,
      },
      {
        numero: "CF29",
        auteur: "M. Costa",
        groupe: "LFI",
        sort: "non-soutenu",
        ressemblance: 49,
        stade: "seance",
        lecture: "premiere",
        degre: 3,
      },
    ],
    preconisation: {
      preSort: "recevable",
      motifType: "",
      confiance: 91,
      niveau: "signal_fort",
      arguments: [
        "demande de rapport : jurisprudence constante de recevabilité (pas de charge)",
        "lien indirect art. 45 : recevable en première lecture, à surveiller en navette",
      ],
      preMotif: "",
    },
  },
  {
    numero: "CD142",
    auteur: "M. Dupont",
    groupe: "LR",
    etape: "commission",
    article_vise: "Article 3 du PLF 2027",
    objet_resume: "Subvention rénovation des collectivités",
    depose_le: "2026-06-28",
    ordre_appel: 4,
    rectification: { version: "v2", date: "2026-06-30" },
    expose:
      "Cet amendement vise à soutenir l'effort de rénovation énergétique des collectivités territoriales par un accompagnement financier renforcé de l'État.",
    dispositif: [
      {
        kind: "text",
        text: "Après l'article 3, il est inséré un article ainsi rédigé : « L'État verse à chaque collectivité concernée une subvention annuelle, ainsi qu'une dotation exceptionnelle destinée à ",
      },
      {
        kind: "modif",
        text: "financer les travaux de rénovation",
        tip: "Modifié en v2 (rect.) : cliquer pour le détail avant/après.",
        avant: "couvrir l'ensemble des dépenses",
        apres: "financer les travaux de rénovation",
        note: "Portée restreinte aux seuls travaux : tentative de réduction du champ de la charge.",
      },
      { kind: "text", text: ". »" },
    ],
    signaux_recevabilite: {
      article_40: "signal_charge",
      article_45: "lien_direct",
      justification:
        "Subvention et dotation versées par l'État : création d'une charge publique ; aucun gage possible (art. 40).",
      fondement:
        "article 40 de la Constitution ; article 89 du Règlement de l'Assemblée nationale",
    },
    textes_lies: [
      {
        ref: "CGCT, art. L.2334-42",
        extrait: [
          {
            kind: "text",
            text: "Il est institué une dotation budgétaire de soutien à l'investissement des communes… Cette dotation est destinée au financement ",
          },
          {
            kind: "modif",
            text: "des opérations prioritaires",
            tip: "Passage modifié par l'amendement : cliquer pour l'avant/après.",
            avant: "des opérations prioritaires",
            apres: "des travaux de rénovation énergétique",
            note: "L'amendement flécherait la dotation existante vers la rénovation.",
          },
          { kind: "text", text: " dans les conditions prévues par décret…" },
        ],
      },
      {
        ref: "Constitution, art. 40 (réf. fiche n°51)",
        extrait: [
          {
            kind: "text",
            text: "« Les propositions et amendements formulés par les membres du Parlement ne sont pas recevables lorsque leur adoption aurait pour conséquence soit une diminution des ressources publiques, soit la création ou l'aggravation d'une charge publique. »",
          },
        ],
      },
    ],
    similaires: [
      {
        numero: "CD87b",
        auteur: "M. Martin",
        groupe: "RE",
        sort: "rejeté",
        ressemblance: 92,
        stade: "seance",
        lecture: "premiere",
        degre: 1,
      },
      {
        numero: "AS210",
        auteur: "Mme Durand",
        groupe: "SOC",
        sort: "irrecevable",
        ressemblance: 87,
        stade: "commission",
        lecture: "premiere",
        degre: 2,
      },
      {
        numero: "CD91",
        auteur: "M. Petit",
        groupe: "HOR",
        sort: "tombé",
        ressemblance: 74,
        stade: "seance",
        lecture: "premiere",
        degre: 1,
      },
      {
        numero: "CF33",
        auteur: "M. Leroy",
        groupe: "LFI",
        sort: "retiré",
        ressemblance: 61,
        stade: "commission",
        lecture: "premiere",
        degre: 3,
      },
    ],
    preconisation: {
      preSort: "irrecevable",
      motifType: "IRR-40 charge",
      confiance: 88,
      niveau: "signal_fort",
      arguments: [
        "trois mots du lexique de dépense directe (« verse », « subvention », « dotation »)",
        "création de charge : aucun gage possible",
        "précédent proche : AS210 déclaré irrecevable (art. 40) en 2025",
        "la rectification v2 restreint le champ mais ne supprime pas la charge",
      ],
      preMotif:
        "L'amendement crée une charge publique nouvelle (subvention et dotation versées par l'État aux collectivités), non compensable par un gage : irrecevable au titre de l'article 40 de la Constitution (article 89 du Règlement de l'Assemblée nationale).",
    },
  },
  {
    numero: "CD146",
    auteur: "M. Marchand",
    groupe: "LR",
    etape: "commission",
    article_vise: "Article 4 du PLF 2027",
    objet_resume: "Suppression de l'obligation de rénovation tertiaire",
    depose_le: "2026-06-29",
    ordre_appel: 6,
    regroupement: { type: "id", cle: "supp-art4" },
    expose:
      "La suppression de l'article 4 revient sur une obligation de rénovation jugée disproportionnée pour les petites communes.",
    dispositif: [{ kind: "text", text: "Supprimer l'article 4." }],
    signaux_recevabilite: {
      article_40: "aucun_signal",
      article_45: "lien_direct",
      justification:
        "Suppression sèche d'une obligation nouvelle : aucune incidence sur les charges ni les ressources publiques.",
    },
    textes_lies: [
      {
        ref: "PLF 2027, art. 4 (texte en discussion)",
        extrait: [
          {
            kind: "text",
            text: "Les bâtiments à usage tertiaire des collectivités font l'objet d'actions de réduction de la consommation d'énergie finale…",
          },
        ],
      },
    ],
    similaires: [
      {
        numero: "412",
        auteur: "M. Bouchard",
        groupe: "LR",
        sort: "rejeté",
        ressemblance: 97,
        stade: "seance",
        lecture: "premiere",
        degre: 2,
      },
    ],
    preconisation: {
      preSort: "recevable",
      motifType: "",
      confiance: 96,
      niveau: "signal_fort",
      arguments: [
        "suppression sèche : aucune incidence budgétaire directe",
        "lien direct avec l'article visé",
        "identique à CD147 (sort commun légitime)",
      ],
      preMotif: "",
    },
  },
  {
    numero: "CD147",
    auteur: "Mme Silva",
    groupe: "SOC",
    etape: "commission",
    article_vise: "Article 4 du PLF 2027",
    objet_resume: "Suppression de l'obligation de rénovation tertiaire",
    depose_le: "2026-06-29",
    ordre_appel: 7,
    regroupement: { type: "id", cle: "supp-art4" },
    expose:
      "La suppression de l'article 4 revient sur une obligation de rénovation jugée disproportionnée pour les petites communes.",
    dispositif: [{ kind: "text", text: "Supprimer l'article 4." }],
    signaux_recevabilite: {
      article_40: "aucun_signal",
      article_45: "lien_direct",
      justification:
        "Suppression sèche d'une obligation nouvelle : aucune incidence sur les charges ni les ressources publiques.",
    },
    textes_lies: [
      {
        ref: "PLF 2027, art. 4 (texte en discussion)",
        extrait: [
          {
            kind: "text",
            text: "Les bâtiments à usage tertiaire des collectivités font l'objet d'actions de réduction de la consommation d'énergie finale…",
          },
        ],
      },
    ],
    similaires: [
      {
        numero: "412",
        auteur: "M. Bouchard",
        groupe: "LR",
        sort: "rejeté",
        ressemblance: 97,
        stade: "seance",
        lecture: "premiere",
        degre: 2,
      },
    ],
    preconisation: {
      preSort: "recevable",
      motifType: "",
      confiance: 96,
      niveau: "signal_fort",
      arguments: [
        "suppression sèche : aucune incidence budgétaire directe",
        "lien direct avec l'article visé",
        "identique à CD146 (sort commun légitime)",
      ],
      preMotif: "",
    },
  },
  {
    numero: "CD155",
    auteur: "Mme Lefèvre",
    groupe: "DEM",
    etape: "commission",
    article_vise: "Article 5 du PLF 2027",
    objet_resume: "Coordination rédactionnelle",
    depose_le: "2026-06-29",
    ordre_appel: 8,
    expose:
      "Amendement rédactionnel assurant la coordination des références au code de l'énergie.",
    dispositif: [
      {
        kind: "text",
        text: "À l'alinéa 4, substituer à la référence « L.100-4 » la référence « L.100-1 A ».",
      },
    ],
    signaux_recevabilite: {
      article_40: "aucun_signal",
      article_45: "lien_direct",
      justification: "Rédactionnel pur : aucune incidence budgétaire.",
    },
    textes_lies: [
      {
        ref: "Code de l'énergie, art. L.100-1 A",
        extrait: [
          {
            kind: "text",
            text: "La programmation énergétique nationale fixe les objectifs mentionnés au présent titre…",
          },
        ],
      },
    ],
    similaires: [
      {
        numero: "CD140",
        auteur: "M. Morel",
        groupe: "RE",
        sort: "adopté",
        ressemblance: 55,
        stade: "commission",
        lecture: "premiere",
        degre: 1,
      },
    ],
    preconisation: {
      preSort: "recevable",
      motifType: "",
      confiance: 97,
      niveau: "signal_fort",
      arguments: ["rédactionnel : aucune incidence budgétaire", "lien direct avec l'article visé"],
      preMotif: "",
    },
  },
  {
    numero: "CD158",
    auteur: "Mme Bonnet",
    groupe: "RE",
    etape: "seance",
    article_vise: "Article 5 du PLF 2027",
    objet_resume: "Publication des données énergétiques de l'État",
    depose_le: "2026-06-30",
    ordre_appel: 9,
    hors_champ_40: "charge_de_gestion",
    expose:
      "Cet amendement organise la publication annuelle des données de consommation énergétique des bâtiments de l'État, par les moyens existants de l'administration et sans création d'emplois.",
    dispositif: [
      {
        kind: "text",
        text: "L'autorité administrative publie chaque année, en format ouvert, les données de consommation énergétique des bâtiments de l'État, sans contribution financière nouvelle des collectivités.",
      },
    ],
    signaux_recevabilite: {
      article_40: "aucun_signal",
      article_45: "lien_direct",
      justification:
        "Publication assurée par les moyens existants de l'administration : simple charge de gestion, hors champ de l'article 40 malgré le mot du lexique.",
    },
    textes_lies: [
      {
        ref: "Code de l'énergie, art. L.100-1 A",
        extrait: [
          {
            kind: "text",
            text: "La programmation énergétique nationale fixe les objectifs mentionnés au présent titre…",
          },
        ],
      },
    ],
    similaires: [
      {
        numero: "CD305",
        auteur: "M. Faure",
        groupe: "SOC",
        sort: "adopté",
        ressemblance: 63,
        stade: "seance",
        lecture: "premiere",
        degre: 3,
      },
    ],
    preconisation: {
      preSort: "recevable",
      motifType: "",
      confiance: 89,
      niveau: "signal_fort",
      arguments: [
        "charge de gestion : mobilisation de moyens existants, hors champ de l'article 40",
        "lien direct avec l'article visé",
      ],
      preMotif: "",
    },
  },
  {
    numero: "CD160",
    auteur: "Mme Aubert",
    groupe: "DEM",
    etape: "commission",
    article_vise: "Article 2 du PLF 2027",
    objet_resume: "TVA réduite rénovation énergétique (rédaction 1)",
    depose_le: "2026-06-30",
    ordre_appel: 1,
    regroupement: { type: "dc", cle: "tva-renov-art2" },
    gage: "present",
    expose:
      "Cet amendement applique le taux réduit de TVA aux travaux de rénovation énergétique des logements anciens, avec une compensation intégrale pour l'État.",
    dispositif: [
      {
        kind: "text",
        text: "Rédiger ainsi l'alinéa 2 : « Le taux prévu à l'article 278-0 bis du code général des impôts s'applique aux travaux de rénovation énergétique des logements achevés depuis plus de deux ans. » La perte de recettes résultant pour l'État du présent article est compensée, à due concurrence, par la création d'une taxe additionnelle à l'accise sur les tabacs.",
      },
    ],
    signaux_recevabilite: {
      article_40: "signal_ressource",
      article_45: "lien_direct",
      justification:
        "Extension du taux réduit de TVA : diminution des ressources publiques ; gage tabac présent, dont le caractère certain, chiffrable et intégral reste à apprécier.",
      fondement:
        "article 40 de la Constitution ; article 89 du Règlement de l'Assemblée nationale",
    },
    textes_lies: [
      {
        ref: "CGI, art. 278-0 bis",
        extrait: [
          {
            kind: "text",
            text: "La taxe sur la valeur ajoutée est perçue au taux réduit de 5,5 % en ce qui concerne… ",
          },
          {
            kind: "modif",
            text: "les opérations énumérées au présent article",
            tip: "Champ modifié par l'amendement : cliquer pour l'avant/après.",
            avant: "les opérations énumérées au présent article",
            apres: "les opérations énumérées, y compris les travaux de rénovation énergétique des logements anciens",
            note: "Extension du taux réduit = perte de recettes, gagée par la taxe additionnelle tabac.",
          },
        ],
      },
    ],
    similaires: [
      {
        numero: "1424",
        auteur: "Mme Aubert",
        groupe: "DEM",
        sort: "rejeté",
        ressemblance: 100,
        stade: "seance",
        lecture: "premiere",
        identique: true,
        degre: 2,
      },
      {
        numero: "CF88",
        auteur: "M. Namur",
        groupe: "LR",
        sort: "irrecevable",
        ressemblance: 84,
        stade: "commission",
        lecture: "premiere",
        degre: 2,
      },
    ],
    preconisation: {
      preSort: "recevable",
      motifType: "",
      confiance: 64,
      niveau: "a_verifier",
      arguments: [
        "diminution de ressources gagée : la taxe additionnelle tabac est une formule reconnue",
        "le caractère intégral de la compensation reste à apprécier",
        "discussion commune avec CD161 : votes et sorts séparés",
      ],
      preMotif:
        "L'amendement étend le taux réduit de TVA ; si la compensation n'était jugée ni certaine ni intégrale, la diminution des ressources publiques serait irrecevable au titre de l'article 40 de la Constitution (article 89 du Règlement de l'Assemblée nationale).",
    },
  },
  {
    numero: "CD161",
    auteur: "M. Perrin",
    groupe: "HOR",
    etape: "commission",
    article_vise: "Article 2 du PLF 2027",
    objet_resume: "TVA réduite rénovation, champ élargi (rédaction 2)",
    depose_le: "2026-07-01",
    ordre_appel: 2,
    regroupement: { type: "dc", cle: "tva-renov-art2" },
    gage: "insuffisant",
    expose:
      "Cet amendement applique le taux réduit de TVA à l'ensemble des travaux de rénovation des bâtiments d'habitation, quelle qu'en soit la nature.",
    dispositif: [
      {
        kind: "text",
        text: "Rédiger ainsi l'alinéa 2 : « Le taux prévu à l'article 278-0 bis du code général des impôts s'applique à l'ensemble des travaux de rénovation des bâtiments d'habitation. » Les éventuelles pertes de recettes sont compensées par une contribution dont les modalités sont fixées par décret.",
      },
    ],
    signaux_recevabilite: {
      article_40: "signal_ressource",
      article_45: "lien_direct",
      justification:
        "Champ plus large que la rédaction concurrente ; gage renvoyé à un décret : ni certain ni chiffrable, donc insuffisant.",
      fondement:
        "article 40 de la Constitution ; article 89 du Règlement de l'Assemblée nationale",
    },
    textes_lies: [
      {
        ref: "CGI, art. 278-0 bis",
        extrait: [
          {
            kind: "text",
            text: "La taxe sur la valeur ajoutée est perçue au taux réduit de 5,5 % en ce qui concerne les opérations énumérées au présent article…",
          },
        ],
      },
    ],
    similaires: [
      {
        numero: "CF90",
        auteur: "Mme Ilic",
        groupe: "SOC",
        sort: "irrecevable",
        ressemblance: 88,
        stade: "commission",
        lecture: "premiere",
        degre: 2,
      },
    ],
    preconisation: {
      preSort: "irrecevable",
      motifType: "IRR-40 ressource",
      confiance: 58,
      niveau: "a_verifier",
      arguments: [
        "diminution de ressources dont le gage, renvoyé au décret, n'est ni certain ni chiffrable",
        "précédent : CF90 déclaré irrecevable sur un gage équivalent",
        "discussion commune avec CD160 : votes et sorts séparés",
      ],
      preMotif:
        "L'amendement étend le taux réduit de TVA sans gage certain et chiffrable (compensation renvoyée au décret) : diminution des ressources publiques, irrecevable au titre de l'article 40 de la Constitution (article 89 du Règlement de l'Assemblée nationale).",
    },
  },
];
