# Procédure d'analyse de recevabilité — spec de l'agent (v1)

Approfondissement de [regles-recevabilite-hackathon-AN.md](regles-recevabilite-hackathon-AN.md) et de
`recevabilite_amendements_AN.md` (fiche de travail racine). Recherche consolidée le 2026-07-04
(Règlement AN vérifié au texte, LOLF, LOLFSS/CSS, fiches 51-52, rapport Coquerel n°1891, schémas
open data AN via `@tricoteuses/assemblee`).

**Découverte clé** : le corpus labellisé « sort connu » que `workflow.md` disait manquant **existe
dans les dumps AN déjà ingérés**. Le couple `cycleDeVie.etatDesTraitements.{etat, sousEtat}` +
`cycleDeVie.sort` fournit le verdict ET le motif fin (36 classes) — colonnes `etat`/`sousEtat`/`sort`
déjà présentes sur notre modèle `Amendment`. La typologie Eloi ci-dessous est donc à la fois notre
**schéma de sortie** et notre **jeu d'évaluation**.

---

## 1. Référentiel complet des motifs d'irrecevabilité

Bien au-delà des 4 articles (40/41/38/45) de l'analyse initiale. Colonne « Code » = code/libellé
Eloi tel qu'il apparaît dans l'open data (à réutiliser tel quel).

### 1.1 Irrecevabilité financière et organique (état Eloi « Irrecevable 40 »)

| Code / libellé Eloi | Fondement | Règle |
|---|---|---|
| `Charge` | **Art. 40 C.** ; art. 89 al. 2-4 RAN | Création/aggravation d'une charge publique. « Charge » au **singulier** → jamais compensable, même gagée. Charge éventuelle ou différée = charge. Tolérance : simples charges de gestion. |
| `Gage` | Art. 40 C. | Perte de recettes (« ressources » au **pluriel** → gageable) sans gage, ou gage défectueux : non réel, différé, ou ne bénéficiant pas à la même personne publique. |
| `Crédits` | **Art. 47 LOLF** | PLF : la charge s'apprécie au niveau de la **mission**. Recevable = redéployer entre programmes d'une même mission à total constant ; irrecevable = augmenter le plafond de la mission ou créer une mission. |
| `LOLF`, `Autres irr LOLF` | Art. 47 LOLF ; art. 121 RAN | Autres non-conformités à la loi organique (motivation, développement des moyens…). |
| `Cavalier budgétaire` | **Art. 34 LOLF** | Disposition hors du domaine (exclusif ou partagé) des lois de finances. |
| `Irr en première partie` / `Irr en seconde partie` | Art. 34 LOLF (LO 2021-1836) | Disposition placée dans la mauvaise partie du PLF (recettes en 1re, dépenses en 2de). |
| `LOLFSS`, `Autres irr LOLFSS` | **Art. L.O. 111-7-1 IV CSS** ; art. 121-2 RAN | PLFSS : la charge s'apprécie par **objectif de dépenses de branche ou ONDAM**. |
| `Cavalier social` | **Art. L.O. 111-3 à 111-3-16 CSS** | Disposition hors du domaine des LFSS. |
| `Autre irrecevabilité 40` (`IRRAIF`) | Art. 40 C. | Résiduel. |

Doctrine opérationnelle (rapport Coquerel n°1891) :
- Personnes publiques : État + ODAC, collectivités (« en bloc »), ASSO, organismes majoritairement financés par fonds publics.
- Base de référence : droit existant OU droit proposé OU version antérieure — toujours **dans le sens favorable à l'initiative** (garde-fou anti-faux-positifs pour l'agent).
- **Demandes de rapport au Gouvernement : recevables** (pas de charge). Expérimentations : recevables sous conditions (art. 37-1 C.).
- Gage type accepté : taxe additionnelle à l'accise sur les tabacs.
- Volumes : taux d'irrecevabilité financière 16,4 % (2021-22) → 7,3 % (2024-25).

### 1.2 Irrecevabilités « générales » (état Eloi « Irrecevable »)

