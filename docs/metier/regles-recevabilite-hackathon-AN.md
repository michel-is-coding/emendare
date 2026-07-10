# Regles metier de recevabilite (source primaire : slides hackathon AN)

Approfondissement (referentiel juridique complet + procedure d'analyse de l'agent) :
[procedure-recevabilite-agent.md](procedure-recevabilite-agent.md).

Source autoritaire : 7 photos de slides du hackathon Assemblee nationale, dans `data/`
(IMG_20260703_17xxxx). Ces regles priment sur la recherche web pour les points qu elles couvrent.
Elles precisent le workflow reel de l administrateur et alimentent la revue finale avant dev.

## 1. Objectif de l outil (slide "Identifier des mots-cles")

Enjeu : identifier des mots-cles dont la seule presence fait soupconner une irrecevabilite.
Objectifs : gagner en rapidite face a des amendements parfois tres longs ; eviter les oublis.

## 2. Lexique article 40 (le red-flag tree exact - contenu de l issue #2)

Mots-cles a surligner car leur seule presence fait soupconner une irrecevabilite financiere.
Structure hierarchique (categorie puis sous-termes), telle que presentee :

- Finances : Financement, Financer, Financier
- Subvention : Dotation, Allocation, Prime
- Accompagnement : Soutien, Prise en charge, Contribution
- Contrat : Convention, Contractualisation
- Verser : Affecter, Transferer
- Investissement
- Ressources

Note : liste non exhaustive (exemples). Le lexique doit rester editable par les administrateurs
(issue #2). Version structuree reutilisable : `docs/metier/lexique-art40.ts`.

## 3. Retrouver des precedents : trois degres de recherche

Slide "Retrouver des precedents" : trois degres selon les besoins et la puissance de l outil.

- **Degre 1 - au sein de la procedure legislative pour un meme texte** : comparaison entre les
  amendements deposes en commission, en seance et lors des precedentes lectures ; comparaison avec
  les differents textes adoptes (commission ou seance publique a l AN, seance publique au Senat).
  Exemple cite : PPL Droit a l aide a mourir (chaine des versions du texte a travers les lectures).
- **Degre 2 - textes similaires cibles, choisis par les administrateurs** : comparaison entre PLF et
  PLFSS successifs ; comparaison entre textes similaires (exemples : PJL Protection de l enfance,
  PPL Interet des enfants, PPL Droit de chaque enfant a etre assiste d un avocat, PPL Proteger les
  enfants et lutter contre les violences en milieu scolaire).
- **Degre 3 - recherche dans tout l historique**.
- **Attention (regle transversale)** : a chaque fois, indiquer lorsque la base de reference (droit
  propose : PJL ou PPL en cours de discussion, ou droit existant) a evolue.

Consequence produit : le module "precedents / similaires" n est pas une simple liste ; c est une
recherche a portee reglable (meme texte -> textes cibles -> tout l historique), qui doit signaler
l evolution de la base de reference.

## 4. Proposer un sort : methode d analyse (slide "Proposer des sorts")

Enjeu : identifier si un amendement doit etre juge recevable ou non, et pourquoi.

1. Lire l amendement et comprendre comment il propose de modifier le droit.
2. L analyser au regard de :
   - **nos regles de recevabilite** : article 40 de la Constitution, lois organiques relatives aux
     lois de finances et aux lois de financement de la securite sociale, rapports des presidents de
     la commission des finances ;
   - **la base de reference** : droit existant (Legifrance), droit propose (texte en discussion) ;
   - **nos precedents**.
3. Determiner s il doit etre juge recevable ou non.
4. Si irrecevable, expliquer le motif de la decision.
   - Exemples de motif reels : "creation d une allocation versee par l Etat" ; "diminution non
     gagee du taux de la TVA".

Mapping direct sur le cockpit emendare :
- regles -> module Preconisation (signaux art. 40, indicatif) + le lexique ;
- base de reference -> module Legifrance (droit existant) + texte en discussion (droit propose,
  mark-change avant/apres) ;
- precedents -> module Precedents/Similaires (les trois degres ci-dessus, via l API similarite).

## 5. Difficultes (slide "Proposer des sorts - Difficultes")

- Complexite du controle de recevabilite.
- Volume d amendements.
- Necessite de maintenir un controle humain sur chaque amendement (confirme le garde-fou n4 : l outil
  suggere, l humain decide).
  - Nuance importante : utilite moindre voire redondance pour les amendements dont l irrecevabilite
    ou la recevabilite est evidente. -> justifie un traitement rapide (fast-track) des cas evidents,
    et une revue complete des cas ambigus. Le compteur de confiance de la preconisation peut piloter
    ce tri (haute confiance = traitement rapide propose, faible confiance = revue approfondie).

## 6. API de similarite (deja reelle - smoke-test)

La similarite n est plus factice : le back-end (apps/api) expose une recherche vectorielle
operationnelle (OpenRouter embeddings + pgvector).

- OpenRouter /embeddings fonctionne (point de risque du plan leve, pas de changement de gateway).
- Backfill : 295/300 amendements vectorises, 0 echec (5 exclus par design car dispositif vide).
  Run visible dans GET /ingestion/status.
- GET /amendments/:id/similar : pour l amendement n225 (Article premier), tops = n226/227/228/230 du
  meme article a 95 a 99,6 % (les quasi-duplications multi-groupes classiques de l AN).
- POST /amendments/similar avec une paraphrase libre : remonte les amendements thematiquement proches
  a environ 62 % (ordre de grandeur attendu pour une reformulation).

Consequence produit :
- Le module "similaires / precedents" du cockpit se branche sur cette API (le % devient reel).
- GET /amendments/:id/similar sert les degres 2 et 3 pour un amendement donne (quasi-dupes puis
  proches thematiques). POST /amendments/similar (paraphrase libre) sert la recherche libre.
- Le seuil d affichage doit distinguer quasi-duplication (>90 %) de proximite thematique (~60 %),
  car le geste metier differe (traiter en discussion commune vs simplement s inspirer d un precedent).

## 7. A integrer a la revue finale (rapport de recommandations)

Ces regles et cette API doivent etre fondues dans le rapport final du workflow de recherche metier
(run de recherche 2026-07-03) avant le handoff d implementation. Points a garantir :
1. Le lexique art. 40 (section 2) pilote le surlignage red-flag (aujourd hui code en dur).
2. Le module precedents devient une recherche a trois degres (section 3), branchee sur l API (section 6).
3. La preconisation suit la methode d analyse en trois axes (section 4), avec motifs types.
4. Le fast-track des cas evidents (section 5) est propose sans jamais retirer le controle humain.
