// Lexique article 40 - source : slides hackathon Assemblee nationale (data/).
// Mots-cles dont la seule presence fait soupconner une irrecevabilite financiere (art. 40).
// Liste d exemples, non exhaustive, EDITABLE par les administrateurs (issue #2).
// Destine a piloter le surlignage red-flag du cockpit (aujourd hui code en dur).
// Reference de rangement, non encore importe par l app (respecte le gel avant dev).

export type GroupeLexique = {
  // terme pivot de la famille (surligne aussi)
  racine: string;
  // termes derives ou associes de la meme famille
  termes: string[];
};

export const LEXIQUE_ART40: GroupeLexique[] = [
  { racine: "Finances", termes: ["Financement", "Financer", "Financier"] },
  { racine: "Subvention", termes: ["Dotation", "Allocation", "Prime"] },
  { racine: "Accompagnement", termes: ["Soutien", "Prise en charge", "Contribution"] },
  { racine: "Contrat", termes: ["Convention", "Contractualisation"] },
  { racine: "Verser", termes: ["Affecter", "Transferer"] },
  { racine: "Investissement", termes: [] },
  { racine: "Ressources", termes: [] },
];

// Liste a plat (racines + termes) pour une detection simple par correspondance de mot.
export const MOTS_ART40: string[] = LEXIQUE_ART40.flatMap((g) => [g.racine, ...g.termes]);
