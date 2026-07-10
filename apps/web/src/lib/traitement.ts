// Logique pure du traitement : progression, exports CSV (le livrable métier, J4a).
// Tout est côté client, aucune dépendance : Blob + décisions loguées en état React.

import {
  MOTIF_FONDEMENT,
  MOTIF_GRAVITE,
  type Amendement,
  type Decision,
} from "../data/fixtures.ts";

export type Progression = {
  total: number;
  traites: number;
  irrecevables: number;
  bloquants: number; // IRR-40 charge : définitif, non gageable
  attention: number; // autres motifs : curables ou contestables
  evidentsRestants: number; // cas à signal fort non encore instruits (AD4)
};

export function progression(
  liste: Amendement[],
  decisions: Record<string, Decision>,
): Progression {
  const p: Progression = {
    total: liste.length,
    traites: 0,
    irrecevables: 0,
    bloquants: 0,
    attention: 0,
    evidentsRestants: 0,
  };
  for (const a of liste) {
    const d = decisions[a.numero];
    if (!d) {
      if (a.preconisation.niveau === "signal_fort") p.evidentsRestants++;
      continue;
    }
    p.traites++;
    if (d.sort !== "irrecevable") continue;
    p.irrecevables++;
    if (d.motifType && MOTIF_GRAVITE[d.motifType] === "bloquant") p.bloquants++;
    else p.attention++;
  }
  return p;
}

const SEPARATEUR = ";"; // convention tableur français

const champ = (v: string | number | undefined): string => {
  const s = String(v ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const enCsv = (lignes: (string | number | undefined)[][]): string =>
  "\uFEFF" + lignes.map((l) => l.map(champ).join(SEPARATEUR)).join("\r\n");

const parOrdreAppel = (liste: Amendement[]): Amendement[] =>
  [...liste].sort((a, b) => a.ordre_appel - b.ordre_appel);

const signalTexte = (a: Amendement): string => {
  if (a.signaux_recevabilite.article_40 === "signal_charge") return "charge (bloquant)";
  if (a.signaux_recevabilite.article_40 === "signal_ressource") return "ressources (attention)";
  if (a.hors_champ_40 === "demande_de_rapport") return "hors champ (demande de rapport)";
  if (a.hors_champ_40 === "charge_de_gestion") return "hors champ (charge de gestion)";
  return "aucun";
};

// liste des irrecevables avec motifs : ce que le président notifie aux auteurs
export function csvIrrecevables(
  liste: Amendement[],
  decisions: Record<string, Decision>,
): string {
  const lignes: (string | number | undefined)[][] = [
    ["Ordre d'appel", "Numéro", "Auteur", "Groupe", "Article visé", "Motif", "Fondement", "Argumentaire"],
  ];
  for (const a of parOrdreAppel(liste)) {
    const d = decisions[a.numero];
    if (d?.sort !== "irrecevable") continue;
    lignes.push([
      a.ordre_appel,
      a.numero,
      a.auteur,
      a.groupe,
      a.article_vise,
      d.motifType,
      d.motifType ? MOTIF_FONDEMENT[d.motifType] : "",
      d.motifTexte,
    ]);
  }
  return enCsv(lignes);
}

// dérouleur annoté : la feuille de travail complète, dans l'ordre d'appel
export function csvDerouleur(
  liste: Amendement[],
  decisions: Record<string, Decision>,
): string {
  const lignes: (string | number | undefined)[][] = [
    [
      "Ordre d'appel",
      "Numéro",
      "Auteur",
      "Groupe",
      "Article visé",
      "Objet",
      "Signal art. 40",
      "Gage",
      "Regroupement",
      "Décision",
      "Motif",
    ],
  ];
  for (const a of parOrdreAppel(liste)) {
    const d = decisions[a.numero];
    lignes.push([
      a.ordre_appel,
      a.numero,
      a.auteur,
      a.groupe,
      a.article_vise,
      a.objet_resume,
      signalTexte(a),
      a.gage ?? "",
      a.regroupement ? `${a.regroupement.type} ${a.regroupement.cle}` : "",
      d?.sort ?? "à instruire",
      d?.motifTexte ?? "",
    ]);
  }
  return enCsv(lignes);
}

export function telecharger(nomFichier: string, contenu: string): void {
  const blob = new Blob([contenu], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(url);
}
