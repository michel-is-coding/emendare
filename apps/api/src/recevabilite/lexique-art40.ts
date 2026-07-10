// Lexique article 40 — miroir applicatif de docs/metier/lexique-art40.ts (source hackathon AN).
// À terme : déplacé en DB pour édition par les administrateurs (issue #2) ; garder les deux
// fichiers synchronisés d'ici là.

export type GroupeLexique = {
  racine: string;
  termes: string[];
};

export const LEXIQUE_ART40: GroupeLexique[] = [
  { racine: 'Finances', termes: ['Financement', 'Financer', 'Financier'] },
  { racine: 'Subvention', termes: ['Dotation', 'Allocation', 'Prime'] },
  {
    racine: 'Accompagnement',
    termes: ['Soutien', 'Prise en charge', 'Contribution'],
  },
  { racine: 'Contrat', termes: ['Convention', 'Contractualisation'] },
  { racine: 'Verser', termes: ['Affecter', 'Transferer'] },
  { racine: 'Investissement', termes: [] },
  { racine: 'Ressources', termes: [] },
];

export const MOTS_ART40: string[] = LEXIQUE_ART40.flatMap((g) => [
  g.racine,
  ...g.termes,
]);
