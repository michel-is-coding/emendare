# Handoff - Analyse de risque cote depute (moteur "zones de risque", art. 40/41/38/45)

Brief d onboarding pour un 3e contributeur (porteur-front = front cockpit + page depute ; porteur-api =
apps/api ingestion + embeddings). Ce lot est **transverse** (le moteur sert les deux vues) mais
**isolable** : il vit dans de **nouveaux fichiers**, sa surface de collision avec le travail en
cours est quasi nulle. Objectif : livrer une analyse d amendement qui **signale les zones de
risque** d un brouillon de depute au regard des articles 40 / 41 / 38 / 45, avec le motif de
chaque zone. **Pas** de reco prescriptive ("change ceci pour passer") : uniquement le diagnostic.

Invoque d abord `superpowers:using-superpowers`, puis le skill projet `dsfr`. Cloture :
`superpowers:verification-before-completion` + `playwright-cli`.

---

## 1. Ce que fait DEJA emendare (a lire pour se situer, ne pas refaire)

Emendare assiste le traitement des amendements de l Assemblee nationale. Deux vues, **un seul
modele** (`Amendement`), deja construites :

### Vue administrateur (cockpit, `apps/web/src/app/administrateur/`)
Etudie chaque amendement pour en determiner la recevabilite. Quatre blocs (cf. `workflow.md`) :
- **(i) mots-cles a risque surlignes** : base de lexique art. 40 (`lib/lexique.ts` + `lib/../
  docs/metier/lexique-art40.ts`), surlignage "soupcon" ; **le lexique repere, il ne juge pas**.
- **(ii) texte de loi + diff avant/apres** : pilier encore vide (autre lot, non couvert ici).
- **(iii) amendements similaires** classes par % de ressemblance : **reel**, branche sur
  `apps/api` (embeddings OpenRouter + pgvector ; `GET /amendments/:id/similar`,
  `POST /amendments/similar`).
- **(iv) sort** recevable / irrecevable + motif : **heuristique** via `lib/recevabilite.ts`
  (`verdict()`, signaux art. 40 et art. 45), indicatif.

### Vue depute (`apps/web/src/app/depute/PosteDepute.tsx`)
Assistant en quatre etapes, miroir amont du cockpit : le depute teste **avant depot** si son
amendement risque le rejet. Deja livre : verdict indicatif (F1), surlignage lexique art. 40 sur
le brouillon (F2), gage actionnable (F3), compte a rebours du delai limite (F4), garde-fou de
posture (F5), garde anti-decouragement (F6), selecteur de lecture (F7), similaires sur corpus
statique (F8), trame de defense (F9), demande d explication ecrite art. 89 al. 6 (F10).

### La limite actuelle de l analyse (= la raison de ce lot)
Aujourd hui, cote depute, la **qualification est saisie a la main** : le depute declare lui-meme
l incidence (charge / ressource / aucune) et le lien art. 45 (direct / indirect / absent) via des
controles ; le code se contente de surligner des mots art. 40 sans les rattacher a un article ni
en expliquer le risque. Consequences :
- rien ne **derive** ces qualifications du texte : l outil n analyse pas, il enregistre une
  declaration ;
- **les articles 41 et 38 ne sont pas couverts du tout** ;
- aucun **motif par passage** n est produit.

## 2. Le besoin (ce lot)

Un **moteur d analyse** qui prend le dispositif brut d un amendement et rend une liste de
**zones de risque**. Chaque zone = un passage precis du texte, l article concerne (40 / 41 / 38 /
45), une gravite, et un **motif en clair** ("pourquoi ce passage peut mener au rejet"). Le moteur
alimente la vue depute (surlignage enrichi + panneau des zones) et, a terme, peut deriver les
`signaux_recevabilite` cote administrateur (aujourd hui semes a la main dans les fixtures).

**Perimetre du diagnostic par article :**
- **Art. 40** (charge / ressource) : deja le mieux outille (lexique existant). Ce lot passe du
  simple surlignage a la **qualification par zone** (charge = bloquant ; ressource = attention)
  avec motif, en reutilisant et **etendant** le lexique art. 40.
- **Art. 45** (cavalier / entonnoir) : relatif a l `articleVise` et a la `lecture` ; la logique
  de risque existe deja (`risqueArt45` dans `lib/recevabilite.ts`), a transformer en zone motivee.
- **Art. 41** (domaine de la loi vs pouvoir reglementaire) : **nouveau**, heuristique (reperer
  les dispositions relevant de l art. 37 / etrangeres au domaine de l art. 34). Confiance basse
  assumee.
