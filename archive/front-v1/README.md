# Archive : front v1 (2026-07-04)

Pages du premier front `apps/web`, archivées lors de la refonte sur le design system
importé dans claude.ai/design (« DSFR Design System ») et du passage aux 3 niveaux
Dossiers / Classification / Cockpit branchés sur l'API.

Contenu :
- `administrateur/` : cockpit v2 (Cockpit, VueEnsemble, Focus) et page Dossiers (portage maquette, hors canon DSFR).
- `depute/` : assistant député 4 étapes (hors périmètre de la refonte, à reprendre plus tard).
- `page.tsx` : accueil 2 tuiles.

Ces fichiers ne sont plus compilés (hors workspace pnpm et hors `apps/web`). La logique pure
(`apps/web/src/lib/`, `src/data/lexique-art40.ts`, `src/data/fixtures.ts` comme contrat de
types) n'a pas été archivée : elle est réutilisée par le nouveau front. Les axes fonctionnels
du cockpit v2 restent documentés dans `docs/metier/handoff-implementation-cockpit-v2.md`.
