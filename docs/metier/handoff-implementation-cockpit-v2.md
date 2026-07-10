# Handoff - Implementation cockpit administrateur v2 (run Fable autonome)

But : implementer, verifie navigateur, l ensemble des recommandations P0 (et autant de P1 que le
temps permet) du rapport de reference, en preservant le minimalisme, la charte Assemblee nationale
et le garde-fou. Autonomie complete ; ne checkpointer que sur gate build/test echoue ou decision
irreversible non tranchee dans ces documents.

## Skills a invoquer en premier
`superpowers:using-superpowers` (auto), puis le skill projet **`dsfr`** (source de verite react-dsfr
via context7 plus paquet installe, jamais de memoire). Pour la cloture :
`superpowers:verification-before-completion` plus `playwright-cli` (gate navigateur).
**PAS** `frontend-design` (le DSFR est le systeme de design impose ; on l applique, on ne reinvente rien).

## Documents de reference (a lire en entier avant de coder)
1. **Rapport de recommandations** : `docs/metier/rapport-recommandations-cockpit-v1.md` - AUTORITAIRE.
   Contient : mecanismes metier reels (section 1), recommandation par fonctionnalite avec composant
   DSFR, priorite et degres de liberte (section 2), principe directeur (section 3), modele de donnees
   (section 4), **checklist ordonnee P0/P1/P2 (section 5)**, addendum slides plus API (section 6).
2. **Regles metier** : `docs/metier/regles-recevabilite-hackathon-AN.md` (source primaire AN).
3. **Lexique article 40** : `docs/metier/lexique-art40.ts` (pilote le surlignage, editable).
4. **Etat produit** : `apps/web/src/app/administrateur/Cockpit.tsx`, `apps/web/src/data/fixtures.ts`,
   `docs/specs/2026-07-03-cockpit-admin-v1.md`, ADR 0009 et 0010 (`docs/decisions.md`).
5. **Schema de donnees de reference** (a la racine du worktree, un niveau au-dessus de `emendare/`) :
   `../docs/conception/schemas/e7_suivi_procedure.schema.json` et `e2_note_risques.schema.json`. Les
   fixtures suivent leur nomenclature ; en cas de doute, `fixtures.ts` fait foi.

## Perimetre
- **Faire tout le P0** (section 5 du rapport, items 1 a 14) : vue d ensemble `Table`, recherche,
  tri par ordre d appel, filtres (signal art. 40 scinde charge/ressource), compteur, deux gravites
  art. 40, champ `gage`, refonte Preconisation/Similaires, decision loguee, export, accessibilite
  socle, plus adoucir le rail (A1) et elargir le bandeau droit (A2). Plus **AD1** (lexique art. 40
  reel) et **AD3** (brancher Similaires sur l API si faible risque, sinon fixtures enrichies).
- **Faire le P1 dans la mesure du temps** (items 15 a 26 plus AD2, AD4).
- **Ne PAS faire le P2** (items 27 a 30 : anticipation des tombes, avis du rapporteur, mode suivi
  navette, rendu qualitatif optionnel de la confiance sauf si trivial). Hors perimetre : page depute
  (phase 2), moissonnage reel, regles fines automatisees.

## Invariants non negociables (charte)
- **DSFR uniquement** via `@codegouvfr/react-dsfr` 1.32.4 ; reutiliser un composant DSFR avant tout
  CSS sur mesure ; **decisions de couleur uniquement** (`fr.colors.decisions`), zero hexadecimal ;
  Marianne et Spectral ; themes clair et sombre par jetons. Tous les composants cites existent
  (verifie : Table, Tag, TagsGroup, SegmentedControl, SelectNext, Pagination, ButtonsGroup, Checkbox,
  Input, SearchBar, Alert, Badge, Tooltip, Header, Tile).
- **RGAA** : information jamais portee par la seule couleur (libelle plus forme) ; `aria-live` sur les
  compteurs ; focus visible et restaure ; `caption` de tableau ; contrastes conformes. Ne se
  simplifie jamais.
- **Garde-fou n4** : signaux strictement indicatifs, decision humaine loguee, disclaimer nommant
  l autorite competente selon le stade (president de la commission saisie au fond en commission,
  President de l Assemblee en seance). L outil pre-trie, ordonne et signale ; il ne juge pas.
- **Semantique couleur** : `error` = charge art. 40 (bloquant) et rejete/irrecevable ; `warning` =
  ressource art. 40 (attention, curable par gage) ; `success` = adopte et recevable ; neutre =
  retire/tombe/non soutenu ; `info` = passages rectifies et badge indicatif IA.
