# Handoff - Implementation page depute + socle de donnees partage (run Fable ultracode autonome)

Session enfant : implemente la PAGE DEPUTE d emendare (miroir auteur du cockpit administrateur) et le
SOCLE DE DONNEES PARTAGE administrateur-depute, selon le rapport de reference. Full autonomie.
Invoque `superpowers:using-superpowers` puis le skill projet `dsfr`. Cloture :
`superpowers:verification-before-completion` + `playwright-cli`.

## Contexte d isolation (IMPORTANT)
Tu travailles dans un **worktree dedie** `emendare-depute` (branche `emendare-depute`), base sur le
cockpit administrateur v2 **deja termine** (branche `emendare-wip`, tip e07384c). Une autre session a
implemente le cockpit administrateur ; son travail est fini et committe, tu batis dessus. Tu es seul
sur CE worktree : pas de collision. Le merge de `emendare-depute` vers `emendare-wip` puis `main` se
fera plus tard par l humain.

## Objectif
Livrer, verifie en navigateur, le **socle de donnees partage** (section 3 du rapport) puis la **page
depute P0** (et autant de P1 que le temps permet), en preservant : un seul modele deux vues,
minimalisme, charte Assemblee nationale, RGAA, garde-fou (l outil signale un risque estime avant
depot, il ne prononce jamais la recevabilite ; l autorite decide).

## Fichiers / chemins / docs cles (LIRE EN ENTIER AVANT DE CODER)
- **Dossier de travail** : `<worktree local>/emendare`.
- **Rapport AUTORITAIRE** : `docs/metier/rapport-depute-v1.md`. Contient : mecanismes metier reels
  (workflow depute et collaborateur, boucle de recevabilite distincte de la navette, mode suivi),
  recommandations par fonctionnalite F1 a F12 avec composant DSFR et priorite, **modele de donnees
  partage (section 3, avec types TypeScript concrets et migration sans casser le cockpit, 3.5 et
  3.6)**, mode suivi navette (section 4), objections et ouverture rapporteur (section 5), principe
  directeur (section 6), **checklist ordonnee P0/P1/P2 (section 7)**.
- **Rapport du cockpit administrateur** (pour comprendre les briques partagees) :
  `docs/metier/rapport-recommandations-cockpit-v1.md`.
- **Regles metier + lexique** : `docs/metier/regles-recevabilite-hackathon-AN.md`,
  `docs/metier/lexique-art40.ts`.
- **Code administrateur a REUTILISER (deja partage, ne pas dupliquer)** :
  `apps/web/src/lib/lexique.ts` (`marquerLexique`, `marquerTexte`, `reperer`, `normaliser`),
  `apps/web/src/data/fixtures.ts` (type `Amendement`, `MOTIF_TYPES`, `MOTIF_GRAVITE`,
  `MOTIF_FONDEMENT`, `SortReel`, `Gage`, `Lecture`, `Stade`, `Decision`),
  `apps/web/src/app/administrateur/Focus.tsx` (`Segments` a exporter, `SortBadge` deja exporte,
  `ligneArt45`, `LIBELLE_GAGE`, composants `Signaux` et `Similaires`),
  `apps/web/src/app/administrateur/VueEnsemble.tsx` (patron du selecteur de lecture).
- **Schemas de reference** (racine du worktree, un niveau AU-DESSUS de `emendare/`) :
  `../docs/conception/schemas/e7_suivi_procedure.schema.json`, `e2_note_risques.schema.json`,
  et `e0` pour le calendrier/echeances. En cas de doute, `fixtures.ts` fait foi.

## Perimetre
1. **Socle de donnees partage** (section 3, prealable) : suivre 3.5 et 3.6 a la lettre. Tout est
   ADDITIF ou deplacement en place, le cockpit doit compiler et se comporter a l identique.
   - `fixtures.ts` : champs optionnels `texte_id?`, `sorts?` sur `Amendement` ; nouveaux exports
     `Texte`, `TexteNature`, `EvenementType`, `EvenementProcedure`, `Session`, `session`, `SortStade`,
     `Notification`, `notifications`, `Grappe`, `AvisRapporteur` (ce dernier reserve, non wire).
   - `lib/recevabilite.ts` (NOUVEAU) : `verdict(...)`, `ligneArt45`, `LIBELLE_GAGE` deplaces depuis
     `Focus.tsx` ; `Focus.tsx` les importe (refactor en place, comportement inchange).
   - Exporter `Segments` de `Focus.tsx` (ou le deplacer avec `SortBadge` dans `app/_shared/`).
2. **Page depute P0** (section 7) : route `app/depute/`, assistant `Stepper` a 4 etapes ; F1 verdict
   indicatif, F2 surlignage art. 40 sur brouillon, F3 gage actionnable + bascule du verdict, F4 compte
   a rebours (delai limite), F5 garde-fou `Notice` non fermable, F6 garde anti-decouragement ; saisie
   dispositif + expose. Activer la tuile Depute dans `page.tsx` (href /depute).
