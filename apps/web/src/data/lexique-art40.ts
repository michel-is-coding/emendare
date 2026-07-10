// Lexique article 40 : donnée externalisée qui pilote le surlignage du cockpit (AD1).
// Source métier : slides du hackathon Assemblée nationale, distillées dans
// docs/metier/regles-recevabilite-hackathon-AN.md (référence : docs/metier/lexique-art40.ts).
// Liste d'exemples, non exhaustive, ÉDITABLE par les administrateurs (issue #2) :
// on modifie ce fichier, jamais un composant. La seule présence d'un mot fait naître un
// soupçon ; la qualification (charge, ressource, gage) et la décision restent humaines.

export type GroupeLexique = {
  // terme pivot de la famille (surligné aussi)
  racine: string;
  // termes dérivés ou associés de la même famille
  termes: string[];
};

export const LEXIQUE_ART40: GroupeLexique[] = [
  { racine: "Finances", termes: ["Financement", "Financer", "Financier"] },
  { racine: "Subvention", termes: ["Dotation", "Allocation", "Prime"] },
  { racine: "Accompagnement", termes: ["Soutien", "Prise en charge", "Contribution"] },
  { racine: "Contrat", termes: ["Convention", "Contractualisation"] },
  { racine: "Verser", termes: ["Affecter", "Transférer"] },
  { racine: "Investissement", termes: [] },
  { racine: "Ressources", termes: [] },
];
