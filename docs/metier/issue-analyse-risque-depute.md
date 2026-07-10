# [depute] Moteur d analyse : zones de risque au regard des art. 40/41/38/45

**Type** : feature · **Vue** : depute · **Assignee** : 3e contributeur · **Labels** : feature, depute, recevabilite

## Contexte
Cote depute, la qualification d un brouillon (charge/ressource, lien art. 45) est aujourd hui
**saisie a la main** ; le lexique surligne des mots art. 40 sans les rattacher a un article ni en
expliquer le risque. Les articles **41 et 38 ne sont pas couverts**.

## Objectif
Un **moteur d analyse** qui lit le dispositif brut et rend des **zones de risque** : chaque
passage etiquete `{ article 40/41/38/45, gravite, motif en clair }`. Diagnostic uniquement :
**pas** de reco prescriptive, **pas** de verdict peremptoire (l outil estime, l autorite decide).

## Livrables
- `apps/web/src/lib/analyse-risque.ts` : fonction pure `analyserRisque(input) -> AnalyseRisque`
  (contrat dans le brief), deterministe, souveraine (zero appel reseau).
- Composant `ZonesRisque` (nouveau) + un point d insertion dans `PosteDepute.tsx`.
- Reutilise `lib/lexique.ts` (art. 40, a etendre) et `risqueArt45` de `lib/recevabilite.ts`.
- Self-check a assertions (charge, ressource, cavalier/entonnoir, art. 38, sans risque).

## Criteres d acceptation
- [ ] Zones art. 40 (charge=bloquant, ressource=attention) avec motif, issues du texte.
- [ ] Zone art. 45 (cavalier/entonnoir) relative a `articleVise` + `lecture`, via `risqueArt45`.
- [ ] Zones art. 41 et 38 (heuristique, confiance basse assumee).
- [ ] Copy au conditionnel, RGAA (forme + couleur), DSFR jetons only, aucun em dash / anglicisme.
- [ ] `pnpm lint/test/build` verts + gate Playwright Chromium sur `/depute` + rapport de verif.
- [ ] Aucune modif `apps/api`, schema Prisma, `../docs/conception/**`, README de porteur-api.

## Reference
Brief complet (contexte admin + depute, contrat, architecture v1 heuristique / v2 LLM, invariants,
isolation, git, criteres de fin) : `emendare/docs/metier/handoff-analyse-risque-depute.md`.

## Hors perimetre
Pilier texte de loi + diff (bloc ii), agent LLM v2, codification stricte avec expert metier,
derivation des signaux cote administrateur.
