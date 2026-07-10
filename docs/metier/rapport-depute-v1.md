# Rapport final implementation-ready : page député et modèle de données partagé administrateur-député

Cadre : worktree `<worktree local>/emendare`. Application `apps/web` (Next.js, react-dsfr 1.32.4). Le cockpit administrateur est déjà spécifié et en cours d'implémentation ; la page député en est le miroir amont, sur le même objet de données. Principe non négociable : un seul modèle, deux vues, zéro logique dupliquée. L'outil signale et prépare ; l'autorité décide.

Registre de la copie destinée à l'utilisateur : français soutenu, sans tiret cadratin, sans anglicisme, information jamais portée par la seule couleur (RGAA).

---

## 1. Mécanismes métier réels et ce qu'ils imposent à l'interface

Trois mécanismes distincts gouvernent la page. Les confondre serait la première erreur de conception.

### 1.1 Travail réel du député et de son collaborateur

L'utilisateur opérationnel est le collaborateur parlementaire ; le décideur et le porte-parole est le député. Le collaborateur rédige le dispositif et l'exposé sommaire, choisit le gage, vérifie les précédents ; le député arbitre, cosigne, signe, dépose et défend. Le cycle réel : rédaction, puis dépôt écrit et signé sur le portail ELOI au plus tard à dix-sept heures le troisième jour ouvrable précédant l'examen (article 86 du Règlement en commission, article 99 en séance), puis contrôle de recevabilité dès le dépôt, puis inscription au dérouleur, puis défense orale limitée à deux minutes (article 100). Le point de tension central est la recevabilité financière : une charge (singulier) n'est jamais gageable et vaut irrecevabilité définitive ; une diminution de ressources (pluriel) est rattrapable par un gage certain, chiffrable et intégral.

