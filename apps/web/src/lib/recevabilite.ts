// Recevabilité : logique et libellés partagés entre le cockpit administrateur et la
// page député (rapport député, section 3.5). Un seul modèle, deux vues, zéro logique
// dupliquée. L'outil signale un risque estimé ; l'autorité décide.

import type { Amendement, Gage, Lecture } from "../data/fixtures";

type Signal40 = Amendement["signaux_recevabilite"]["article_40"];
type Lien45 = Amendement["signaux_recevabilite"]["article_45"];
type HorsChamp = Amendement["hors_champ_40"];

// gravité du surlignage art. 40 : charge = bloquant, ressource = attention
export const graviteArt40 = (s40: Signal40): "charge" | "ressource" | null =>
  s40 === "signal_charge" ? "charge" : s40 === "signal_ressource" ? "ressource" : null;

export const libelleLecture = (lecture: Lecture): string =>
  lecture === "premiere" ? "première lecture" : "lecture ultérieure";

// format français sans passer par Date (aucune dérive de fuseau, rendu déterministe)
export const dateFr = (iso: string): string => {
  const [annee, mois, jour] = iso.split("-");
  return `${jour}/${mois}/${annee}`;
};

// l'interprétation de l'article 45 dépend de la lecture : calcul dans l'interface,
// jamais dans la donnée (déplacé depuis Focus.tsx, comportement inchangé)
export function ligneArt45(lien: Lien45, lecture: Lecture): string {
  if (lien === "lien_direct") return "Art. 45 : lien direct avec le texte, recevable.";
  if (lien === "lien_indirect")
    return lecture === "premiere"
      ? "Art. 45 : lien indirect, recevable en première lecture."
      : "Art. 45 : lien indirect, règle de l'entonnoir en lecture ultérieure (lien direct exigé), irrecevabilité probable.";
  return lecture === "premiere"
    ? "Art. 45 : aucun lien, même indirect, avec le texte : cavalier probable."
    : "Art. 45 : hors des dispositions restant en discussion (entonnoir).";
}

export const LIBELLE_GAGE: Record<Gage, string> = {
  present: "Gage présent : à apprécier (certain, chiffrable, intégral).",
  absent: "Aucun gage : irrecevabilité probable tant qu'un gage valable n'est pas apporté.",
  insuffisant: "Gage insuffisant (ni certain ni chiffrable) : irrecevabilité probable.",
};

// garde anti-découragement (F6) : hors champ explicité plutôt qu'un silence
export const LIBELLE_HORS_CHAMP: Record<NonNullable<HorsChamp>, string> = {
  demande_de_rapport:
    "Demande de rapport : hors champ de l'article 40, recevable malgré les mots signalés (jurisprudence constante).",
  charge_de_gestion:
    "Charge de gestion (mobilisation de moyens existants) : hors champ de l'article 40, recevable malgré les mots signalés.",
};

// risque art. 45 selon la lecture : cavalier probable en première lecture (lien absent),
// entonnoir en lecture ultérieure (lien direct exigé). Prédicat unique, partagé entre le
// verdict et les badges de la page député (zéro logique dupliquée).
export const risqueArt45 = (lien: Lien45, lecture: Lecture): boolean =>
  (lecture === "premiere" && lien === "lien_absent") ||
  (lecture === "ulterieure" && lien !== "lien_direct");

export type Verdict = {
  severite: "success" | "warning" | "error";
  titre: string;
  corps: string;
};

// Verdict indicatif pré-dépôt (F1), partagé par les deux pages. Convention de gravité
// alignée sur MOTIF_GRAVITE : charge = error ; ressource, cavalier, entonnoir = warning ;
// aucun signal et lien conforme à la lecture = success. Jamais « recevable » de façon
// péremptoire : toujours un risque estimé, et le geste correctif est nommé.
export function verdict(
  s: Amendement["signaux_recevabilite"],
  gage: Gage | undefined,
  horsChamp: HorsChamp,
  lecture: Lecture,
): Verdict {
  const phrases: string[] = [];
  let severite: Verdict["severite"] = "success";

  if (s.article_40 === "signal_charge") {
    severite = "error";
    phrases.push(
      "Création ou aggravation d'une charge publique (article 40) : aucun gage ne peut la couvrir ; seule la réécriture du dispositif ou l'abandon écarte le risque.",
    );
  } else if (s.article_40 === "signal_ressource") {
    severite = "warning";
    phrases.push(
      `Diminution des ressources publiques (article 40) : rattrapable par un gage certain, chiffrable et intégral. ${LIBELLE_GAGE[gage ?? "absent"]}`,
    );
  } else if (horsChamp) {
    phrases.push(LIBELLE_HORS_CHAMP[horsChamp]);
  }

  if (risqueArt45(s.article_45, lecture) && severite === "success") severite = "warning";
  phrases.push(ligneArt45(s.article_45, lecture));

  const titre =
    severite === "error"
      ? "Risque fort d'irrecevabilité : charge publique (article 40)"
      : severite === "warning"
        ? "Risque estimé : une correction est possible avant le dépôt"
        : "Aucun signal d'irrecevabilité repéré";
  phrases.push("Estimation indicative, sous réserve de l'appréciation de l'autorité compétente.");
  return { severite, titre, corps: phrases.join(" ") };
}
