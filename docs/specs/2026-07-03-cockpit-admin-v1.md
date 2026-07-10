# Spec — Cockpit administrateur v1 (statique)

Validée par maquette (artifact, 2026-07-03). Réf : ADR 0009/0010, workflow porteur-front, schéma
`e7_suivi_procedure.schema.json` (garde-fou n°4).

## Périmètre
`apps/web` (Next 16 App Router + `@codegouvfr/react-dsfr`). **Fixtures statiques**, zéro back-end.
Épuré : peu de fichiers, composants DSFR avant tout CSS custom, couleurs = tokens uniquement.

## Pages
- **`/` accueil** — bloc-marque RF/AN + 2 chemins : **Administrateur** (actif) · **Député** (grisé, phase 2).
- **`/administrateur` cockpit** :
  - **Rail gauche rétractable** — logo, mode « Traitement d'amendement » (seul mode v1).
  - **Header navigateur** — ‹ › + n° + objet + position n/N ; clavier **← →** change d'amendement.
  - **Centre** — amendement (n°, auteur, groupe, article visé, exposé, dispositif) ;
    **red-flags art. 40** surlignés (token warning, tooltip au survol) ;
    passages **rectifiés** surlignés (token info, clic → détail avant/après).
  - **Droite** — 3 modules : **Légifrance** (textes liés, mark-change avant/après, bouton agrandir
    = hauteur seulement) · **Similaires** (% + badge sort réel : adopté/rejeté/retiré/tombé/
    irrecevable/non-soutenu) · **Préconisation** badgée « indicatif · IA » (pré-sort + confiance %
    + pré-motif + disclaimer garde-fou n°4).
  - **Bas** — décision humaine : CTA **✓ Recevable** / **✗ Irrecevable** + « autre sort » ;
    Irrecevable → motif **obligatoire** (chips IRR-40 charge / IRR-40 ressource / IRR-45 cavalier /
    IRR LFSS / IRR LOLF + texte pré-rempli éditable). Enregistrement = console/state v1.

## Données
`fixtures.ts` — 4 amendements alignés champs e7 (`numero, auteur, groupe, article_vise,
objet_resume, signaux_recevabilite{article_40, article_45, justification}`) + extensions UI
(red-flags, rectification, textes Légifrance, similaires, préconisation). La navigation ←/→
change tout le contenu.

## Hors scope v1 (nommé)
Scrape/upload réel (harvester #3), similarité pgvector, règles fines 40/41/38/45 + lexique
(issue #2), navette député (phase 2), persistance des décisions (API #3), vue député.
