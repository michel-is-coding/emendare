---
name: dsfr
description: Use for ANY emendare UI work — building or changing a component, page, colour, badge, header, form, or layout. Enforces the Système de Design de l'État (DSFR) via @codegouvfr/react-dsfr. The rule is POINT to the living source (context7 + the installed package), never recite the DSFR from memory.
---

# DSFR pour emendare

emendare habille l'**Assemblée nationale** : toute l'UI est en **DSFR** (Système de Design de
l'État) via **`@codegouvfr/react-dsfr`** (SPA React + Vite). Décision autoritaire :
[`docs/decisions.md` ADR 0009](../../../docs/decisions.md).

## Source de vérité — NE PAS inventer

Ce skill **ne recopie pas** le DSFR (il bouge ; le recopier = hallucinations de classes/tokens).
Pour tout composant, prop, classe ou token **incertain** :

1. **context7** — lib `/codegouvfr/react-dsfr` (`resolve-library-id` → `query-docs`). Doc à jour.
2. **Le package installé** = seconde source, souvent plus rapide : les `.d.ts` sont les vrais types.
   - Props d'un composant : `node_modules/@codegouvfr/react-dsfr/<Composant>/<Composant>.d.ts`
     (ou `<Composant>.d.ts` à la racine). Ex. `Header/Header.d.ts`, `Badge.d.ts`.
   - Tokens couleur : `fr.colors.decisions.*` typés dans
     `node_modules/@codegouvfr/react-dsfr/fr/generatedFromCss/colorDecisions.d.ts`.

Classe/composant pas trouvé dans l'une de ces deux sources → **le vérifier**, jamais le deviner.

## Invariants (non négociables)

- **Couleurs = tokens DSFR uniquement.** Zéro hex en dur. `#000091` (Bleu France) et `#E1000F`
  (Rouge Marianne) sont posés par le DS, pas par toi. Utilise `fr.colors.decisions.*`
  (import `@codegouvfr/react-dsfr/fr`) ou les CSS vars `var(--...)`, jamais une valeur littérale.
- **Polices : Marianne** (texte) + **Spectral** (titres) — servies depuis `/dsfr`, ne pas substituer.
- **Thème clair/sombre** géré par les tokens DSFR (`data-fr-scheme`) — n'écris pas de couleur
  hors token, sinon le mode sombre casse.
- **Accessibilité RGAA** : les composants react-dsfr sont accessibles par défaut. **Ne pas casser**
  (labels, contrastes, structure de titres). Ne réimplémente pas un composant DSFR à la main.

## Règle d'or

**Réutiliser un composant DSFR existant AVANT tout CSS custom.** Besoin d'un badge / en-tête /
carte / alerte / champ → il existe déjà dans react-dsfr. Le CSS maison est le dernier recours,
et seulement avec des tokens.

## Restriction légale (à savoir)

Le **bloc-marque Marianne** et le DSFR sont **réservés aux sites de l'État** (proto AN = OK).
Si emendare devient un **produit privé vendu**, il faut **re-thémer** (retirer Marianne + DSFR).

## Setup (déjà en place)

- **App produit : `apps/web/` (Next App Router)** — wiring officiel `src/dsfr-bootstrap/`
  (`DsfrProvider`, `DsfrHead`, `getHtmlAttributes` depuis `@codegouvfr/react-dsfr/next-app-router`),
  câblé dans `src/app/layout.tsx` ; chaque page monte `<StartDsfrOnHydration />`. Le CSS DSFR est
  chargé par `DsfrHead` (via sass, devDep requise). Pas de `copy-dsfr-to-public` en Next.
- Démo Vite : **`apps/dsfr-demo/`**. Install : `npm install @codegouvfr/react-dsfr` ;
  le `postinstall` `copy-dsfr-to-public` copie fonts/icônes/css dans `public/dsfr/` (requiert un
  dossier `public/`). Init : `startReactDsfr({ defaultColorScheme: "system" })` +
  `import "@codegouvfr/react-dsfr/main.css"` dans
  [`apps/dsfr-demo/src/main.tsx`](../../../apps/dsfr-demo/src/main.tsx).

## Les 3 recettes de référence (vrais composants — voir [`apps/dsfr-demo/src/App.tsx`](../../../apps/dsfr-demo/src/App.tsx))

| # | Besoin | Composant DSFR réel | Où, dans `src/App.tsx` |
|---|--------|---------------------|------------------------|
| a | En-tête officiel, bloc-marque RF / Assemblée nationale | `Header` (`@codegouvfr/react-dsfr/Header`) — props `brandTop`, `homeLinkProps`, `serviceTitle`, `serviceTagline` | `<Header … />` (chemins ci-dessous = `apps/dsfr-demo/src/App.tsx`) |
| b | Badge de sort | `Badge` (`@codegouvfr/react-dsfr/Badge`) — `severity`: `success` (recevable) / `error` (irrecevable) / `info` (point d'attention) | bloc « Sort proposé » |
| c | Surlignage red-flag art. 40 | `<mark>` stylé **tokens** `background.contrast.warning` + `text.default.warning` (`fr.colors.decisions.*`) | composant `RedFlag` |

Ces recettes couvrent le socle. Pour tout le reste → context7 + les `.d.ts`.

## Vérifier

- `cd apps/dsfr-demo && npm run dev` (bind **localhost** — jamais `--host 0.0.0.0`) → `http://localhost:5173`.
- Rendu DSFR OK si : bloc-marque Marianne visible, police Marianne appliquée, console logue
  `dsfr : mode set to react`. Gate navigateur = `playwright-cli --browser chromium` (cf. CLAUDE.md).
