// Libellés d'affichage des valeurs d'énumération de l'API.

export const NATURE_LIBELLE: Record<string, string> = {
  projet_de_loi: "Projet de loi",
  proposition_de_loi: "Proposition de loi",
  projet_loi_finances: "Projet de loi de finances",
  projet_loi_financement_securite_sociale: "PLFSS",
  projet_loi_ratification_ordonnance: "Ratification d'ordonnance",
  revision_constitutionnelle: "Révision constitutionnelle",
  proposition_loi_organique: "Proposition de loi organique",
  projet_loi_organique: "Projet de loi organique",
};

export const VERSION_LIBELLE: Record<string, string> = {
  texte_initial: "Texte initial",
  texte_commission: "Texte de commission",
  texte_adopte_an: "Texte adopté par l'AN",
  texte_adopte_senat: "Texte adopté par le Sénat",
  texte_cmp: "Texte de CMP",
  lecture_definitive: "Lecture définitive",
};

export const STATUT_LIBELLE: Record<string, string> = {
  PENDING: "à instruire",
  RECEIVABLE: "recevable",
  IRRECEIVABLE: "irrecevable",
};