3. **P1 selon le temps** : F7 selecteur de lecture, F8 similaires/precedents (source statique, voir
   note API ci-dessous), F9 trame de defense 2 minutes, F10 demander l explication ecrite (art. 89
   al. 6) depuis `notifications`, rafraichissement vivant du compte a rebours.
4. **NE PAS faire le P2** : cosignataires, mode suivi navette complet, boucle de recevabilite
   back-end, `AvisRapporteur` wire, `Grappe` materialisee. Anticiper l ouverture rapporteur seulement
   par le type reserve (section 5), aucune route ni ecran.

## Note API similarite
L API de similarite (endpoints `apps/api`) N EST PAS operationnelle dans ce worktree (constat du run
cockpit). Donc F8 reste sur source STATIQUE (agreger les listes `similaires` des fixtures, ou
pre-remplir depuis un exemple). Preparer le raccordement futur `POST /amendments/similar` (le
brouillon n a pas d identifiant) sans en dependre. Ne pas tenter de demarrer l API.

## Invariants non negociables (charte)
- **DSFR uniquement** via `@codegouvfr/react-dsfr` 1.32.4 ; reutiliser un composant DSFR avant tout
  CSS ; **jetons `fr.colors.decisions` uniquement**, zero hexadecimal ; Marianne/Spectral ;
  clair/sombre par jetons. Composants cites verifies presents (Stepper, CallOut, Notice, Alert, Badge,
  SegmentedControl, Input, Button, Tooltip, Accordion, plus ceux deja utilises). Detail incertain ->
  context7 (`/codegouvfr/react-dsfr`) + les `.d.ts` installes, JAMAIS de memoire.
- **Convention de gravite** (alignee `MOTIF_GRAVITE`) : charge = `error` ; ressource / cavalier /
  entonnoir / organique = `warning` ; aucun signal + lien conforme a la lecture = `success`. Jamais
  « recevable » de facon peremptoire : toujours « risque estime » et « sous reserve de l appreciation
  de l autorite ».
- **RGAA** : information jamais portee par la seule couleur (libelle + forme) ; `aria-live` sur la
  zone de verdict recalcule ; focus visible ; contrastes conformes. Ne se simplifie jamais.
- **Garde-fou** : nommer l autorite selon le stade (president de la commission au fond en commission,
  President de l Assemblee en seance) ; ne jamais suggerer un recours interne inexistant ; ne jamais
  laisser croire qu une correction posterieure au delai limite rattrape la recevabilite.
- **Copy francaise propre** : aucun em dash dans le texte visible et les libelles ; aucun anglicisme
  dans la copy utilisateur. Identifiants de code exemptes.
- **Minimalisme** : un seul modele deux vues, zero logique dupliquee ; aucune dependance nouvelle ;
  pas de machine a etats ni de bibliotheque de formulaire (un `Stepper` presentationnel + etat React).
- **Securite** : Next en bind **127.0.0.1** (`next dev -H 127.0.0.1`) ; jamais `--host 0.0.0.0`.

## Forbidden Actions
- **NE PAS `git push`** : commits locaux sur `emendare-depute`, porteur-front merge et pousse.
- **NE PAS committer `node_modules`** ni artefacts de build (verifier `git status`).
- **NE PAS casser le cockpit administrateur** : apres le refactor partage (`lib/recevabilite.ts`,
  export `Segments`), VERIFIER en navigateur que le cockpit (`/administrateur`) fonctionne a
  l identique (non-regression). Ne pas modifier la logique du cockpit, seulement extraire/exporter.
- **NE PAS modifier `apps/api`** ni le schema Prisma ni les migrations.
- **NE PAS toucher** `../docs/conception/**` ni le premier commit README de porteur-api.
- **NE PAS builder le P2** ni demarrer l API.
- **NE PAS `--host 0.0.0.0`.**

## Required from User
Rien pour finir socle + P0/P1.

## DECISIONS deja prises + POURQUOI (ne pas re-debattre)
- **Un seul modele `Amendement`, deux vues** (administrateur, depute) : jamais deux modeles. Le
  brouillon depute et la decision administrateur vivent en etat React ephemere ; seul l objet-pont
  `Notification` est seede en statique.
- **Boucle de recevabilite (administrateur -> auteur) != navette (AN-Senat)** : ne jamais confondre
  dans la copy ni le code.
- **Regroupement par session parlementaire (constante `session` en v1) + par ressemblance** (degres
  deja portes par `Similaire.degre` ; ne materialiser `Grappe` que si une vue par grappe l exige).
- **Verdict jamais peremptoire** : toujours indicatif, garde-fou nomme l autorite.
- **Base = cockpit v2 termine** (emendare-wip e07384c) : reutiliser ses briques partagees, ne pas
  redupliquer.

