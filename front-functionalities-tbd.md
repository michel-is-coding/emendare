# Fonctionnalités back à développer pour le front

Refonte front du 2026-07-04 (3 niveaux : Dossiers → Classification → Cockpit, design
system « DSFR Design System » de claude.ai/design). Le front est branché sur l'API
existante (`apps/api`) ; chaque manque constaté pendant le câblage est décrit ici avec
le besoin front, la fonctionnalité back à créer et une priorité. L'API actuelle est en
lecture seule (hors `POST review`, `POST similar` et ingestion) : rien n'écrit jamais
le sort d'un amendement.

## 1. Persistance de la décision humaine : P0

- **Besoin front** : le panneau « Décision » du cockpit (sort recevable/irrecevable/
  retiré/tombé/non soutenu, motif obligatoire si irrecevable, motivation notifiée à
  l'auteur) vit en état React et se perd en quittant la page. C'est le cœur du poste
  administrateur : la décision doit être loguée, réversible et auditable.
- **À créer** : `PATCH /amendments/:id/decision` avec corps
  `{ sort, motifCode?, motivation?, decideur? }`. Modèle Prisma `HumanDecision`
  (`amendmentId`, `sort`, `motifCode`, `motivation`, `createdAt`, `supersededAt?`)
  historisé plutôt qu'un champ écrasé : la réversibilité = une nouvelle ligne, jamais
  une suppression. Exposer la dernière décision dans `GET /amendments/:id` et dans la
  liste (voir n°4).
- **Front prêt** : `PanneauDecision.tsx` affiche déjà la bannière « décision non
  persistée » ; il suffira d'appeler l'endpoint.

## 2. Compteurs de liasse sur tout le texte : FAIT (2026-07-04)

- **Besoin front** : le bandeau de la page Classification doit donner total / adoptés /
  irrecevables / à instruire sur TOUT le texte, pas sur la page de 50 chargée.
- **Livré** : `GET /texts/:id/stats` → `{ total, parSort: {sort, count}[], parStatus:
  {status, count}[] }` ; bandeau de badges sur la page Classification, options du
  filtre sort alimentées par ces stats (valeurs réelles + compteurs).

## 3. Filtres serveur et tri paramétrable sur la liasse : FAIT (2026-07-04)

- **Besoin front** : les filtres de la liasse (recherche numéro/article, sort) ne
  portent que sur la page courante : une bannière le précise. Il faut filtrer côté
  serveur sur toute la liasse.
- **Livré** : query params sur `GET /texts/:id/amendments` : `sort` (`aucun` = sans
  sort), `status`, `article`, `q` (numéro OU article, insensible à la casse),
  `orderBy` (`numero` | `dateDepot`). Front : form GET → searchParams, pagination qui
  préserve les filtres, lien « Réinitialiser ». L'ordre d'appel reste le n°6 ; le tri
  `numero` reste lexicographique en attendant.

## 4. Verdict agent joint à la liste : FAIT (2026-07-04)

- **Besoin front** : afficher dans la liasse une colonne « verdict agent » (et filtrer
  dessus) sans faire un appel `GET /amendments/:id/review/latest` par ligne (N+1).
- **Livré** : `GET /texts/:id/amendments` joint la dernière `AmendmentAnalysis`
  (relation `take: 1` triée `createdAt desc`, une seule requête) et renvoie
  `{ verdict: { sort, motifCode, confidence, createdAt } | null }` par item ; param
  `verdict=RECEVABLE|IRRECEVABLE` filtré sur la DERNIÈRE analyse (DISTINCT ON en SQL).
  Front : colonne « Verdict agent (indicatif) » + filtre + colonnes CSV.

## 5. Libellés auteur et groupe politique : P1

- **Besoin front** : le cockpit affiche des références brutes (`PA…`, `PO…`) avec une
  infobulle d'excuse ; la liasse n'a pas de colonne auteur. Les exports CSV du
  dérouleur (traitement.ts) attendent auteur et groupe lisibles.
- **À créer** : ingestor `acteurs-an` (référentiel open data AN acteurs/organes) →
  tables `Acteur` (`ref`, `nom`, `prenom`) et `Organe` (`ref`, `libelle`, `couleur?`),
  résolution dans `GET /amendments/:id` et la liste (n°4). Alternative rapide :
  `GET /actors?refs=PA123,PO456` par lot.

## 6. Ordre d'appel du dérouleur : P2

- **Besoin front** : axe cockpit v2 « tri par ordre d'appel » (feuille jaune) + la
  navigation précédent/suivant du cockpit doit suivre cet ordre, pas `numero asc`.
- **À créer** : modèle de l'ordre d'appel (place dans la discussion : article visé,
  amendements à l'article, sous-amendements) calculé à l'ingestion ou par un service
  d'ordonnancement, champ `ordreAppel` sur `Amendment` + `orderBy=ordre_appel` (n°3).

## 7. Analyse en lot d'une liasse : P2

- **Besoin front** : bouton « Analyser toute la liasse » sur la page Classification
  (aujourd'hui l'analyse est unitaire, un POST par amendement depuis le cockpit).
- **À créer** : `POST /texts/:id/review-batch` → job asynchrone (une `IngestionRun`-like
  ou une table `ReviewBatch` avec progression), statut consultable
  `GET /texts/:id/review-batch/:batchId`. Attention au coût LLM : borner par
  `maxItems`, réutiliser le circuit court déterministe d'abord.

## 8. Métadonnées de dossier : P2

- **Besoin front** : la page Dossiers v1 (archivée) affichait commission saisie,
  échéance (J-n), équipe affectée, avancement. Rien de tout cela n'existe en base.
- **À créer** : champs ou modèle `Dossier` (commission, dates clés de la navette,
  échéance de dépôt) alimentés par le dump AN (agenda/scrutins) ; l'affectation
  d'équipe est du ressort d'un futur module profils (phase 2 du cahier des charges).

## 9. Diff avant/après du texte consolidé : P3

- **Besoin front** : bloc (ii) du cahier des charges : afficher l'article de code visé
  avec le mark-change avant/après apporté par l'amendement. Le cockpit affiche déjà
  les renvois (`TextReference`) et signale « texte consolidé non résolu » quand le
  dump Légifrance n'est pas ingéré.
- **À créer** : ingestion LEGI (`textes-legifrance`, existe déjà : brancher
  `LEGIFRANCE_LEGI_URL`) puis endpoint `GET /amendments/:id/diff` qui applique
  `pointeurFragment` + `typeModification` au `content` du texte consolidé et renvoie
  des segments avant/après. Le rendu front (`Segment` de type `modif`) existe déjà
  dans le contrat de vue.

## 10. Recherche plein texte : P3

- **Besoin front** : chercher un amendement par mots du dispositif ou de l'exposé
  (la similarité sémantique existe, la recherche exacte non).
- **À créer** : index FTS Postgres (`tsvector` français sur `content` +
  `exposeSommaire`) + param `q` sur la liasse (n°3) ou `GET /amendments/search`.