- **Art. 38** (habilitation a legiferer par ordonnances) : **nouveau**, heuristique (motifs du
  type "habilite le Gouvernement a prendre par ordonnances"). Confiance basse assumee.

**Ce que ce lot NE fait PAS (bornes explicites) :**
- **pas de reco prescriptive** : jamais "remplace X par Y pour etre recevable". On dit ou est le
  risque et pourquoi, pas comment reecrire.
- **pas de verdict peremptoire** : l outil **estime** un risque ; l autorite decide. Aucune zone
  ne "prononce" l irrecevabilite. Copy toujours au conditionnel ("risque estime", "sous reserve").
- **pas de dependance a apps/api** en v1 (voir architecture) ; pas de nouvelle dependance npm.
- pas de codification stricte des articles (travail d expert metier = V2).

## 3. Contrat d interface (le coeur du lot, a figer en premier)

Un module pur, teste, dont la signature est le contrat que le reste de l app consomme. Proposition
(a ajuster mais garder la forme "zones + synthese, indicatif") :

```ts
export type ArticleRisque = "40" | "41" | "38" | "45";
// aligne sur MOTIF_GRAVITE : charge = error, le reste = warning
export type GraviteRisque = "bloquant" | "attention";

export type ZoneRisque = {
  debut: number;        // index caractere dans le dispositif
  fin: number;
  extrait: string;      // le passage exact concerne
  article: ArticleRisque;
  gravite: GraviteRisque;
  motif: string;        // pourquoi, en clair, non prescriptif
  fondement?: string;   // reference (fiche 51, LOLF, art. 45 C, etc.)
  confiance?: "haute" | "basse"; // 41/38 heuristiques = basse
};

export type AnalyseRisque = {
  zones: ZoneRisque[];
  synthese: string;     // 1 phrase indicative, jamais peremptoire
};

// pur, deterministe, souverain : aucun appel reseau.
export function analyserRisque(input: {
  dispositif: string;
  exposeSommaire?: string;
  articleVise?: string;
  lecture: Lecture;     // import depuis data/fixtures
}): AnalyseRisque;
```

## 4. Architecture recommandee (decision a confirmer avec porteur-front)

**v1 = moteur front, heuristique, souverain.** Un nouveau module pur
`apps/web/src/lib/analyse-risque.ts` (fonction `analyserRisque` ci-dessus) + un composant
presentational `ZonesRisque` (nouveau fichier), branche a **un seul point** dans
`PosteDepute.tsx`. Raisons : autonomie totale (aucune collision api/porteur-api, aucun secret a
cabler), determinisme (demontrable au hackathon), et respect de la contrainte de souverainete
(zero appel externe). Le moteur **reutilise** le lexique existant plutot que de le redupliquer.

**v2 = agent LLM "amendement reviewer" (couture, pas dans ce lot).** Meme contrat
`analyserRisque`, implementation derriere un module `apps/api/src/reviewer/` + endpoint, appelant
la gateway compatible OpenAI **deja** cablee pour les embeddings (`EMBEDDING_BASE_URL`). On garde
la couture (le front appelle une fonction, pas un moteur en dur) pour pouvoir substituer sans
toucher aux consommateurs. **Ne pas** construire le v2 dans ce lot ; juste ne pas s en fermer la
porte.

> A confirmer par porteur-front avant de coder : v1 front-heuristique (recommande) vs demarrer direct sur
> le v2 back-LLM. Le reste du brief suppose le v1.

## 5. Code a REUTILISER (ne pas dupliquer)

- `apps/web/src/lib/lexique.ts` : `marquerLexique`, `marquerTexte`, `reperer`, `normaliser`. Le
  moteur art. 40 doit s appuyer dessus (et etendre le lexique, pas le recopier).
- `apps/web/src/lib/recevabilite.ts` : types `Signal40`, `Lien45`, `Lecture` ; predicat
  `risqueArt45`, `graviteArt40`, libelles `LIBELLE_GAGE` / `LIBELLE_HORS_CHAMP`. La zone art. 45
  doit reutiliser `risqueArt45`, pas re-derouler la regle entonnoir.
- `docs/metier/lexique-art40.ts` : version structuree du lexique art. 40 (source a etendre).
- `docs/metier/regles-recevabilite-hackathon-AN.md` : **regles metier autoritaires** (slides
  hackathon AN). Priment sur la recherche web pour ce qu elles couvrent. Lire en entier.
- Type `Amendement` et `signaux_recevabilite` : `apps/web/src/data/fixtures.ts`.
- Rendu des segments surlignes : `Segments` exporte de `Focus.tsx` (reutiliser pour le rendu des
  zones si pertinent).