Ce que cela impose à l'interface :
- Deux niveaux de densité pour un seul dossier : un plan de rédaction et de vérification pour le collaborateur, une synthèse pour le député. En pratique, une même page, un verdict lisible en tête, le détail dessous.
- Une seule initiative à la fois. La page est un assistant guidé, jamais le poste de travail dense du cockpit.
- Deux champs de saisie calqués sur la structure réglementaire obligatoire : dispositif et exposé sommaire.
- La contrainte des deux minutes de défense devient une fonctionnalité (trame réutilisant l'exposé sommaire et les arguments).

### 1.2 Boucle de recevabilité administrateur-auteur (à ne pas confondre avec la navette)

C'est une conversation encadrée par un couperet temporel, entièrement interne à l'Assemblée, autour d'un dépôt. La recevabilité est appréciée à l'expiration du délai limite : aucune correction postérieure ne rend recevable (rapport Coquerel n° 1891). L'amendement irrecevable est renvoyé à son auteur, n'est ni distribué ni appelé, ne figure pas au dérouleur. Le seul droit formel de l'auteur est de demander une explication écrite de l'irrecevabilité (article 89 alinéa 6). Aucun recours interne : seule la saisine a posteriori du Conseil constitutionnel existe. Modèle Assemblée, non modèle Sénat : ici le gage manquant n'est pas ajouté d'office, la correction et le redépôt restent à l'auteur ; le président et les services se tiennent à disposition, mais cette assistance est aujourd'hui informelle et non outillée. C'est exactement ce vide que la page comble.

Ce que cela impose à l'interface :
- Un état de recevabilité distinct du sort de vote. Le sort vient du vote ; la recevabilité vient de l'instruction, se rejoue par stade (commission puis séance, article 89 alinéa 4).
- Un objet-pont, la notification : le motif que l'administrateur logue à sa décision devient ce que le député consulte. Le nommer boucle de recevabilité, jamais navette.
- Un compte à rebours vers le délai limite qui transforme le verdict en geste. Après le délai, l'outil doit dire clairement qu'il est trop tard.
- Des remèdes différenciés selon le motif : ajouter ou corriger un gage pour une ressource ; réécrire ou renoncer pour une charge ; resserrer le lien pour un cavalier.
- Le droit à explication écrite opérationnalisé : un bouton côté auteur, une file côté administrateur.

### 1.3 Navette Assemblée-Sénat et mode suivi

Un texte chemine par lectures successives jusqu'à l'adoption d'un texte identique (article 45). Un amendement porte deux sorts successifs (commission puis séance) et, d'une lecture à l'autre, il est redéposé sous un nouveau numéro : il n'existe pas d'identifiant stable reliant ses avatars. Dès la deuxième lecture, les articles votés en termes identiques sont conformes et sortent de la discussion ; la règle de l'entonnoir exige alors un lien direct avec une disposition restant en discussion. La question du député n'est pas seulement « mon amendement a-t-il été adopté », mais « sa substance a-t-elle survécu » : une idée peut être reprise par le rapporteur ou le Gouvernement sous une autre rédaction, l'amendement d'origine étant alors retiré, tombé ou rejeté. La reprise n'est pas un sort officiel.

Ce que cela impose à l'interface (phase 2, mode suivi, détail en section 4) :
- Deux informations séparées : le sort formel du dernier avatar, issu des données ; et un statut de survie de fond, déduit du rapprochement sémantique, marqué explicitement comme indicatif.
- Le statut de l'article visé (conforme, modifié, supprimé, ajouté) comme clé de jointure commune aux deux vues : côté député, il dit si un redépôt reste possible ; côté administrateur, il conditionne la recevabilité au titre de l'entonnoir.
- Le paramètre `lecture` vit au niveau du dossier et pilote l'article 45 des deux côtés.

---

## 2. Page député : recommandations par fonctionnalité

La page est un assistant en étapes (composant `Stepper`, purement présentationnel, index d'étape en état React, à l'identique du patron `idx` du cockpit). Ossature à quatre étapes : saisie, contexte, vérification guidée, verdict et précédents. Chaque composant cité est confirmé présent dans react-dsfr 1.32.4.

Convention de gravité, alignée sur `MOTIF_GRAVITE` déjà défini dans `fixtures.ts` : charge = `error` (bloquant) ; ressource, cavalier, entonnoir, organique = `warning` (attention) ; aucun signal et lien conforme à la lecture = `success`. Jamais « recevable » de façon péremptoire : toujours « risque estimé » et « sous réserve de l'appréciation de l'autorité ».

### P0 : cœur de la page

**F1. Verdict indicatif de recevabilité avant dépôt.**
Composant : `Alert` (severity `success` / `warning` / `error`, `small`, `role="status"` avec `aria-live="polite"` sur la zone recalculée), complété de `Badge` pour chaque signal (article 40, article 45). Comportement : le verdict se recalcule à chaque modification du brouillon, du gage ou de la lecture, par la fonction pure partagée `verdict(signaux, gage, hors_champ_40, lecture)` (section 3). Ancrage : la recevabilité est contrôlée au dépôt, l'irrecevable meurt avant tout débat, sans recours interne. Degrés de liberté : titre de l'`Alert` reformulable ; possibilité d'un second niveau qualitatif « signal fort / à vérifier » repris de `Preconisation.niveau`.

**F2. Surlignage des mots signalés de l'article 40 pendant la saisie.**
Aucune construction : réutiliser tel quel `marquerLexique` et `marquerTexte` de `apps/web/src/lib/lexique.ts` (déjà des fonctions partagées, déjà pilotées par la donnée éditable `apps/web/src/data/lexique-art40.ts`) et le rendu `mark` du composant `Segments` de `Focus.tsx`. Seule condition : exporter `Segments` (voir section 3, migration). Comportement : le lexique repère le soupçon, il ne juge pas ; la balise `mark` porte un `Tooltip` explicatif. Ancrage : attire l'œil au moment où l'auteur peut encore corriger. Degré de liberté : appliquer le surlignage au dispositif en cours de frappe (recalcul à la volée), là où le cockpit le pose sur un dispositif figé.

**F3. Champ gage actionnable et bascule du verdict.**
Composant : `SegmentedControl` (présent / absent / insuffisant) plus un `CallOut` porteur des formules reconnues, éditables, prêtes à coller (compensation « à due concurrence », taxe additionnelle à l'accise sur les tabacs, majoration de la dotation globale de fonctionnement pour les collectivités). Comportement : tester l'amendement avec et sans gage, voir le verdict basculer ; quand l'article 40 vaut `signal_charge`, afficher explicitement qu'aucun gage n'est possible, seule la réécriture ou l'abandon. Rappeler que seul le Gouvernement peut lever le gage en séance, jamais le député. Ancrage : le gage est le seul levier de l'auteur. Réutilise le champ `gage` (`present` / `absent` / `insuffisant`) et les libellés `LIBELLE_GAGE` de `Focus.tsx`. Degré de liberté : le `gage_propose` rédigé par l'auteur peut rester en état React éphémère (aucune fixture).

**F4. Compte à rebours vers le délai limite.**
Composant : `<time>` natif plus texte, sévérité montée en `warning` à l'approche. Donnée : l'échéance « délai limite de dépôt » lue dans `session` (aligné e0.calendrier.echeances, section 3). Comportement : afficher l'échéance et le temps restant ; transformer le verdict en actions (corriger, gager, reformuler, cosigner) tant que la fenêtre est ouverte ; après le délai, message clair d'impossibilité de rattrapage. Ancrage : recevabilité figée à l'expiration du délai. Degré de liberté : affichage statique de l'échéance suffisant en v1 ; le rafraîchissement vivant (une minute) est une finition P1, sans bibliothèque, un `setInterval` de soixante secondes.

**F5. Garde-fou de posture, non fermable.**
Composant : `Notice` (`isClosable={false}`). Texte : le verdict est une estimation indicative avant dépôt ; la recevabilité appartient au président de la commission saisie au fond en commission, au Président de l'Assemblée en séance, après consultation éventuelle de la commission des finances ; il n'existe aucun recours interne. Ancrage : charte et honnêteté du produit (garde-fou n° 4). Aucun degré de liberté sur le fond : nommer l'autorité selon le stade, ne jamais suggérer un recours inexistant.

**F6. Garde anti-découragement.**
Réutiliser `hors_champ_40` (`charge_de_gestion`, `demande_de_rapport`) et le bloc explicatif du composant `Signaux` de `Focus.tsx`. Comportement : signaler explicitement « hors champ de l'article 40, recevable malgré les mots signalés » plutôt qu'un silence. Ancrage : symétrique du garde anti-faux-positifs du cockpit ; empêche l'auteur de renoncer à tort. Classé P0 car il conditionne la confiance dans F1 et F2.

### P1

**F7. Sélecteur de lecture conditionnant l'article 45.**
Composant : `SegmentedControl` (première lecture / lectures ultérieures), reprise exacte du patron déjà présent dans `VueEnsemble.tsx`. Comportement : en première lecture, lien même indirect suffit (cavalier si lien absent) ; en lecture ultérieure, entonnoir, lien direct exigé. La donnée `article_45` reste brute ; l'interprétation dépend de la lecture, calculée par la fonction partagée `ligneArt45`. Ancrage : la règle du lien change avec la lecture. Degré de liberté : valeur par défaut « première lecture ».

**F8. Similaires et précédents sur le brouillon.**
Composant : liste sobre (`<ul>`, reprise du composant `Similaires` de `Focus.tsx`) avec `SortBadge` (déjà exporté) pour le sort, `stade` et `lecture` affichés, et un `SegmentedControl` pour la portée (trois degrés : même texte, textes ciblés, tout l'historique). Comportement : distinguer la quasi-duplication supérieure à quatre-vingt-dix pour cent (régime des identiques ou discussion commune, donc cosigner ou changer de rédaction) de la simple proximité thématique (inspiration d'un précédent) ; un identique déjà déclaré irrecevable est l'indice prédictif le plus fort, jamais une garantie. Ancrage : répond à l'angoisse du déjà rejeté. Degré de liberté sur la source en v1 : soit agréger les listes `similaires` des fixtures comme corpus de précédents, soit pré-remplir le brouillon depuis un exemple existant qui porte ses `similaires` ; le raccordement réel se fera par `POST /amendments/similar` (paraphrase libre, le brouillon n'a pas d'identifiant), et non par `GET /amendments/:id/similar` réservé aux amendements déposés.

**F9. Trame de défense de deux minutes.**
Composant : `CallOut` ou `Accordion`. Contenu : l'exposé sommaire et `preconisation.arguments` mis en forme, avec rappel de l'enjeu de présence à l'appel (auteur absent, amendement non soutenu, article 100). Ancrage : prépare la prise de parole en commission comme en séance. Aucune donnée nouvelle.

**F10. Demander l'explication écrite de l'irrecevabilité (article 89 alinéa 6).**
Composant : `Button`, actif une fois l'amendement déposé et jugé. Comportement : composer une demande pré-remplie du motif et du fondement lus dans la notification (section 3), copiable ou exportable. Côté administrateur, cette demande alimente une file pré-remplie. Ancrage : seul droit formel de l'auteur, valeur réelle pour un coût faible ; le motif ne se pousse pas d'office, il se demande.

### P2

**F11. Cosignataires.**
Champ additif `cosignataires?: string[]` sur `Amendement`. Un cosignataire est un autre député, donc une donnée plus riche, pas un rôle. Sert la couverture de défense, le risque de non soutenu, la reprise au sein du groupe, et éclaire la priorité d'appel via `regroupement`. Affichage sobre, aucune logique de recevabilité.

**F12. Mode suivi de la navette (réversible).**
Détail en section 4. Frise de vie, statut de survie de fond distinct du sort formel, statut de l'article visé au fil de la navette. À marquer explicitement indicatif : la reprise n'est pas un sort.

---

## 3. Modèle de données partagé (le point central)

### 3.1 Principe

Un seul objet `Amendement` (déjà défini dans `fixtures.ts`) est le bloc partagé. La page administrateur et la page député sont deux vues et deux permissions sur le même enregistrement, jamais deux modèles. La page député recueille un brouillon (dispositif, exposé, article visé, lecture, gage), en état React éphémère, et restitue les mêmes champs calculés que l'administrateur instruit (`signaux_recevabilite`, `preconisation`, `similaires`). Cet alignement projette directement les livrables E7 (`signaux_recevabilite`) et E2 (risques typés, gravité, précédents, recommandation).

### 3.2 Blocs communs, spécifique par rôle

| Bloc | Nature | Où |
|---|---|---|
| `Amendement` (numéro, auteur, groupe, étape, article visé, objet, date, `ordre_appel`, `regroupement`, `rectification`, `hors_champ_40`, `expose`, `dispositif`, `signaux_recevabilite`, `gage`, `textes_lies`, `similaires`, `preconisation`) | **Partagé**, existant, inchangé | `fixtures.ts` |
| `signaux_recevabilite` (article 40, article 45, justification, fondement) | **Partagé**, central, calculé une fois | `fixtures.ts` |
| `gage` qualifié (`present` / `absent` / `insuffisant`) | **Partagé**, lu à l'identique | `fixtures.ts` |
| Tables `MOTIF_TYPES`, `MOTIF_GRAVITE`, `MOTIF_FONDEMENT` | **Partagé**, vocabulaire unique | `fixtures.ts` |
| Lexique article 40 et fonctions de surlignage | **Partagé**, déjà éditable et déjà mutualisé | `data/lexique-art40.ts`, `lib/lexique.ts` |
| Fonction verdict et lignes article 45 / gage | **Partagé**, à extraire (voir 3.5) | `lib/recevabilite.ts` (nouveau) |
| Décision loguée (`Decision`) | **Spécifique administrateur**, état de session éphémère | état React du `Cockpit`, non persisté |
| Brouillon (dispositif, exposé, gage proposé) | **Spécifique député**, état éphémère | état React de la page député |
| `Notification` (motif notifié, fondement, gravité, stade, lecture, voie de passage) | **Objet-pont** produit par l'administrateur, lu par le député | `fixtures.ts` (seed statique v1) |

Cut de simplification assumé : la recherche proposait deux types conteneurs `VueAdministrateur` et `VueDepute`. Ils sont superflus en v1. La décision de l'administrateur vit déjà en état React (`Record<numero, Decision>`), le brouillon du député vivra de même. Le seul datum persisté nécessaire à la démonstration est la `Notification` (ce que l'administrateur a décidé, ce que le député voit). Ajouter les conteneurs quand un service back-end persistera l'état par rôle, pas avant.

### 3.3 Axe 1 : session parlementaire

Clé commune de regroupement de tous les amendements d'un même texte. Agrège `e0.dossier` (identité du texte) et `e7.evenements` (journal de procédure). En v1, une constante unique. La `lecture` et le `stade_courant` sont l'horloge qui fait basculer la règle de l'article 45 des deux côtés.

### 3.4 Axe 2 : ressemblance (API pgvector)

Deux régimes issus du même moteur : quasi-duplication supérieure à quatre-vingt-dix pour cent (conséquence procédurale, régime des identiques et de la discussion commune) et proximité thématique autour de soixante pour cent (simple précédent). Trois degrés de recherche déjà portés par `Similaire.degre` (1 même texte, 2 textes ciblés, 3 historique). Le degré 1 est intra-session, les degrés 2 et 3 sont transversaux : c'est le socle du parangonage. Ne matérialiser un type `Grappe` que si une vue de navigation par grappe le justifie ; sinon, la dérivation depuis `similaires` et `regroupement` suffit (ne pas construire un moteur relationnel en v1).

### 3.5 Types concrets à ajouter (additifs, alignés e7, statiques, sans back-end)

Tout est optionnel ou nouveau : le cockpit compile sans modification.

```ts
// ── AXE 1 : session parlementaire (constante unique en v1) ──
// aligné e0.dossier.nature
export type TexteNature =
  | "projet_de_loi" | "proposition_de_loi" | "projet_loi_finances"
  | "projet_loi_financement_securite_sociale" | "projet_loi_ratification_ordonnance"
  | "revision_constitutionnelle" | "proposition_loi_organique" | "projet_loi_organique";

export type Texte = {
  id: string; uid_an?: string; titre: string;
  nature: TexteNature; numero: string; commission_fond?: string;
};

// sous-ensemble de l'enum e7.evenements.type
export type EvenementType =
  | "depot_amendements" | "examen_commission" | "texte_commission_adopte"
  | "examen_seance" | "transmission_autre_assemblee" | "retour_navette"
  | "convocation_cmp" | "accord_cmp" | "echec_cmp" | "lecture_definitive" | "promulgation";

export type EvenementProcedure = { type: EvenementType; date: string; lecture?: string; detail?: string };

export type Session = {
  legislature: number;
  session_ordinaire: string;   // ex. "2026-2027"
  texte: Texte;
  lecture: Lecture;
  stade_courant: Stade;
  delai_limite: string;        // échéance de dépôt, alimente le compte à rebours (F4)
  evenements: EvenementProcedure[];
};

export const session: Session = {
  legislature: 17,
  session_ordinaire: "2026-2027",
  texte: { id: "plf-2027", titre: "Projet de loi de finances pour 2027",
           nature: "projet_loi_finances", numero: "0000", commission_fond: "Finances" },
  lecture: "premiere",
  stade_courant: "commission",
  delai_limite: "2026-07-06T17:00:00+02:00",
  evenements: [
    { type: "depot_amendements", date: "2026-06-26" },
    { type: "examen_commission", date: "2026-07-07" },
  ],
};

// ── Amendement (bloc partagé) : deux champs additifs OPTIONNELS ──
//   texte_id?: string   → clé de jointure vers la session (défaut = session.texte.id)
//   sorts?: SortStade[] → 0 à 2 sorts successifs ; sert le mode suivi, PAS le verdict pré-dépôt
export type SortStade = { stade: Stade; lecture: Lecture; sort: SortReel };

// ── Objet-pont : BOUCLE DE RECEVABILITÉ (administrateur → auteur), distincte de la navette ──
export type Notification = {
  motifType: MotifType; motifTexte: string; fondement: string;
  stade: Stade; lecture: Lecture; date: string;
  voie_de_passage?: string;   // ex. "ajouter un gage tabac à due concurrence"
};
// seed statique v1 : quels amendements ont reçu une notification (démo de la vue député)
export const notifications: Record<string, Notification> = {
  CD87: {
    motifType: "IRR-40 ressource",
    motifTexte:
      "L'amendement étend et majore un crédit d'impôt sans gage valable : diminution des ressources publiques, irrecevable au titre de l'article 40.",
    fondement: MOTIF_FONDEMENT["IRR-40 ressource"],
    stade: "commission", lecture: "premiere", date: "2026-06-27",
    voie_de_passage: "Ajouter un gage certain et intégral (taxe additionnelle à l'accise sur les tabacs, à due concurrence).",
  },
};

// ── AXE 2 : ressemblance (à matérialiser SEULEMENT si une vue par grappe l'exige) ──
export type Grappe = {
  cle: string;
  type: "quasi_duplication" | "proximite_thematique";
  membres: string[]; regime?: "id" | "dc";
};

// ── Extension réservée, NON construite (section 5) : couche avis du rapporteur ──
export type AvisRapporteur = {
  sens: "favorable" | "defavorable" | "demande_de_retrait" | "sagesse" | "satisfait";
  argumentaire?: string;
};
```

Fonction verdict, partagée par les deux pages (extraction de la logique aujourd'hui interne à `Signaux` / `ligneArt45` / `LIBELLE_GAGE` de `Focus.tsx`) :

```ts
// apps/web/src/lib/recevabilite.ts  (NOUVEAU, additif)
export type Verdict = { severite: "success" | "warning" | "error"; titre: string; corps: string };

export function verdict(
  s: Amendement["signaux_recevabilite"],
  gage: Gage | undefined,
  horsChamp: Amendement["hors_champ_40"],
  lecture: Lecture,
): Verdict { /* charge => error ; ressource / cavalier / entonnoir => warning ; aucun_signal + lien conforme => success ;
               jamais "recevable" péremptoire ; nomme le geste correctif */ }

export function ligneArt45(article_45: string, lecture: Lecture): string { /* déplacé depuis Focus.tsx */ }
export const LIBELLE_GAGE: Record<Gage, string> = { /* déplacé depuis Focus.tsx */ };
```

### 3.6 Migration des fixtures sans casser le cockpit

Toutes les étapes sont additives ou des déplacements en place. Le cockpit compile et se comporte à l'identique.

1. **`fixtures.ts` (fichier partagé, additif).** Ajouter les champs optionnels `texte_id?` et `sorts?` à `Amendement` ; ajouter les nouveaux exports `TexteNature`, `Texte`, `EvenementType`, `EvenementProcedure`, `Session`, `session`, `SortStade`, `Notification`, `notifications`, `Grappe`, `AvisRapporteur`. Les fixtures existantes n'ont pas à être touchées (champs optionnels omis). Risque : nul sur le comportement, mais fichier partagé, donc revue additive.
2. **`lib/recevabilite.ts` (nouveau, additif) puis `Focus.tsx` (partagé, prudence).** Déplacer `ligneArt45`, `LIBELLE_GAGE` et la synthèse de gravité de `Focus.tsx` vers `lib/recevabilite.ts` ; `Focus.tsx` les importe. Refactor en place, comportement inchangé : à couvrir par le passage en navigateur du cockpit (non-régression).
3. **`Segments` partagé (partant de `Focus.tsx`, prudence).** Exporter `Segments` (aujourd'hui interne) ou le déplacer avec `SortBadge` dans `apps/web/src/app/_shared/`. `SortBadge` est déjà exporté. Import inchangé côté cockpit.
4. **`page.tsx` (partagé, additif).** Activer la tuile Député : remplacer `disabled` par `linkProps={{ href: "/depute" }}`, conserver ou retirer le badge « phase 2 ».
5. **`app/depute/` (purement additif).** Nouvelle route `app/depute/page.tsx` plus le composant `PosteDepute.tsx` qui consomme le socle partagé.

Aucune dépendance nouvelle. Aucune valeur hexadécimale hors jetons `fr.colors.decisions`. Aucun back-end.

---

## 4. Mode suivi de la navette (phase 2)

Le mode suivi lit `e7.evenements` (horloge) et `e7.note_navette.articles[].statut` (clé de jointure), plus les `sorts?: SortStade[]` ajoutés à `Amendement`. Il sert les deux rôles à partir de la même donnée.

Ce que voit le **député** :
- Une frise de vie de l'amendement, suite d'étapes datées alignées sur l'enum `EvenementType` (dépôt commission, sort commission, texte de la commission, dépôt séance, sort séance, transmission, retour de navette, CMP, lecture définitive, promulgation).
- Le sort formel du dernier avatar, avec son stade et sa lecture (`SortBadge`), en distinguant visuellement « tombé » et « non soutenu », qui ne sont pas des jugements au fond, d'un rejet ou d'une irrecevabilité.
- Un statut de survie de fond (survécu, tombé, repris sous une autre forme, à surveiller), déduit du rapprochement sémantique, marqué explicitement indicatif et non certifié : la reprise n'est pas un sort officiel.
- Le statut de l'article visé (conforme, modifié, supprimé, ajouté) : si l'article est devenu conforme, l'amendement est hors jeu pour les lectures suivantes ; s'il reste modifié, un redépôt reste possible, sous réserve de l'entonnoir en lecture ultérieure.
- S'il est tombé, l'amendement concurrent qui l'a fait tomber (via `ordre_appel` et `regroupement`).

Ce que voit l'**administrateur** en plus :
- La note de navette (`note_navette`) : tableau des articles restant en discussion, statut, nature de la divergence entre les deux assemblées, et pour la CMP les options de compromis documentées, sans préconisation politique.
- En lecture définitive, la contrainte de l'article 45 alinéa 4 (seuls le texte de la CMP ou le dernier texte de l'Assemblée modifié par des amendements du Sénat sont ouverts), pour trier les amendements encore recevables.

Événements comme déclencheurs : un même événement de `e7` alimente les deux abonnés, la notification du député d'un côté, les retraitements du cockpit de l'autre. Une seule source d'événements, deux lectures. Cloisonnement strict : cette navette Assemblée-Sénat (axe E7) ne se confond jamais avec la boucle de recevabilité intra-Assemblée de la section 1.2.

---

## 5. Objections et ouverture

Un seul objet `Amendement`, des couches et des champs par acteur, jamais des sièges multipliés. Synthèse des acteurs et de leur place :

| Acteur | Dans la boucle | Traitement retenu |
|---|---|---|
| Président de la commission au fond / de l'Assemblée | Non | Statut sur l'amendement (instruit, validé, notifié) ; sa décision est déjà portée par procuration par la décision loguée de l'administrateur. Pas d'écran propre. |
| Division de la séance, services de la séance | Non | Producteurs du dérouleur et exécutants du dépôt, fort recouvrement avec un produit existant (Eliasse, feuille jaune) ; leur sortie (`ordre_appel`, stade, sort, `regroupement`) est déjà absorbée en champs, lue en seule lecture. |
| Cabinet ministériel (Gouvernement) | Non | Acteur extérieur à l'Assemblée, hors périmètre institutionnel ; ses gestes (avis, gage levé, sort) sont des traces lues en seule lecture, jamais un utilisateur. |
| Cosignataires | Non (donnée) | Champ `cosignataires?: string[]` sur l'amendement (F11), pas un rôle. |
| Groupe politique | Plus tard | Couche d'agrégation, seconde à ouvrir après le rapporteur ; dimension déjà portée par le champ `groupe`. |
| **Rapporteur** | **Plus tard (prochain)** | Couche `avis_rapporteur` adjacente à la recevabilité, même objet et même stade. |

Prochain acteur à ouvrir : le rapporteur. Son geste (favorable, défavorable, demande de retrait, sagesse, satisfait) est adjacent mais politique. Le greffer maintenant sur un outil de recevabilité technique neutre diluerait le périmètre et fragiliserait le garde-fou n° 4 (le schéma e7 réserve explicitement l'avis au rapporteur ; ajout Aj9 différé P2). D'où le type `AvisRapporteur` réservé en section 3.5, distinct de `Decision`, ni saisi ni affiché en v1 : simple point d'extensibilité.

Ouverture vers une troisième profession, anticipée sans être construite : le modèle de rôles est déjà, par construction, un ensemble de vues et de permissions sur l'objet unique `Amendement`. Deux professions sont servies (administrateur, député et son collaborateur) ; la troisième réservée est le rapporteur. L'anticiper ne coûte rien de plus que le type `AvisRapporteur` réservé et la discipline « une couche ou un champ de plus sur l'objet unique, jamais un modèle parallèle ». Aucune route, aucun écran, aucune donnée pour cette troisième vue en v1.

Risques de périmètre à tenir : ne pas greffer d'avis de fond politique sur l'outil neutre ; ne pas ouvrir de siège pour un acteur extérieur à l'Assemblée ; ne pas dupliquer la division de la séance ; ne pas fragmenter le modèle en sièges ; ne pas coder tôt des règles instables (reprise d'un amendement retiré, statut de l'amendement de groupe) ; ne pas confondre la boucle de recevabilité et la navette ; ne pas surdimensionner l'article 41 (rarissime, non contrôlé systématiquement au dépôt).

---

## 6. Principe directeur transversal

- **Minimalisme.** Un seul modèle, deux vues, zéro logique dupliquée. Aucune dépendance nouvelle. Pas de machine à états ni de bibliothèque de formulaire : un `Stepper` présentationnel et l'état React suffisent, à l'identique du patron `idx` du cockpit. Pas de moteur relationnel en v1 : une session constante, des projections légères, des champs optionnels. On réutilise ce qui existe déjà partagé (lexique éditable, fonctions de surlignage, `SortBadge`, patron du sélecteur de lecture) avant d'écrire.
- **Charte DSFR et Assemblée nationale.** react-dsfr 1.32.4 ; jetons `fr.colors.decisions` uniquement, aucun hexadécimal ; polices Marianne et Spectral ; bloc-marque « République Française / Assemblée nationale » réservé à l'État ; mode sombre par les jetons.
- **RGAA.** L'information n'est jamais portée par la seule couleur : `Alert` et `Badge` portent toujours un libellé texte ; `aria-live` sur la zone de verdict recalculé ; focus visible ; contrastes conformes.
- **Garde-fou.** L'outil signale un risque estimé et prépare une correction ; il ne prononce jamais la recevabilité. Nommer l'autorité selon le stade. Ne jamais écrire « recevable » de façon péremptoire ni suggérer un recours interne qui n'existe pas. Ne jamais laisser croire qu'une correction postérieure au délai limite rattrape la recevabilité. Ne pas répliquer l'ajout de gage d'office du Sénat : l'outil propose, l'auteur corrige et redépose.
- **Copie française propre.** Français soutenu, sans tiret cadratin (virgule, parenthèses ou deux-points), sans anglicisme, dans toute la copie destinée à l'utilisateur.

---

## 7. Checklist finale ordonnée P0 / P1 / P2

Légende : **[Partagé, prudence]** touche un fichier du cockpit administrateur, revue additive et non-régression requises. **[Additif]** purement nouveau, sans risque de collision.

### Socle de données (préalable à la page)
- [ ] **[Partagé, prudence]** `apps/web/src/data/fixtures.ts` : champs optionnels `texte_id?`, `sorts?` sur `Amendement` ; nouveaux exports `Texte`, `TexteNature`, `EvenementType`, `EvenementProcedure`, `Session`, `session`, `SortStade`, `Notification`, `notifications`, `Grappe`, `AvisRapporteur`.
- [ ] **[Additif]** `apps/web/src/lib/recevabilite.ts` : fonction `verdict`, `ligneArt45`, `LIBELLE_GAGE` (déplacés depuis `Focus.tsx`).
- [ ] **[Partagé, prudence]** `apps/web/src/app/administrateur/Focus.tsx` : importer ces helpers depuis `lib/recevabilite.ts` ; exporter `Segments` (ou déplacer `Segments` et `SortBadge` vers `apps/web/src/app/_shared/`). Vérifier le cockpit en navigateur après ce refactor.

### P0 : page député utilisable de bout en bout
- [ ] **[Partagé, additif]** `apps/web/src/app/page.tsx` : activer la tuile Député (`href="/depute"`, retirer `disabled`).
- [ ] **[Additif]** `apps/web/src/app/depute/page.tsx` et `PosteDepute.tsx` : ossature `Stepper` à quatre étapes, index en état React.
- [ ] **[Additif]** F1 verdict indicatif : `Alert` avec `role="status"` et `aria-live`, `Badge` par signal, calcul par `verdict(...)`.
- [ ] **[Additif]** F2 surlignage article 40 sur brouillon : réutiliser `marquerLexique` / `marquerTexte` et `Segments`.
- [ ] **[Additif]** F3 gage actionnable : `SegmentedControl` present/absent/insuffisant plus `CallOut` de formules éditables ; bascule du verdict ; message « aucun gage possible » sur charge.
- [ ] **[Additif]** F4 compte à rebours : échéance lue dans `session.delai_limite` ; message d'impossibilité après le délai.
- [ ] **[Additif]** F5 garde-fou : `Notice` non fermable nommant l'autorité selon le stade.
- [ ] **[Additif]** F6 garde anti-découragement : `hors_champ_40` explicité.
- [ ] Saisie : deux `Input` `textArea` (dispositif, exposé sommaire), `hintText` de guidage.

### P1
- [ ] **[Additif]** F7 sélecteur de lecture : `SegmentedControl`, patron repris de `VueEnsemble.tsx`.
- [ ] **[Additif]** F8 similaires et précédents : liste plus `SortBadge`, `SegmentedControl` de portée ; source v1 agrégée ou pré-remplie, raccordement futur `POST /amendments/similar`.
- [ ] **[Additif]** F9 trame de défense deux minutes : `CallOut` ou `Accordion`.
- [ ] **[Additif]** F10 demander l'explication écrite (article 89 alinéa 6) : `Button` pré-rempli depuis `notifications`.
- [ ] **[Additif]** F4bis rafraîchissement vivant du compte à rebours (`setInterval` soixante secondes).

### P2
- [ ] **[Partagé, additif]** `fixtures.ts` : champ optionnel `cosignataires?: string[]` (F11) et affichage.
- [ ] **[Additif]** F12 mode suivi de la navette : frise de vie via `sorts?` et `e7.evenements` ; statut de l'article visé et statut de survie de fond (indicatif) via `note_navette`.
- [ ] **[Additif]** Boucle de recevabilité complète (aller-retour notification, rectification, redépôt) : nécessitera le service back-end ; seed statique `notifications` en v1.
- [ ] **[Additif]** Type `AvisRapporteur` réservé, non wiré (extensibilité rapporteur).
- [ ] **[Additif]** `Grappe` matérialisée seulement si une vue de navigation par grappe est demandée.

### Vérification de livraison (obligatoire avant « fait »)
- [ ] Passage en navigateur réel de la page député (parcours des quatre étapes, bascule du gage, recalcul du verdict, sélecteur de lecture) et non-régression du cockpit après le refactor partagé, avec rapport de vérification structuré.