## Etat courant
- **Fait** (herite d emendare-wip) : cockpit administrateur v2 complet (vue d ensemble, tri ordre
  d appel, deux gravites art. 40, champ gage, lexique externalise, exports), briques partagees
  (`lib/lexique.ts`, `fixtures.ts` v2, `Focus.tsx`, `VueEnsemble.tsx`).
- **Pas commence** : le socle de donnees partage (section 3) et toute la page depute.

## Git autonome
- **Branche cible = `emendare-depute`** (deja checkout dans ce worktree). **Verifier
  `git branch --show-current` = `emendare-depute` AVANT le 1er commit.**
- `node_modules` absent dans ce worktree neuf : lancer `pnpm install` d abord.
- Committer aux points logiques (socle de donnees, refactor partage, ossature page depute, F1-F6,
  P1), messages clairs termines par `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **NE PUSH PAS.** Laisser la branche locale.

## Criteres de fin
- **Gate navigateur Playwright OBLIGATOIRE** : `pnpm --filter web dev` en bind 127.0.0.1 ->
  `playwright-cli open --browser chromium http://localhost:3000/depute` -> parcours des 4 etapes
  (saisie, bascule du gage, recalcul du verdict, selecteur de lecture) -> `snapshot` (assert) ->
  `screenshot` (preuve) -> `close`. PLUS non-regression du cockpit `/administrateur` apres le refactor
  partage. Puis **rapport de verification structure** (gabarit CLAUDE.md).
- **Chaine CI verte en local** : `pnpm install`, `pnpm prisma:generate`, `pnpm lint`, `pnpm test`,
  `pnpm build` tous exit 0. Rappel lint React 19 : interdit set-state-in-effect ET acces ref au
  rendu -> reinitialiser un etat par remount `key`.
- WIP committe sur `emendare-depute`, **pas pousse**.

## Skill(s) a invoquer en premier
`superpowers:using-superpowers` (auto) puis **`dsfr`**. Cloture :
`superpowers:verification-before-completion` + `playwright-cli`. PAS `frontend-design`.

## Consigne d autonomie
Enchaine le plan ; ne checkpoint que sur gate build/test echoue, decision irreversible non tranchee
dans ces documents, ou contexte sature.

## Consigne de cloture
En fin de tache : remplis la section ISSUE de CE fichier PUIS lance
`echo '{}' | ~/.claude/notify.sh done`.

## ISSUE (a remplir par la session enfant en fin de tache)
- Date fin: 2026-07-04 01:25 (Europe/Paris)
- Verdict: fait
- Fait: socle de donnees partage complet (section 3.5/3.6 : Session/session, Texte,
  EvenementProcedure, SortStade, Notification/notifications, Grappe, AvisRapporteur reserve,
  champs optionnels texte_id/sorts ; lib/recevabilite.ts avec verdict(), risqueArt45,
  ligneArt45, LIBELLE_GAGE, LIBELLE_HORS_CHAMP deplaces de Focus.tsx ; Segments et
  Similaires exportes). Page depute P0 ENTIERE (Stepper 4 etapes, F1 a F6, saisie
  dispositif + expose, tuile accueil activee) PLUS tout le P1 (F7 selecteur de lecture,
  F8 similaires sur corpus statique avec note POST /amendments/similar, F9 trame de
  defense, F10 demande art. 89 al. 6 pre-remplie depuis notifications, F4bis
  rafraichissement minute via useSyncExternalStore). Aucun P2 construit. Revue croisee
  ultracode (17 agents, 5 lentilles + verification adversariale) : 4 constats confirmes,
  tous corriges (predicat art. 45 partage, echec de copie annonce, garde de focus
  compatible Strict Mode, elision du compte a rebours) ; 8 refutes. Gates : lint, 18 tests,
  build (route /depute statique) tous verts ; parcours Playwright Chromium complet
  (4 etapes, surlignage lexique, bascule gage absent/present, cas charge bloquant,
  entonnoir en lecture ulterieure, F10) + non-regression cockpit verifiee en navigateur
  (CD87 signaux/decision, CD101 hors champ, copy identique au caractere pres).
- Reste / bloqueurs: rien de bloquant. Reste hors perimetre (P2, assume) : cosignataires,
  mode suivi navette, boucle de recevabilite back-end, AvisRapporteur wire, Grappe.
  Note memoire : README.md porte encore des em dashes (nettoyage prevu au prochain passage,
  hors perimetre de ce brief).
- Commits / fichiers touches: d540b07 (socle : fixtures.ts, lib/recevabilite.ts + test,
  Focus.tsx refactor, package.json test), f902e80 (page depute : app/depute/page.tsx,
  PosteDepute.tsx, app/page.tsx tuile), 38ee990 (4 correctifs de revue). Branche
  emendare-depute, locale, NON poussee (merge par porteur-front).