- **Copy francaise propre** : aucun em dash dans le texte visible et les libelles ; aucun anglicisme
  dans la copy destinee a l utilisateur (pas de « red-flag », dire « signal » ou « mot signale »).
  Les identifiants de code sont exemptes. Profiter de ce run pour nettoyer la copy existante.
- **Securite** : serveurs (Next, API) bind **127.0.0.1** ; jamais `--host 0.0.0.0`.
- **Minimalisme** : aucune bibliotheque tierce de tableau ou d etat ; `Table` DSFR plus etat React
  suffit. Ne pas empiler les explications ; une justification courte par signal.

## Forbidden Actions
- **NE PAS `git push`** sans OK humain (repo partage Gitea). Laisser les commits locaux sur
  `emendare-wip`.
- **NE PAS committer `node_modules`** ni artefacts de build (deja gitignores : verifier `git status`).
- **NE PAS casser `apps/api`** (code de porteur-api) : ne pas modifier `apps/api` sauf pour consommer un
  endpoint existant cote web ; ne toucher ni au schema Prisma ni aux migrations.
- **NE PAS toucher** `../docs/conception/**` (spec et schemas de porteur-api) ni le premier commit README.
- **NE PAS builder le P2** ni la page depute.

## Degres de liberte (explicitement laisses a l implementeur)
Detailles par item dans la section 2 du rapport. Les principaux : disposition des filtres (barre,
panneau, accordeon) ; jeu et ordre exacts des colonnes de la vue d ensemble ; format d export (CSV,
impression ou les deux) ; rendu de la confiance et de la ressemblance en bande qualitative plutot
qu en pourcentage brut ; touches exactes des raccourcis clavier ; brancher ou non Similaires sur
l API reelle (recommande si faible risque). Toute simplification doit etre marquee d un commentaire
`ponytail:` nommant le plafond et la voie de reprise.

## Git (branche `emendare-wip`)
- Verifier `git branch --show-current` = `emendare-wip` avant le premier commit.
- Committer aux points logiques (modele de donnees, vue d ensemble, filtres et tri, refonte gravite,
  export, accessibilite, nettoyage copy), messages clairs termines par
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **NE PAS pousser.** Laisser la branche locale pour porteur-front.

## Criteres de fin
- **Gate navigateur Playwright OBLIGATOIRE** (feature web UI, cf. CLAUDE.md) :
  `playwright-cli open --browser chromium http://localhost:3000` puis parcours reel complet
  (accueil, vue d ensemble, recherche, filtres, tri par ordre d appel, ouverture d un amendement,
  deux gravites art. 40, decision motivee, export) ; `snapshot` pour asserter l etat ; `screenshot`
  pour preuve ; `close`. Puis **rapport de verification structure** (gabarit CLAUDE.md).
- **Chaine CI verte en local** : `pnpm install --frozen-lockfile`, `pnpm prisma:generate`,
  `pnpm lint`, `pnpm test`, `pnpm build` - tous exit 0. Le lint React 19 interdit set-state-in-effect
  et l acces ref au rendu : preferer le remount par `key` pour reinitialiser un etat.
- Aucune regression sur l existant (accueil, header, decision loguee).
- WIP committe sur `emendare-wip`, **pas pousse**.

## Consigne de cloture
En fin de tache : remplir la section ISSUE de ce fichier, puis lancer
`echo '{}' | ~/.claude/notify.sh done`.

## ISSUE (a remplir en fin de tache)
- Date fin : 2026-07-04 00:45 (Europe/Paris)
- Verdict : fait
- Fait : P0 integral (items 1 a 14) + P1 integral (15 a 25 ; pagination 26 non activee,
  inutile sur 9 fixtures, conforme au rapport) + AD1 + AD2 + AD4 + option E4 (bande
  qualitative). Revue croisee multi-agents : 20 findings confirmes, tous corriges. Gate
  navigateur Playwright PASS (rapport de verification dans la session) ; chaine CI verte
  (install, prisma:generate, lint, test, build) ; copy sans em dash ni anglicisme.
- Reste / bloqueurs : AD3 : l API de similarite n existe pas dans ce worktree (apps/api
  n expose que / et /health ; elle vit sur origin/feat/emendare-ingestion-embeddings).
  Similaires livre sur fixtures enrichies au format de l API, branchement a faire au
  merge de cette branche (faible risque). Lexique : contenu fin editable par les
  administrateurs (issue #2).
- Commits / fichiers touches : 26be8e3, b4bbf53, a46b85d, 2e70e00 sur emendare-wip
  (pousse sur ordre explicite). apps/web/src/{data,lib,app/administrateur} + page/layout
  + scripts test ; apps/api et docs/conception intacts.