## 6. Invariants non negociables (charte)

- **DSFR uniquement** via `@codegouvfr/react-dsfr` ; reutiliser un composant DSFR avant tout CSS ;
  **jetons `fr.colors.decisions` uniquement**, zero hexadecimal. Detail incertain -> context7
  (`/codegouvfr/react-dsfr`) + les `.d.ts` installes, jamais de memoire.
- **Convention de gravite** (alignee `MOTIF_GRAVITE`) : charge = `error` ; ressource / cavalier /
  entonnoir / 41 / 38 = `warning`. Jamais "recevable" de facon peremptoire.
- **RGAA** : l information jamais portee par la seule couleur (libelle + forme) ; `aria-live` sur
  toute zone recalculee ; focus visible. Ne se simplifie jamais.
- **Garde-fou de posture** : l outil estime un risque, il ne prononce jamais la recevabilite ;
  nommer l autorite selon le stade ; ne jamais suggerer un recours inexistant ; ne jamais laisser
  croire qu une correction posterieure au delai limite rattrape la recevabilite.
- **Souverainete** : v1 sans appel reseau ; garder l architecture compatible avec un backend
  souverain (ne pas coupler dur a une API tierce).
- **Copy francaise propre** : aucun em dash dans le texte visible et les libelles ; aucun
  anglicisme dans la copy utilisateur. Identifiants de code exemptes.
- **Minimalisme** : aucune dependance nouvelle ; fonction pure + composant presentational + un
  point d insertion. Pas de machine a etats, pas de lib de formulaire.
- **Securite** : Next en bind **127.0.0.1** (`next dev -H 127.0.0.1`) ; jamais `--host 0.0.0.0`.

## 7. Isolation / autonomie / anti-collision

- Le lot vit dans des **fichiers neufs** (`lib/analyse-risque.ts`, composant `ZonesRisque`), plus
  **une** insertion mesuree dans `PosteDepute.tsx` (etape "contenu"). Ne pas refactorer le cockpit
  ni la page depute au-dela de ce point d insertion.
- **NE PAS toucher `apps/api`**, le schema Prisma, les migrations, ni `../docs/conception/**`.
- **NE PAS toucher** le `README.md` du first commit de porteur-api.
- Travailler sur une **branche dediee** (proposition : `emendare-analyse-risque`), idealement un
  worktree dedie pour zero collision. Merge par un humain.

## 8. Git (repo partage, remote Gitea)

- Commits locaux libres ; **push sur `main` seulement apres OK humain** (`git pull --rebase
  origin main` d abord). **Jamais** de force-push ni de reecriture d historique.
- Messages termines par `Co-Authored-By: ...`. Ne pas committer `node_modules` ni artefacts.

## 9. Criteres de fin

- **Verite terrain du moteur** : un self-check runnable (`test_*` ou `demo()` a assertions) qui
  echoue si la logique casse - au minimum : un cas charge (bloquant), un cas ressource (attention),
  un cas cavalier/entonnoir selon la lecture, un cas art. 38 (ordonnances), un cas sans risque.
- **Chaine verte en local** : `pnpm install`, `pnpm prisma:generate`, `pnpm lint`, `pnpm test`,
  `pnpm build` exit 0. Rappel lint React 19 : pas de set-state-in-effect ni d acces ref au rendu.
- **Gate navigateur Playwright OBLIGATOIRE** : `pnpm --filter web dev` en bind 127.0.0.1 ->
  `playwright-cli open --browser chromium http://localhost:3000/depute` -> saisir un dispositif a
  risque -> `snapshot` (assert : zones surlignees + motifs + synthese indicative) -> `screenshot`
  (preuve) -> `close`. PLUS non-regression : le cockpit `/administrateur` et le reste de la page
  depute inchanges. Puis **rapport de verification structure** (gabarit CLAUDE.md racine).

## 10. Skills a invoquer

`superpowers:using-superpowers` (auto) puis **`dsfr`**. Cloture :
`superpowers:verification-before-completion` + `playwright-cli`. PAS `frontend-design`.

## 11. Ce qui reste hors de ce lot (ne pas deriver)

Pilier texte de loi + diff (bloc ii), agent LLM v2, codification stricte des articles avec expert
metier, derivation automatique des signaux cote administrateur. A traiter plus tard.

---

## ISSUE (a remplir en fin de tache)
- Date fin :
- Verdict :
- Fait :
- Reste / bloqueurs :
- Commits / fichiers touches :
