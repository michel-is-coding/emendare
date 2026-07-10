// Repérage des mots du lexique article 40 (AD1) : la donnée pilote le surlignage,
// jamais un composant. Le lexique repère le soupçon (présence du mot) ; la
// qualification charge / ressource / gage et la décision restent humaines.

import { LEXIQUE_ART40 } from "../data/lexique-art40.ts";
import type { Segment } from "../data/fixtures.ts";

export const normaliser = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// ponytail: dérivation par suffixes (pluriel + conjugaisons du 1er groupe), pas de
// lemmatisation ; suffisant pour le lexique d'exemples. Brancher un lemmatiseur si le
// lexique réel des administrateurs (issue #2) fait apparaître des ratés.
function formesDe(terme: string): string[] {
  const t = normaliser(terme);
  const formes = [t, `${t}s`];
  if (t.endsWith("er")) {
    const radical = t.slice(0, -2);
    formes.push(`${radical}e`, `${radical}es`, `${radical}ent`, `${radical}ee`, `${radical}ees`);
  }
  return formes;
}

// index : forme normalisée (1 à 3 mots) → famille (racine du groupe de lexique)
const INDEX = new Map<string, string>();
for (const groupe of LEXIQUE_ART40) {
  for (const terme of [groupe.racine, ...groupe.termes]) {
    const mots = terme.split(/\s+/);
    if (mots.length === 1) {
      for (const forme of formesDe(terme)) INDEX.set(forme, groupe.racine);
    } else {
      // expression : forme exacte + pluriel du premier mot (« prises en charge »)
      const reste = mots.slice(1).map(normaliser).join(" ");
      INDEX.set(`${normaliser(mots[0])} ${reste}`, groupe.racine);
      INDEX.set(`${normaliser(mots[0])}s ${reste}`, groupe.racine);
    }
  }
}
const LONGUEUR_MAX = 3; // « Prise en charge »

export type Occurrence = { debut: number; fin: number; famille: string };

export function reperer(texte: string): Occurrence[] {
  const tokens = [...texte.matchAll(/\p{L}+/gu)].map((m) => ({
    debut: m.index ?? 0,
    fin: (m.index ?? 0) + m[0].length,
    norm: normaliser(m[0]),
  }));
  const occurrences: Occurrence[] = [];
  let i = 0;
  while (i < tokens.length) {
    let trouve = false;
    for (let n = Math.min(LONGUEUR_MAX, tokens.length - i); n >= 1 && !trouve; n--) {
      const cle = tokens
        .slice(i, i + n)
        .map((t) => t.norm)
        .join(" ");
      const famille = INDEX.get(cle);
      if (famille) {
        occurrences.push({ debut: tokens[i].debut, fin: tokens[i + n - 1].fin, famille });
        i += n;
        trouve = true;
      }
    }
    if (!trouve) i++;
  }
  return occurrences;
}

const tipPour = (famille: string): string =>
  `Mot du lexique article 40 (famille « ${famille} »). La seule présence du mot fait naître un soupçon ; la qualification (charge, ressource, gage) revient à l'administrateur.`;

// transforme les segments « text » en alternance text / mot signalé ; les segments
// « modif » (rectifications) et les segments déjà marqués sont laissés tels quels
export function marquerLexique(segments: Segment[]): Segment[] {
  return segments.flatMap((s) => {
    if (s.kind !== "text") return [s];
    const occurrences = reperer(s.text);
    if (occurrences.length === 0) return [s];
    const sortie: Segment[] = [];
    let pos = 0;
    for (const o of occurrences) {
      if (o.debut > pos) sortie.push({ kind: "text", text: s.text.slice(pos, o.debut) });
      sortie.push({
        kind: "redflag",
        text: s.text.slice(o.debut, o.fin),
        famille: o.famille,
        tip: tipPour(o.famille),
      });
      pos = o.fin;
    }
    if (pos < s.text.length) sortie.push({ kind: "text", text: s.text.slice(pos) });
    return sortie;
  });
}

export const marquerTexte = (texte: string): Segment[] =>
  marquerLexique([{ kind: "text", text: texte }]);