| Code / libellé Eloi | Fondement | Règle |
|---|---|---|
| `IRR45` — `Cavalier (45)` | **Art. 45 al. 1 C.** ; art. 98 al. 6 RAN | 1re lecture : absence de lien, **même indirect**, avec le texte déposé. Taux ≈ 23 % depuis 2022 — c'est le motif le plus fréquent, pas l'art. 40. |
| `IRR45` — `Entonnoir (45)` | Art. 45 C. ; art. 108 al. 3-5 RAN | Lectures suivantes : ne porte pas sur une disposition restant en discussion (exceptions : constitutionnalité, coordination, erreur matérielle). |
| `IRR45` — `CMP (45)` | Art. 45 al. 3 C. | Après CMP : aucun amendement sans accord du Gouvernement. |
| `IRR41` — `Domaine de la loi (41)` | Art. 41 C. ; art. 93 RAN | Hors domaine de la loi. Opposée par le Gouvernement ou le Président de l'AN, à tout moment (pas systématique au dépôt). |
| `IRR37` — `Disposition réglementaire (37)` | Art. 37 C. | Variante réglementaire du 41. |
| `IRR38` — `Champ de l'habilitation (38)` | Art. 38 C. ; art. 93 al. 2 RAN | Empiète sur une matière déléguée par ordonnance, ou étend une habilitation (réservé au Gouvernement). |
| `IRR20` — `Injonction (20)` | Art. 20 C. (jurisprudence CC) | Injonction au Gouvernement. Exception : la demande de rapport n'est PAS une injonction. |
| `IRR42` — `Satisfait ou inopérant (42)` | — | Amendement sans objet / déjà satisfait ; recouvre en pratique le défaut de portée normative (CC 2005-512 DC). |
| `IRR48` — `Ordre du jour (48)` | Art. 48 C. | |
| `IRR53` — `Ratification traité (53)` | Art. 53 C. ; art. 128 RAN | Pas d'amendement sur les articles d'un traité. |
| `IRR127` — `Domaine loi organique (127)` | Art. 127 RAN | Dispositions non organiques dans un texte organique (et inversement). |
| `Commission (44)` | Art. 44 al. 2 C. ; art. 100 al. 3 RAN | Non soumis à la commission (si le Gouvernement l'invoque). |

### 1.3 Irrecevabilités formelles / procédurales

| Code Eloi | Fondement | Règle |
|---|---|---|
| `IRRHD` — `Hors-délais` | Art. 86 al. 5 (commission) ; art. 99 (séance) RAN | 3e jour ouvrable avant l'examen, 17 h. Exceptions : Gouvernement, commission, sous-amendements (art. 99 al. 3), réouverture du délai (al. 2). |
| `IRRSA` — `Sous-amendement (98)` | Art. 98 al. 5 RAN | Sous-amendement contredisant le sens de l'amendement, ou sous-amendement amendé. Un amendement ne porte que sur un seul article. |
| `IRRD` — `Doublon` | pratique Eloi | Duplication exacte. |
| `IRRHC` — `Hors champ` | art. 98 al. 6 RAN | Proche du cavalier. |
| (motivation) | Art. 98 al. 4 RAN | Amendement « sommairement motivé » exigé (exposé sommaire). |

Droit de l'auteur : **explication écrite** de toute irrecevabilité (art. 89 al. 6 RAN) — c'est
exactement le « texte justificatif court » du bloc (iv) d'Emendare.

---

## 2. Procédure d'analyse — pipeline de gates traçables

Principe : **du déterministe vers le probabiliste, du gratuit vers le payant**. Chaque gate émet
une ou plusieurs entrées de trace ; une gate peut conclure (court-circuit), poser un signal
(transmis aux gates suivantes), ou passer. Le LLM n'est appelé qu'en G5, sur les cas que les gates
déterministes n'ont pas tranchés — c'est le levier de coût n°1.

### Entrée de trace (chaque choix est traçable)

```json
{
  "gate": "G2",
  "regle": "ART40_GAGE",
  "fondement": "Constitution art. 40 ; RAN art. 89",
  "constat": "Dernier alinéa du dispositif matche le gage type 'taxe additionnelle à l'accise sur les tabacs'",
  "evidence": { "extrait": "…est compensée, à due concurrence…", "champ": "dispositif", "position": [812, 1044] },
  "effet": "SIGNAL",            // SIGNAL | CONCLUT | PASSE
  "signal": { "gagePresent": true }
}
```

### G0 — Contexte (déterministe, données en base)

Charge le contexte sans lequel aucune règle ne s'applique correctement :
- **Nature du texte** (`lawText.nature`) : PLF → règles LOLF actives ; PLFSS → LOLFSS ; loi organique → art. 127 ; ordinaire → ni l'un ni l'autre.
- **Lecture** (dossier législatif, `codeActe` : `AN1-…` = 1re lecture, `ANNLEC-…`, `ANLDEF-…`, `CMP-…`) : pilote le régime art. 45 (lien indirect vs entonnoir vs CMP).
- **Auteur** (`auteurType`) : `Gouvernement` → art. 40, 41, délais **inapplicables** ; `Rapporteur`/commission → exemptions de délai.
- **Stade** (`organeExamen`) : commission vs séance → qui contrôle, quel délai.
- **Partie du PLF** (article visé en 1re/2de partie) si PLF.
- **Version du droit de référence** : dater la base consultée (`TextReference.dateVersionConsultee`) — règle transversale du hackathon (« indiquer lorsque la base de référence a évolué »).

Sortie : objet `contexte` joint à la trace. Court-circuit possible : auteur = Gouvernement →
l'essentiel des filtres tombe, verdict quasi certain RECEVABLE (sauf 45 al. 3 après CMP).

### G1 — Contrôles formels (déterministe)

| Règle | Test | Effet |
|---|---|---|
| `FORME_DELAI` | `dateDepot` vs délai art. 86/99 (si connaissable) | CONCLUT `IRRHD` si dépassé sans exception |
| `FORME_SOUS_AMDT` | `amendementParentRef` non nul + contradiction du sens (→ signal pour G5) | SIGNAL |
| `FORME_MONO_ARTICLE` | `pointeurFragment` vise plusieurs articles | SIGNAL |
| `FORME_EXPOSE` | `exposeSommaire` vide/indigent | SIGNAL |
| `FORME_DOUBLON` | similarité pgvector ≥ 0,97 avec un amendement du même texte/stade | SIGNAL (`IRRD` probable) |

### G2 — Analyse lexicale et structurelle (regex + lexique, gratuit)

- **Gage** : regex sur le dernier alinéa du dispositif. Deux formules canoniques : « articles 575 et
  575 A du code général des impôts » (ancienne) et « taxe additionnelle à l'accise sur les tabacs »
  (actuelle) ; variantes État / organismes de sécurité sociale / collectivités (DGF). Motifs stables :
  `perte de recettes`, `à due concurrence`, `taxe additionnelle`. → signal `gagePresent`.
- **Lexique art. 40** ([lexique-art40.ts](lexique-art40.ts), éditable) : présence de mots à risque
  (financement, dotation, allocation, prise en charge, verser, affecter…) → signal `redFlags40[]`
  avec positions (alimente le surlignage du bloc (i)).
- **Demande de rapport** : « le Gouvernement remet au Parlement un rapport… » → signal
  `demandeRapport` (présomption RECEVABLE — pas une charge, pas une injonction).
- **Injonction** : « le Gouvernement doit / est tenu de / met en œuvre… » hors demande de rapport → signal `injonction20`.
- **Amendements de crédits PLF/PLFR** : le dispositif structuré (`dispositifAmdtCreditPLF` :
  programmes, AE/CP, soldes) permet un test **arithmétique exact** de l'art. 47 LOLF : solde
  mission = 0 et pas de création de mission → CONCLUT recevable sur ce critère ; solde > 0 →
  CONCLUT `Crédits`.
- **Article additionnel** (`articleAdditionnel = true`, « Après l'article X ») : signal n°1 de
  risque cavalier 45 → poids fort transmis à G3/G5.

### G3 — Précédents (pgvector, déjà en prod)

`GET /amendments/:id/similar` filtré par nature (les trois degrés du hackathon) :
1. même texte / même navette ;
2. textes similaires ciblés (PLFSS N-1 via `priorYearText`, textes de même thème) ;
3. tout l'historique.

Pour les k plus proches **dont le sort est connu** (`etat`/`sousEtat`/`sort` en base) : calcul d'un
**prior empirique** — ex. « 7 des 10 amendements les plus proches (> 80 %) ont été déclarés
Cavalier (45) ». → signal `precedents` (liste id + similarité + sort + motif). Jamais concluant
seul, mais très informatif, et signale si la base de référence a changé depuis le précédent.

### G4 — Aiguillage (déterministe)

Combine les signaux :
- Aucun signal de risque + contexte simple → **fast-track** : verdict RECEVABLE, confiance élevée, sans appel LLM.
- Conclusion déjà atteinte (G1 délai, G2 crédits) → sortie directe.
- Sinon → G5 avec la liste **restreinte** des règles à examiner (on n'envoie pas les 25 motifs au
  LLM, seulement celles que les signaux rendent plausibles + toujours 40 et 45 qui exigent du
  raisonnement juridique).

### G5 — Analyse LLM ciblée (le seul étage payant)

Un appel unique, sortie structurée. Le LLM reçoit : dispositif + exposé sommaire, contexte G0,
signaux G1-G3, extraits du droit visé (`TextReference` → article consolidé, tronqué), périmètre du
texte (titre + liste des articles pour juger le lien art. 45), et la checklist des règles à
examiner. Il doit, **pour chaque règle examinée**, produire un mini-raisonnement traçable :

```json
{
  "regles": [
    {
      "code": "IRR45_CAVALIER",
      "avis": "RISQUE",            // OK | RISQUE | IRRECEVABLE
      "raisonnement": "L'amendement crée un dispositif fiscal sans rapport, même indirect, avec l'objet du texte (protection de l'enfance).",
      "evidence": ["Après l'article 3", "aucun article du texte ne traite de fiscalité"]
    },
    { "code": "ART40_CHARGE", "avis": "OK", "raisonnement": "Aucune dépense nouvelle pour une personne publique.", "evidence": [] }
  ],
  "sort": "IRRECEVABLE",
  "motifCode": "IRR45",
  "motifLibelle": "Cavalier (45)",
  "confiance": 0.78,
  "justificatif": "Absence de lien, même indirect, avec le texte en discussion (article 45 de la Constitution) : le dispositif fiscal proposé est étranger à l'objet du projet de loi."
}
```

Garde-fous prompt : appliquer le doute **dans le sens favorable à l'initiative** (doctrine
Coquerel) ; ne jamais conclure `Charge` sur la seule présence d'un mot du lexique ; demande de
rapport = recevable ; l'outil **suggère, l'humain décide**.

### G6 — Verdict, justificatif, persistance

- Agrégation : conclusions déterministes priment sur le LLM en cas de conflit (elles sont prouvées).
- Sortie finale (bloc (iv) du cockpit) :

```json
{
  "sort": "IRRECEVABLE",
  "motifCode": "IRR45",
  "motifLibelle": "Cavalier (45)",
  "fondement": "Art. 45 al. 1 Constitution ; art. 98 al. 6 RAN",
  "confiance": 0.78,
  "justificatif": "≤ 60 mots, style des motifs réels ('création d'une allocation versée par l'État')",
  "fastTrack": false,
  "traceId": "…"                    // → détail complet, entrée par entrée
}
```

- Persistance dans `AmendmentAnalysis` (`reviewerType: "agent-recevabilite-v1"`, `confidence`,
  `rationale` = justificatif, `tags` = [motifCode, …signaux]) + la trace complète en JSON (à terme :
  champ `trace Json` dédié ou table `AnalysisTrace`).
- **Évaluation continue** : pour tout amendement dont le sort réel arrive ensuite via l'ingestion,
  comparer verdict agent vs `etat`/`sousEtat` réels → matrice de confusion par motif, calibration de
  la confiance. C'est gratuit : les labels sont dans les dumps.

---

## 3. Efficacité coût de l'étage LLM

Leviers, dans l'ordre d'impact :

1. **Ne pas appeler le LLM** : G0-G4 tranchent les cas évidents (fast-track du hackathon §5). Sur
   les volumes réels (~7-12 % d'irrecevabilité financière, ~23 % art. 45), une grosse part des
   amendements « propres » sort en G4 sans appel.
2. **Prompt caching** : prompt système stable (règles §1 distillées + typologie des motifs + doctrine
   + 3-5 exemples calibrés) marqué `cache_control: {type: "ephemeral"}` ; tout le volatil
   (amendement, contexte, signaux) après le point de cache. Lectures de cache ≈ 0,1× le prix.
   Traitement par lots groupés < 5 min pour garder le cache chaud.
3. **Batch API (−50 %)** pour tout ce qui n'est pas interactif : backfill historique, runs
   d'ingestion hebdo. Appels directs seulement pour le test interactif d'un député/administrateur.
4. **Sortie contrainte et courte** : structured outputs (JSON schema strict), `justificatif` ≤ 60
   mots, `raisonnement` ≤ 30 mots par règle, `max_tokens` borné (~1500). L'output est ce qui coûte
   le plus cher au token — le schéma ci-dessus est conçu compact (codes, pas de prose libre).
5. **Modèle et effort** : recommandation `claude-opus-4-8` (5 $/25 $ par Mtok) avec
   `output_config.effort` modulé par l'aiguillage G4 — `low`/`medium` pour les cas à signal unique,
   `high` pour les cas multi-signaux ou PLF/PLFSS. Option triage deux-vitesses (Haiku 4.5 en
   première passe) possible mais à ne considérer qu'après mesure : le fast-track G4 remplit déjà ce
   rôle gratuitement.
6. **Contexte d'entrée maîtrisé** : extraits du droit consolidé tronqués à l'article visé (pas le
   code entier), périmètre du texte résumé (titres d'articles), top-5 précédents seulement.

**Point d'architecture à décider ensemble au moment du build** : SDK Anthropic direct (accès aux
leviers ci-dessus : caching explicite, Batch API, structured outputs natifs) **vs** passage par la
gateway OpenAI-compatible existante (cohérent avec la décision souveraineté des embeddings — seul
`BASE_URL` changera demain, mais on perd Batch/caching natifs selon la gateway). L'agent doit être
écrit derrière un port `LlmReviewerPort` pour que ce choix reste réversible, comme pour les
embeddings.

---

## 4. Données et interconnexions nécessaires à l'agent

| Besoin | Source | État |
|---|---|---|
| Dispositif + exposé sommaire | `Amendment.content` / `exposeSommaire` | ✅ en base |
| Sort/motif réels (éval + précédents) | `etat`, `sousEtat`, `sort`, `soumisArticle40` | ✅ en base (vérifier que `sousEtat` capte bien le **code** `IRRxx`, pas seulement le libellé) |
| Auteur (Gouvernement vs parlementaire) | `auteurType` | ✅ en base |
| Article visé / article additionnel | `articleAdditionnel`, `pointeurFragment` | ✅ en base |
| Amendements de crédits (AE/CP structurés) | `raw.corps.contenuAuteur.dispositifAmdtCreditPLF` | ✅ dans `raw` (à exposer en scalaires si G2 crédits implémenté) |
| Nature du texte (PLF/PLFSS/organique) | `lawText.nature` (dénormalisé `Amendment.nature`) | ✅ en base |
| **Lecture (1re vs suivantes vs CMP)** | dossier législatif, `actesLegislatifs…codeActe` (`AN1-`, `ANNLEC-`, `ANLDEF-`, `CMP-`) | ❌ **à capter** dans l'ingestor `textes-an` → champ `LegislativeText.lecture` ou dérivé de `version` |
| Périmètre du texte (pour le lien art. 45) | `LegislativeText.content` / titres d'articles | ⚠️ partiel (dépend du dépôt textes) |
| Droit consolidé visé (base du 40/41) | `TextReference.consolidatedText` (DILA) | ⚠️ résolution DILA désactivée actuellement |
| LFSS N-1 (précédents PLFSS) | `LegislativeText.priorYearText` | ✅ en base |
| Précédents similaires + leur sort | API similarité pgvector + `sort` | ✅ en prod |
| Délais de dépôt (date limite par examen) | open data réunions/agendas AN | ❌ non ingéré (G1 délai dégradé en signal tant que absent) |
| Lexique art. 40 éditable | `docs/metier/lexique-art40.ts` | ✅ (à déplacer en DB pour édition admin, issue #2) |

## 5. Sources

- Règlement AN (PDF officiel) : https://www.assemblee-nationale.fr/dyn/15/divers/texte_reference/02_reglement_assemblee_nationale.pdf
- Fiches de synthèse n°51 et n°52 (assemblee-nationale.fr/dyn/synthese/…)
- Rapport Coquerel n°1891, 30 sept. 2025 : https://www.assemblee-nationale.fr/dyn/17/rapports/cion_fin/l17b1891_rapport-information
- Art. 47 LOLF : https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006321072 · Art. L.O. 111-7-1 CSS : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006741005
- Schémas open data AN : https://data.assemblee-nationale.fr/autres/schemas · énums locaux : `node_modules/@tricoteuses/assemblee/lib/schemas/raw/amendements.d.ts` (l. 1167-1226)
- Vademecum Sénat art. 45 · LLaMandement (arXiv 2401.16182, LLM DGFiP sur amendements FR) · La Fabrique de la Loi

**Points de vigilance** : (1) numérotation RAN vérifiée sur la version consolidée ~2019 — re-vérifier
art. 121-2 après toute réforme du Règlement ; (2) rattachement exact du libellé « Satisfait ou
inopérant (42) » à l'art. 42 non élucidé ; (3) le PDF officiel du RAN annexe LOLF et CSS — bonne
source unique pour le prompt système.
