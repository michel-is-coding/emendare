# emendare - Rapport final de recommandations produit et design
## Cockpit de l'administrateur de commission (Assemblée nationale), version 1 statique

Document de référence pilotant l'implémentation. Il ne coupe aucune fonctionnalité validée ; lorsqu'une doit être allégée, il dit comment. Il s'appuie sur la recherche métier vérifiée, les retours des cinq personas, la critique de complétude, et sur l'état réel du dépôt (`apps/web/src/app/administrateur/Cockpit.tsx`, `apps/web/src/data/fixtures.ts`, `docs/specs/2026-07-03-cockpit-admin-v1.md`).

Deux constats d'ancrage, à intégrer d'emblée :
1. Les schémas `docs/conception/spec_agent_deepresearch.md`, `schemas/e7_suivi_procedure.schema.json` et `schemas/e2_note_risques.schema.json` cités par la spec n'existent pas dans ce worktree. Le contrat de données réel et unique de la v1 est le fichier `fixtures.ts`, dont les champs reprennent la nomenclature e7 par convention de nommage. On garde cette convention, on ne bloque pas sur le fichier absent : `fixtures.ts` fait foi.
2. Le cockpit actuel navigue par index de tableau (donc par ordre de dépôt) et rend les deux signaux de l'article 40 avec la même décision de couleur d'alerte (warning). Or la donnée distingue déjà `signal_charge` et `signal_ressource` : la correction est d'abord une affaire d'affichage, pas de modèle.

Légende de priorité :
- **P0** : indispensable au premier parcours complet (vue d'ensemble, tri par ordre d'appel, instruction, export). Sans lui, l'outil n'est pas démontrable comme poste de travail.
- **P1** : complète la justesse juridique et le confort de traitement en volume.
- **P2** : différable (phase 2, mode suivi de navette, ou après retour terrain).

---

## 1. Mécanismes métier réels et ce qu'ils changent dans l'interface

### 1.1 Article 40 : la dissymétrie charge / ressource commande tout

Le texte constitutionnel oppose deux prohibitions de gravité inégale. La création ou l'aggravation d'une **charge** publique (singulier) n'est **jamais** compensable : elle vaut irrecevabilité définitive, sans recours interne. La diminution des **ressources** publiques (pluriel) est, elle, rattrapable par un **gage** certain, chiffrable et intégral (formules types : « à due concurrence », majoration des droits sur les tabacs, dotation globale de fonctionnement). Un signal ressource sans gage valable est irrecevable ; avec un gage solide, l'amendement redevient recevable.

**Ce que ça change dans emendare.** Les deux signaux ne peuvent plus partager la même couleur ni le même poids. Le signal charge devient un marqueur bloquant (décision de couleur `error`, mention « non gageable, irrecevabilité quasi certaine »), le signal ressource un point d'attention conditionnel (décision `warning`, mention « curable par un gage valable »). Il faut de plus un objet métier « gage » (présent / absent / insuffisant), aujourd'hui absent, qui est le vrai discriminant du pré-tri financier.

### 1.2 Cas hors champ de l'article 40 : éviter le sur-signalement

La simple **charge de gestion** (mobilisation de moyens administratifs existants, sans recrutement) et la **demande de rapport** échappent à la qualification de charge et restent recevables. C'est l'erreur type du profil junior : sur-signaler par excès de prudence.

**Ce que ça change.** Un garde anti-faux-positifs : quand un amendement est une demande de rapport ou une charge de gestion, l'outil affiche explicitement « hors champ de l'article 40 » plutôt qu'un silence. La fixture `CD101` (demande de rapport) est déjà à `aucun_signal` ; il manque la justification positive qui rassure l'administrateur.

### 1.3 Recevabilité organique : LOLF et LFSS, distinctes de l'article 40

Pour les lois de finances, la charge s'apprécie au niveau de la **mission** (article 47 de la LOLF) : on peut redéployer des crédits entre programmes d'une même mission sans dépasser son plafond. Pour les lois de financement de la sécurité sociale, elle s'apprécie par **objectif de dépenses par branche ou par l'ONDAM** (article L.O. 111-7-1 du code de la sécurité sociale). Correction importante : ce n'est **pas** le « sous-objectif ». S'y ajoutent les cavaliers budgétaires (LOLF) et sociaux (LFSS), motifs distincts du cavalier de l'article 45.

**Ce que ça change.** On conserve les étiquettes IRR LOLF et IRR LFSS, mais le vocabulaire des infobulles et des motifs pré-remplis doit dire « objectif de dépenses par branche ou ONDAM » et « plafond de la mission ». Toute règle encodée sur le « sous-objectif » serait juridiquement fausse.

### 1.4 Article 45 : le critère de lien change avec la lecture

En **première lecture**, tout amendement présentant un lien **même indirect** avec le texte est recevable ; l'absence de tout lien en fait un cavalier. Dès la **deuxième lecture**, la règle de l'entonnoir se referme : l'amendement doit porter sur les **dispositions restant en discussion** et présenter un lien **direct** avec elles (trois dérogations seulement : respect de la Constitution, coordination avec un texte en cours, correction d'une erreur matérielle).

**Ce que ça change.** La préconisation de lien est **fausse dès l'entrée en navette** si l'outil ignore la lecture en cours. Il faut un paramètre « lecture » (première / ultérieure) qui conditionne le test de l'article 45, et une étiquette de motif scindée en cavalier (première lecture) et entonnoir (lectures ultérieures).

### 1.5 Articles 41 et 38 : filtres marginaux, pas de routine

L'article 41 (hors domaine de la loi, ou contraire à une délégation accordée au titre de l'article 38) **n'est pas contrôlé systématiquement au dépôt** : il doit être activement opposé par le Gouvernement ou le Président de l'assemblée, et reste rarissime (de l'ordre d'une douzaine d'occurrences depuis 1958). L'article 38 n'ouvre pas de motif autonome : il passe par le canal de l'article 41.

**Ce que ça change.** On ajoute une étiquette IRR-41 pour la complétude, mais présentée comme **signal d'alerte à faible probabilité**, jamais comme filtre de premier plan à côté des articles 40 et 45. Pas d'onglet « article 38 » séparé.

### 1.6 Dérouleur et ordre d'appel : le vrai ordre de traitement

L'administrateur ne traite jamais les amendements par numéro, mais dans l'**ordre d'appel** du dérouleur (la « feuille jaune »), construit par la division de la Séance. Cet ordre est déterministe : par article, puis du plus général au plus particulier (suppression d'article avant suppression d'alinéa, avant phrase, avant mots ; réécriture globale avant reformulation d'alinéa), puis, à place égale, du plus éloigné au plus proche du texte proposé. Le Gouvernement et la commission ont une priorité d'appel sur les amendements identiques des députés.

**Ce que ça change.** La navigation par flèches et le tri de la vue d'ensemble doivent suivre l'ordre d'appel, pas l'index de dépôt. C'est aussi cet ordre qui détermine quels amendements « tombent ». C'est le geste métier fondateur : tout ce qui rapproche l'interface de la feuille jaune est bon à prendre.

### 1.7 Discussion commune et identiques : deux régimes à ne pas confondre

Les amendements **identiques** (mention « id ») ont une rédaction rigoureusement identique sur le même endroit : ils sont votés d'un seul vote et un sort commun est légitime. Les amendements en **discussion commune** (mention « dc ») sont des rédactions concurrentes exclusives : le débat est mutualisé, mais les votes restent **séparés**, et l'adoption de l'un fait **tomber** les autres. Appliquer un sort unique à une discussion commune serait une faute de procédure.

**Ce que ça change.** Le traitement par lot avec sort commun (J2a) n'est légitime que pour les identiques. La discussion commune se regroupe à l'écran mais chaque amendement garde son sort propre. Le champ de regroupement doit être typé « id » ou « dc ».

### 1.8 Vocabulaire exact des sorts, et deux sorts à tracer

Les sorts canoniques sont : **adopté, rejeté, retiré, tombé, non soutenu, irrecevable**. Deux pièges : « irrecevable » n'est pas « rejeté » (couperet juridique en amont contre vote défavorable au fond) ; « tombé » et « non soutenu » ne sont pas des jugements de fond (conséquence mécanique de l'ordre d'appel pour l'un, absence de l'auteur pour l'autre). De plus, un amendement porte **deux sorts successifs** : en commission, puis en séance (un amendement adopté en commission peut tomber en séance).

**Ce que ça change.** Le module Similaires doit préciser **à quel stade** (commission ou séance, quelle lecture) le sort a été prononcé, et distinguer visuellement tombé / non soutenu d'un rejet au fond. Afficher un seul « sort réel » sans stade est trompeur pour une aide à la décision.

### 1.9 Qui décide et quand : l'outil instruit, l'autorité prononce

L'administrateur **instruit et propose**, il ne décide jamais. La recevabilité financière est prononcée par le **président de la commission saisie au fond** en commission (consultation **facultative** de la commission des finances, « s'il l'estime nécessaire »), et par le **Président de l'Assemblée** en séance (avis, cette fois de règle, de la commission des finances). La décision est définitive et sans recours interne.

**Ce que ça change.** Le garde-fou n°4 est juridiquement fondé et non négociable. Le libellé du disclaimer doit nommer l'autorité compétente selon le stade, et non laisser croire que l'administrateur ou l'outil tranche. On évite d'écrire « quasi systématiquement » pour la consultation des finances en commission (elle y est facultative).

### 1.10 Volumes et délais réels : la contrainte qui justifie la densité

Délai limite de dépôt : **17 heures le troisième jour ouvrable** précédant l'examen, en commission (article 86) comme en séance (article 99). Les sous-amendements, les amendements du Gouvernement et de la commission échappent au délai. Sur les gros textes (budget, financement de la sécurité sociale), le dérouleur compte plusieurs milliers d'amendements ; pour le budget, la contrainte constitutionnelle est de 70 jours (article 47). Seul chiffre pleinement confirmé : environ 200 000 amendements déposés et 27 000 irrecevables sur la XVe législature.

**Ce que ça change.** L'interface doit absorber un afflux massif d'un coup après le délai limite : vue dense, filtres et recherche instantanés, tri par ordre d'appel, traitement au clavier. Les autres chiffres (7 %, PLF 2024, Sénat 2022-2023, 250 participants au hackathon) ne sont pas vérifiés : ils ne doivent **pas** apparaître dans l'interface.

### 1.11 Outils existants : parler la langue de l'Assemblée

Tout transite par **ELOI** (dépôt et instruction) ; **Eliasse** affiche les liasses par ordre d'appel sur tablette, avec les mentions « id » et « dc » ; la **feuille jaune** (dossier du Président) suit le sort en direct. L'open data expose pour chaque amendement le champ « sort ». Rien n'existe en production sur l'aide à la recevabilité : c'est exactement l'espace d'emendare.

**Ce que ça change.** On réutilise le vocabulaire existant (dérouleur, ordre d'appel, id, dc, tombé, non soutenu, feuille jaune) plutôt que d'inventer le nôtre : l'administrateur retrouve un objet mental connu. Le collecteur de données (hors périmètre v1) visera les flux et exports téléchargeables, pas une interface applicative distante inexistante côté Assemblée.

---

## 2. Recommandations par fonctionnalité

Chaque entrée donne : la recommandation, le composant DSFR réel (react-dsfr 1.32.4, vérifié dans le paquet installé), le comportement attendu, l'ancrage métier, la priorité, et les degrés de liberté laissés à l'implémenteur.

### A. Ajustements de la vue focus (existant)

**A1. Adoucir le rail gauche**
- **Recommandation.** Remplacer l'aplat `colors.background.actionHigh.blueFrance.default` par une décision de couleur plus claire (`background.alt.blueFrance.default` ou `background.contrast.blueFrance.default`), en conservant l'indicateur d'item actif et la prise de focus au clavier.
- **Composant DSFR.** Aucun nouveau ; jeu sur `fr.colors.decisions`.
- **Comportement.** Fond apaisé pour de longues sessions ; l'état actif reste identifiable (bordure ou fond de contraste).
- **Ancrage.** Fatigue visuelle sur plusieurs heures de tri (persona accessibilité, greffier).
- **Priorité.** P0 (trivial, gros gain de confort).
- **Degrés de liberté.** Le choix exact de la décision de couleur et du marqueur d'item actif, tant que le rapport de contraste des éléments d'interface reste conforme (au moins 3:1).

**A2. Élargir le bandeau droit**
- **Recommandation.** Passer la troisième colonne de `340px` à une valeur de l'ordre de `384px` (viser 380-400px), et garantir zéro défilement horizontal du corps de page : tout contenu large (tableau comparatif Légifrance, dispositif long) défile dans son propre conteneur (`overflow-x:auto`).
- **Composant DSFR.** Grille CSS existante ; conteneurs internes à défilement propre.
- **Comportement.** Les trois modules respirent ; jamais de débordement horizontal de la page.
- **Ancrage.** Trois modules trop serrés à 340px ; travail fréquent sur écran partagé ou portable.
- **Priorité.** P0 (trivial).
- **Degrés de liberté.** Largeur exacte dans la fourchette 380-400px ; réglage responsive éventuel sous un seuil d'écran.

### B. Vue d'ensemble et recherche (nouveau)

**B1. Barre de recherche**
- **Recommandation.** Champ unique permettant de sauter à un numéro, un auteur, un article ou une section, filtrage en mémoire sur les fixtures.
- **Composant DSFR.** `SearchBar` (rôle `search`), placé au-dessus de la vue d'ensemble, aligné avec les filtres.
- **Comportement.** Saisie filtrant la liste en direct ; un résultat unique peut ouvrir directement la vue focus.
- **Ancrage.** En séance, sauter à un amendement appelé hors séquence en une frappe (rapporteur, greffier).
- **Priorité.** P0.
- **Degrés de liberté.** Périmètre exact des champs interrogés ; correspondance exacte ou approchée ; ouverture automatique ou non sur résultat unique.

**B2. Vue d'ensemble (file de traitement)**
- **Recommandation.** Écran amont listant tous les amendements à traiter, une ligne par amendement ; la vue focus immersive actuelle devient le zoom d'un item. Colonnes : ordre d'appel, numéro, auteur/groupe, article visé, objet, signal article 40 (à deux niveaux), statut traité/non traité, sort proposé.
- **Composant DSFR.** `Table` avec `className="fr-table--sm"` (densité compacte) et `fr-table--bordered` ; colonne figée `fr-cell--fixed` à gauche portant un `Checkbox` de sélection par ligne ; en-têtes triables pilotés par l'état React (attribut `aria-sort`). `caption` obligatoire (masquable via `noCaption`).
- **Comportement.** Le tri, le filtrage, la sélection et la pagination sont gérés en état React (la liste triée/filtrée est réinjectée dans `data`), pas par le composant, qui est présentationnel. Un clic sur la ligne ouvre la vue focus.
- **Ancrage.** L'écran manquant : on ne traite pas des milliers d'amendements dans un navigateur mono-item.
- **Priorité.** P0.
- **Degrés de liberté.** Jeu exact de colonnes visibles et leur ordre ; comportement du clic (ligne entière ou action dédiée) ; densité par défaut (sm recommandé). Ne pas ajouter de bibliothèque de tableau tierce : `Table` DSFR plus état React suffit au volume des fixtures.

### Job 1 : ne pas se noyer dans le stock

**J1a. Filtres**
- **Recommandation.** Filtres par article, groupe politique, signal article 40 **scindé en deux niveaux** (charge / ressource), statut traité/non traité, étape (commission/séance). Rappel des filtres actifs et bouton de remise à zéro.
- **Composant DSFR.** `SelectNext` pour les filtres à choix unique (article, groupe, étape) ; `Checkbox` en `fieldset`/`legend` pour le multicritère ; `Tag` en variante bouton avec `pressed` pour les bascules rapides ; `Tag` `dismissible` (regroupés dans `TagsGroup`) pour les filtres actifs, avec un lien « Tout effacer ». Sur petit écran, regrouper dans un `Accordion` ou une modale.
- **Comportement.** Filtrage cumulatif en mémoire ; le filtre signal article 40 offre « charge » et « ressource » distinctement, car c'est le tri le plus discriminant du pré-examen.
- **Ancrage.** Reconstituer ses dossiers par article, isoler les points chauds (charge bloquante d'abord).
- **Priorité.** P0.
- **Degrés de liberté.** Disposition des filtres (barre, panneau latéral, accordéon) ; ensemble exact des facettes au-delà du minimum imposé.

**J1b. Tri par ordre d'appel (dérouleur)**
- **Recommandation.** Le tri par défaut et la navigation par flèches suivent l'**ordre d'appel** : par article, puis suppression avant modification (du général au particulier), puis du plus éloigné au plus proche du texte, avec priorité d'appel Gouvernement/commission. On stocke un entier `ordre_appel` précalculé par amendement (voir modèle de données) plutôt que de construire un moteur d'ordonnancement.
- **Composant DSFR.** En-têtes de `Table` triables (`aria-sort`) ; tri par défaut = `ordre_appel` croissant. La navigation `← →` de la vue focus itère sur la liste triée par ordre d'appel, pas sur l'index de dépôt.
- **Comportement.** Remplacer, dans `Cockpit.tsx`, la navigation par index brut par une navigation sur le tableau ordonné. Autres tris disponibles (numéro, article) en option.
- **Ancrage.** L'administrateur traite dans l'ordre où le président appellera ; c'est aussi cet ordre qui décide des « tombés ».
- **Priorité.** P0.
- **Degrés de liberté.** L'`ordre_appel` peut être un simple entier saisi dans la fixture (recommandé v1) ; un vrai calcul général → particulier n'est pas requis tant qu'il n'y a pas de moissonnage réel.

**J1c. Compteur de progression**
- **Recommandation.** Indicateur « X/Y traités, N irrecevables, reste à faire », **ventilé par gravité** : « N irrecevables dont X charge (définitif) et Y ressource (curable par gage) ».
- **Composant DSFR.** `Badge` `small` ou texte `fr-text--sm`, placé en tête de vue d'ensemble, dans une région `aria-live="polite"`.
- **Comportement.** Recalcul à chaque changement de filtre ou de statut ; annoncé aux lecteurs d'écran.
- **Ancrage.** Savoir en un coup d'œil si le dossier sera prêt avant la séance, et orienter le temps rare vers les blocages définitifs d'abord.
- **Priorité.** P0.
- **Degrés de liberté.** Forme visuelle (badges, ligne de texte, barre de progression DSFR) ; le statut « traité » est un état d'exécution (ensemble de numéros en mémoire), éventuellement pré-amorcé dans les fixtures pour la démonstration.

### Job 2 : traiter vite et sans se répéter

**J2a. Regroupement et discussion commune**
- **Recommandation.** Conserver le traitement groupé, mais **typer le regroupement** en deux régimes : identiques (« id », sort commun légitime en un geste) et discussion commune (« dc », rédactions concurrentes, votes et sorts séparés). Le sort commun par lot n'est autorisé **que** pour les identiques ; pour la discussion commune, on regroupe l'affichage mais chaque amendement garde son sort. Toute action par lot passe par une confirmation et un retour arrière immédiat.
- **Composant DSFR.** `ButtonsGroup` contextuel (barre d'actions apparaissant quand au moins une ligne est cochée) ; `Alert` `small` ou modale de confirmation ; badge « id » / « dc » sur les lignes concernées.
- **Comportement.** Sur un groupe « id », un geste applique le même sort à tout le groupe. Sur un groupe « dc », l'outil affiche le regroupement et la priorité d'appel, mais refuse le sort unique et invite à traiter chaque amendement.
- **Ancrage.** Appliquer un sort commun à une discussion commune est faux : ces amendements s'excluent et se votent séparément (greffier, président, junior, accessibilité, à l'unanimité).
- **Priorité.** P1.
- **Degrés de liberté.** Ergonomie exacte de la barre d'actions et de la confirmation ; présence ou non d'une case « tout sélectionner » d'en-tête. Simplification admise : si le typage id/dc n'est pas encore dans les données, n'activer le sort commun **pour personne** plutôt que de l'activer sur un regroupement ambigu.

**J2b. Navigation clavier étendue**
- **Recommandation.** Étendre l'écouteur clavier existant (`Cockpit.tsx`, qui gère déjà `← →` et ignore les frappes quand le focus est dans un champ de saisie) à la vue d'ensemble : haut/bas pour parcourir les lignes, une touche pour cocher/décocher, Entrée pour ouvrir la vue focus.
- **Composant DSFR.** Aucun (le DSFR fournit l'accessibilité clavier native des éléments ; les raccourcis de tri rapide relèvent du code applicatif). Conserver `fr-focus` visible et un ordre de tabulation logique.
- **Comportement.** Tout le tri se fait sans souris ; aucun piège clavier.
- **Ancrage.** L'administrateur est rapide au clavier et allergique aux clics inutiles.
- **Priorité.** P1.
- **Degrés de liberté.** Choix des touches (dans le respect du natif) ; roving tabindex ou non (arbitrage ergonomie/accessibilité à caler par un test au clavier et au lecteur d'écran).

### Job 3 : rester cohérent

**J3a. Alerte de cohérence**
- **Recommandation.** Signaler qu'un amendement **formellement identique** a déjà reçu un sort, sur la base d'une **identité stricte** (regroupement « id »), pas d'une simple proximité sémantique. Rappeler que « tombé » ou « non soutenu » n'est pas un jugement au fond.
- **Composant DSFR.** `Alert` `small` (severity `info` ou `warning`) ou `Badge` dans la vue focus et sur la ligne concernée.
- **Comportement.** L'alerte n'infère un sort déjà rendu que sur des identiques vrais ; elle n'aligne jamais des sorts sur des amendements seulement voisins.
- **Ancrage.** La cohérence est ce que le rapporteur défend au banc ; un faux positif ruinerait sa crédibilité.
- **Priorité.** P1.
- **Degrés de liberté.** Seuil et forme de l'alerte ; place exacte (bandeau, ligne, module).

**J3b. Précédents consultables**
- **Recommandation.** Conserver la capacité, mais l'**implémenter à l'intérieur du module Similaires (E4)**, pas comme second écran. Les quatre personas la jugent redondante en module distinct ; on ne la coupe pas, on la **fond** dans Similaires en enrichissant chaque entrée (sort réel, stade, lecture).
- **Composant DSFR.** Aucun nouveau ; enrichissement de la liste Similaires existante.
- **Comportement.** Depuis Similaires, l'administrateur voit le sort historique et son stade ; pas d'onglet ni de navigation supplémentaire.
- **Ancrage.** Deux portes vers la même information alourdissent l'interface sans service ajouté.
- **Priorité.** P1.
- **Degrés de liberté.** Niveau de détail affiché par entrée ; tri des précédents (par ressemblance ou par date). C'est la simplification demandée : fusion, jamais suppression.

### Job 4 : produire le livrable

**J4a. Export**
- **Recommandation.** Produire la sortie qui alimente la navette : liste des **irrecevables avec motifs** (que le président notifie aux auteurs) et **dérouleur annoté**. Chaque motif porte le vocabulaire statutaire exact et la **citation du fondement réglementaire** (article 89 pour l'article 40 et l'organique, 93 pour l'article 41, 98 pour le lien, 100 pour l'ordre d'appel) ; pour l'article 45, la règle applicable selon la lecture en cours. Prévoir un emplacement pour un court argumentaire.
- **Composant DSFR.** Aucun composant d'export dans le DSFR : génération côté client (fichier CSV via `Blob`, ou vue imprimable formatée déclenchée par impression navigateur). Un `Button` déclenche l'export.
- **Comportement.** L'export reflète l'ordre d'appel et les décisions loguées ; il est défendable tel quel (motif motivé au bon fondement, non paraphrasé).
- **Ancrage.** C'est LE livrable métier, notifié par le président et versé à la navette. Sans lui, le poste de travail n'a pas de sortie.
- **Priorité.** P0.
- **Degrés de liberté.** Format (CSV, impression, ou les deux) ; colonnes exactes du dérouleur annoté ; présence d'un champ argumentaire libre. Simplification admise : un CSV des irrecevables suffit à la v1 ; la mise en page imprimable est un plus.

### E. Existant à préserver

**E1. Accueil deux entrées**
- **Recommandation.** Conserver l'accueil à deux chemins (Administrateur actif, Député grisé phase 2) et le bloc-marque `République Française / Assemblée nationale` réservé à l'État.
- **Composant DSFR.** En-tête DSFR (bloc-marque), `Tile` ou `Card` pour les deux chemins, le second désactivé.
- **Comportement.** Inchangé.
- **Ancrage.** Cadre institutionnel ; l'usage du bloc-marque est réservé à l'État.
- **Priorité.** P0 (déjà livré, à préserver).
- **Degrés de liberté.** Aucun sur le bloc-marque ; libre sur la présentation des deux chemins.

**E2. En-tête navigateur**
- **Recommandation.** Conserver l'en-tête (flèches, numéro, objet, position n/N) et la navigation clavier, en la **branchant sur l'ordre d'appel** (voir J1b) et non plus sur l'index de dépôt.
- **Composant DSFR.** `Button` `tertiary` pour les flèches (existant).
- **Comportement.** La position n/N reflète le rang dans le dérouleur.
- **Ancrage.** Objet mental de type navigateur, déjà maîtrisé, aligné sur la feuille jaune.
- **Priorité.** P0.
- **Degrés de liberté.** Affichage complémentaire (rang dérouleur, mention id/dc) laissé libre.

**E3. Amendement au centre et signaux article 40**
- **Recommandation.** Conserver l'exposé, le dispositif, le surlignage des mots signalant l'article 40 (infobulle au survol) et les passages rectifiés (détail avant/après au clic). **Refonte de la hiérarchie de gravité** : le surlignage « charge » passe en décision de couleur bloquante (`error`, mention « non gageable, irrecevabilité définitive »), le surlignage « ressource » reste en `warning` (mention « curable par un gage valable »). Ne jamais coder l'information par la seule couleur : ajouter un libellé texte et une forme ou une icône.
- **Composant DSFR.** `Tooltip` (existant) ; `mark` stylé par les décisions de couleur DSFR ; `Badge` de gravité au besoin.
- **Comportement.** Le composant `Segments` lit désormais la gravité (à porter par le segment ou par `signaux_recevabilite.article_40`) et applique la bonne décision de couleur.
- **Ancrage.** La dissymétrie pluriel/singulier commande tout le régime ; confondre les deux fait sur-alerter sur des pertes gageables et sous-estimer les charges.
- **Priorité.** P0.
- **Degrés de liberté.** Forme exacte du marqueur (bordure, icône, badge) ; où porter la gravité dans le modèle (segment ou signal). Contrainte non négociable : information non portée par la couleur seule (RGAA).

**E4. Bandeau droit : trois modules**
- **Recommandation.** Conserver Légifrance (avant/après, bouton agrandir en hauteur), Similaires et Préconisation. Enrichissements :
  - **Similaires** : afficher le **stade** du sort (commission/séance, lecture) et distinguer visuellement tombé/non soutenu d'un rejet ; y **fondre les précédents** (J3b).
  - **Préconisation** : conditionner le pré-sort à la **lecture en cours** (article 45) et intégrer le **résultat du gage** (article 40 ressource). Conserver le badge « indicatif · IA » et le rappel du garde-fou.
- **Composant DSFR.** `Badge` `severity small noIcon` (le composant `SortBadge` existe déjà et applique adopté→`success`, rejeté/irrecevable→`error`, reste→neutre) ; `Badge` « indicatif · IA » `info`.
- **Comportement.** La préconisation raisonne sur le groupe en discussion commune (priorité d'appel, risque de tomber), pas sur l'amendement isolé.
- **Ancrage.** Un sort « tombé » n'est pas un rejet politique ; une préconisation aveugle à la lecture ou au gage est fausse en navette.
- **Priorité.** P0 pour la refonte gravité et le stade ; P1 pour l'affichage du gage et de la lecture.
- **Degrés de liberté.** Le **pourcentage de confiance** : le rapporteur le juge indéfendable au banc (le taux d'irrecevabilité article 40 varie de 16 % à 7 % selon la période). On conserve la fonctionnalité (charte E4), mais l'implémenteur peut la rendre par un **niveau qualitatif** (« signal fort » / « à vérifier ») en plus ou à la place du chiffre brut. Même liberté pour le pourcentage de ressemblance des Similaires : bande qualitative (identique / proche / voisin) admise. Ne jamais présenter ces chiffres comme une précision garantie.

**E5. Décision humaine loguée**
- **Recommandation.** Conserver les actions Recevable / Irrecevable, le motif obligatoire si défavorable, les sous-types de motif et le pré-motif éditable. Compléter les étiquettes de motif (voir Ajouts) et **pré-remplir avec le vocabulaire statutaire exact plus le fondement réglementaire**. Conserver « autre sort » comme échappatoire léger (retiré/tombé/non soutenu se constatent), sans en faire la palette de vote de séance.
- **Composant DSFR.** `Button` (existant) ; `Input` en mode zone de texte pour le motif (préférable au `textarea` brut actuel) ; étiquettes de motif en `Tag` `pressed` (plus accessible que les boutons `fr-badge` actuels) ; `Alert` `success` pour la confirmation de log.
- **Comportement.** La décision reste humaine et loguée (console/état en v1) ; le motif reprend les termes consacrés et cite l'article.
- **Ancrage.** La décision étant définitive et sans recours, un motif approximatif la fragilise. Frontière instruction/vote : l'écran d'instruction produit recevable/irrecevable avec motif, pas les sorts de vote.
- **Priorité.** P0.
- **Degrés de liberté.** Le greffier voudrait retirer la palette de sorts de vote, le rapporteur ajouter un avis de fond : arbitrage tranché ici en gardant « autre sort » **discret** (un `SelectNext` secondaire) sans le promouvoir, et en renvoyant l'avis de fond au P2. L'implémenteur peut choisir le composant exact du motif et l'ordre des étiquettes.

### Ajouts justifiés par les personas et retenus

**Aj1. Détection et qualification du gage (article 40, branche ressource)**
- **Recommandation.** Champ métier `gage` (présent / absent / insuffisant) par amendement, qualifiant la solidité du gage. Un signal ressource sans gage valable bascule en irrecevabilité probable ; avec un gage certain et intégral, il redevient recevable. En v1 statique, c'est un **champ de fixture**, pas un analyseur de texte.
- **Composant DSFR.** Ligne d'information dans les modules Préconisation et centre (`Badge` ou texte `fr-text--sm`).
- **Comportement.** Le pré-tri financier lit `article_40` puis `gage` pour décider entre « attention » et « probable irrecevabilité ».
- **Ancrage.** Vrai discriminant du pré-tri financier, réclamé à l'unanimité des quatre personas métier, aujourd'hui absent.
- **Priorité.** P0 (le champ et la logique) ; l'affichage riche peut suivre en P1.
- **Degrés de liberté.** Vocabulaire des états ; repérage éventuel des formules types (« à due concurrence », gage tabac, dotation globale de fonctionnement) laissé optionnel. Ne pas tenter d'analyse textuelle réelle en v1 (sur-ingénierie).

**Aj2. Paramètre « lecture en cours »**
- **Recommandation.** Sélecteur en tête de dossier : première lecture / lectures ultérieures, alimentant la règle de l'article 45 (lien indirect contre entonnoir).
- **Composant DSFR.** `SegmentedControl` (ou `SelectNext`) dans l'en-tête, valeur par défaut « première lecture ».
- **Comportement.** La préconisation de lien et l'étiquette de motif article 45 basculent selon la lecture.
- **Ancrage.** Sans la lecture, la préconisation article 45 est fausse dès l'entrée en navette.
- **Priorité.** P1.
- **Degrés de liberté.** Granularité (dossier entier ou par amendement) ; en v1, un réglage au niveau dossier suffit. Le périmètre fin des « dispositions restant en discussion » est différable en P2.

**Aj3. Étiquette IRR-41 et scission d'IRR-45**
- **Recommandation.** Ajouter `IRR-41` (hors domaine de la loi ou contraire à une délégation de l'article 38) et scinder `IRR-45 cavalier` (première lecture) et `IRR-45 entonnoir` (lectures ultérieures). IRR-41 est présentée comme alerte à faible probabilité, non comme filtre de routine.
- **Composant DSFR.** `Tag` (étiquettes de motif dans l'écran de décision).
- **Comportement.** Motifs juridiquement distincts, chacun rattaché à sa base réglementaire.
- **Ancrage.** Complétude des motifs ; le motif exact conditionne la validité de la décision.
- **Priorité.** P1.
- **Degrés de liberté.** Regroupement visuel des étiquettes (article 40, article 45, autres) pour éviter la surcharge ; IRR-41 peut être reléguée dans un second groupe « motifs rares ».

**Aj4. Garde anti-faux-positifs de l'article 40**
- **Recommandation.** Signaler explicitement qu'une simple charge de gestion ou une demande de rapport reste recevable (« hors champ de l'article 40 »), au lieu d'un silence.
- **Composant DSFR.** Ligne d'explication sous les signaux (`fr-text--sm`), éventuellement `Badge` neutre.
- **Comportement.** Empêche le junior de sur-signaler par excès.
- **Ancrage.** Travers documenté du profil junior.
- **Priorité.** P1.
- **Degrés de liberté.** Champ de fixture booléen ou énuméré ; formulation du message.

**Aj5. Justification sourcée et fondement réglementaire sous chaque signal**
- **Recommandation.** Une phrase courte expliquant pourquoi le signal est levé, avec renvoi à la règle (article 40 charge/ressource, article 45 lien/entonnoir, plafond de mission LOLF, objectif de dépenses par branche ou ONDAM LFSS). Le motif notifié cite l'article du Règlement.
- **Composant DSFR.** Texte `fr-text--sm` sous les signaux ; réutilise le champ `justification` déjà présent, enrichi d'un `fondement`.
- **Comportement.** Le junior comprend le signal pour se l'approprier et le porter devant le président.
- **Ancrage.** La notification doit reprendre le vocabulaire consacré ; un motif nu ne se défend pas.
- **Priorité.** P1.
- **Degrés de liberté.** Longueur de la justification ; forme du renvoi (texte ou lien).

**Aj6. Deux sorts et stade dans Similaires**
- **Recommandation.** Chaque entrée Similaires porte le stade (commission/séance) et la lecture où le sort a été prononcé.
- **Composant DSFR.** Mention `fr-text--xs` à côté du `SortBadge`.
- **Comportement.** Lève l'ambiguïté d'un amendement adopté en commission puis tombé en séance.
- **Ancrage.** Un seul « sort réel » sans stade est trompeur.
- **Priorité.** P1.
- **Degrés de liberté.** Format de la mention.

**Aj7. Accessibilité (RGAA, non négociable)**
- **Recommandation.** Région `aria-live="polite"` pour le compteur de progression et le volume filtré ; restauration du focus sur la ligne d'origine au retour de la vue focus vers la liste ; information jamais portée par la seule couleur (badges de sort et signaux : libellé plus forme) ; confirmation et annulation immédiate de toute action par lot.
- **Composant DSFR.** Attributs ARIA sur les régions dynamiques ; gestion de focus en React ; `Alert` ou modale de confirmation.
- **Comportement.** Tri utilisable au clavier et au lecteur d'écran ; aucun geste massif irréversible.
- **Ancrage.** Exigences RGAA pour un tri à fort volume au clavier.
- **Priorité.** P0 pour aria-live et information hors couleur ; P1 pour la restauration de focus et la confirmation par lot.
- **Degrés de liberté.** Mécanique exacte de restauration du focus ; forme de la confirmation. Ces exigences ne se simplifient jamais.

**Aj8. Anticipation des « tombés » et chaîne de portée**
- **Recommandation.** Relier les amendements d'une même disposition par une chaîne de portée (article > alinéa > phrase > mots) et signaler, pour chacun, ceux qu'il ferait tomber s'il était adopté.
- **Composant DSFR.** Mention dans la vue focus ; éventuel repère dans la vue d'ensemble.
- **Comportement.** Le rapporteur ne prépare pas d'avis sur des amendements qui ne seront jamais appelés.
- **Ancrage.** Besoin réel sur les gros textes ; marqué `reste_minimal=false` par le rapporteur lui-même.
- **Priorité.** P2 (suppose un moteur d'ordre d'appel plus une détection de concurrence, lourd pour une v1 statique).
- **Degrés de liberté.** Entièrement différable ; si amorcé, se limiter à une chaîne précalculée dans la fixture.

**Aj9. Champ « avis du rapporteur »**
- **Recommandation.** Colonne ou champ d'avis de fond (favorable, défavorable, sagesse, demande de retrait, satisfait) avec bref argumentaire, distinct de la recevabilité.
- **Composant DSFR.** `SelectNext` plus `Input` texte, dans une couche séparée.
- **Comportement.** Complète le dérouleur annoté avec ce que le rapporteur dira au banc.
- **Ancrage.** L'outil trace la recevabilité (geste de l'administrateur) ; l'avis de fond est le geste du rapporteur.
- **Priorité.** P2 (greffe un second métier ; risque de dilution du périmètre v1).
- **Degrés de liberté.** Entièrement différable ; à n'ouvrir qu'après validation du périmètre.

**Aj10. Ré-évaluation de la recevabilité au fil de la navette (mode suivi)**
- **Recommandation.** Permettre de ré-opposer ou lever un signal à chaque lecture (l'irrecevabilité est opposable à tout moment).
- **Composant DSFR.** À définir avec le mode suivi.
- **Comportement.** Ne fige pas le tri au premier dépôt.
- **Ancrage.** Mécanisme réel de la navette.
- **Priorité.** P2 (explicitement hors périmètre v1, phase 2).
- **Degrés de liberté.** Entièrement différable.

---

## 3. Principe directeur transversal

**L'outil instruit, ordonne et signale ; il ne tranche jamais.** Toute la valeur tient à trois exigences : épouser le geste réel (ordre d'appel du dérouleur, hiérarchie de gravité charge puis ressource, distinction identiques/discussion commune, stade de lecture), parler le vocabulaire exact de l'Assemblée, et rappeler à chaque écran que la recevabilité appartient à l'autorité compétente (président de la commission saisie au fond en commission, Président de l'Assemblée en séance), jamais à l'administrateur ni à l'IA. Le garde-fou n°4 est le socle : signaux indicatifs, décision humaine, système qui logue.

**Minimalisme et hiérarchie visuelle.** Composants DSFR avant tout style sur mesure ; on ne reconstruit pas un tableau maison quand `Table` plus état React suffit ; on n'ajoute aucune bibliothèque tierce pour ce que quelques lignes couvrent. Un signal doit être compréhensible d'un coup d'œil. La gravité prime la complétude : la charge bloquante ressort avant tout, la ressource curable au second plan, l'article 41 en alerte discrète. On évite l'empilement d'explications sous chaque signal (une justification courte suffit) et la multiplication anarchique d'étiquettes (regroupées par article).

**Couleurs et jetons DSFR.** Décisions de couleur uniquement (`fr.colors.decisions`), zéro valeur hexadécimale ; typographies Marianne et Spectral ; thèmes clair et sombre pilotés par les jetons. La sémantique des couleurs : `error` pour la charge (bloquant) et pour rejeté/irrecevable ; `warning` pour la ressource (attention) ; `success` pour adopté et recevable ; neutre pour retiré/tombé/non soutenu (ni jugement de fond, ni erreur) ; `info` pour les passages rectifiés et le badge « indicatif · IA ».

**Charte Assemblée nationale.** Bloc-marque `République Française / Assemblée nationale` réservé à l'État. Réutilisation du lexique métier (dérouleur, ordre d'appel, feuille jaune, id, dc, tombé, non soutenu, recevable, irrecevable) plutôt qu'un vocabulaire inventé. Aucun chiffre non vérifié dans l'interface : seul le volume confirmé de la XVe législature peut être cité, et jamais comme donnée temps réel.

**RGAA.** Information jamais portée par la seule couleur ; régions dynamiques annoncées (`aria-live`) ; focus visible, ordre de tabulation logique, aucun piège clavier ; restauration du focus au retour de la vue focus ; `caption` de tableau et libellés de cases de sélection ; contrastes conformes (au moins 3:1 pour les éléments d'interface). Ces exigences ne se simplifient jamais.

---

## 4. Modèle de données (fixtures statiques, alignées e7, sans serveur)

Extensions à `apps/web/src/data/fixtures.ts`. Tout est statique ; le statut de traitement est un état d'exécution (ensemble de numéros), éventuellement pré-amorcé pour la démonstration. On précalcule ce qui coûterait un moteur (ordre d'appel, chaîne de portée) plutôt que de le dériver.

**Sur le type `Amendement` :**

| Champ | Type | Rôle | Priorité |
|---|---|---|---|
| `ordre_appel` | `number` | Rang dans le dérouleur ; pilote le tri par défaut et la navigation `← →` (remplace l'index de dépôt). Entier saisi à la main en v1. | P0 |
| `lecture` | `"premiere" \| "ulterieure"` | Alimente la règle de l'article 45 ; peut vivre au niveau dossier (constante partagée) plutôt que par amendement. | P1 |
| `regroupement` | `{ type: "id" \| "dc"; cle: string }` (optionnel) | Type le regroupement ; `cle` relie les membres d'un même groupe. Remplace le vague `regroupement_sujet`. Le sort commun n'est légitime que si `type === "id"`. | P1 |
| `gage` | `"present" \| "absent" \| "insuffisant"` (optionnel) | Discriminant de l'article 40 branche ressource ; pertinent quand `article_40 === "signal_ressource"`. | P0 |
| `hors_champ_40` | `"charge_de_gestion" \| "demande_de_rapport"` (optionnel) | Garde anti-faux-positifs ; justifie l'absence de signal malgré des verbes de dépense apparents. | P1 |
| `type_amendement` | `"suppression" \| "reecriture" \| "insertion" \| "modification"` (optionnel) | Justifie l'ordre d'appel et l'anticipation des tombés. | P2 |
| `portee` | `"article" \| "alinea" \| "phrase" \| "mots"` (optionnel) | Chaîne de portée pour l'anticipation des tombés. | P2 |

**Sur `signaux_recevabilite` :** ajouter un champ `fondement?: string` (par exemple `"art. 40 C, art. 89 RAN"`) pour la citation dans le motif notifié. La valeur `article_45` reste `lien_direct | lien_indirect | lien_absent` ; son interprétation dépend de `lecture` (calcul dans l'interface, pas dans la donnée).

**Sur `Similaire` :** ajouter `stade?: "commission" \| "seance"`, `lecture?: "premiere" \| "ulterieure"`, et `identique?: boolean` (identité formelle stricte, pour l'alerte de cohérence J3a, distincte de la ressemblance sémantique). Le champ `sort` et les six valeurs de `SortReel` restent inchangés ; ne pas inventer de variantes (« retiré avant séance », etc.) tant que le schéma open data réel n'est pas confirmé.

**Sur `MOTIF_TYPES` :** étendre à
`["IRR-40 charge", "IRR-40 ressource", "IRR-45 cavalier", "IRR-45 entonnoir", "IRR-41", "IRR LOLF", "IRR LFSS"]`,
et ajouter deux tables constantes :
- `MOTIF_GRAVITE` : `"IRR-40 charge" → "bloquant"`, les autres → `"attention"`.
- `MOTIF_FONDEMENT` : chaque motif vers sa base (article du Règlement plus base constitutionnelle ou organique), pour pré-remplir la citation.

**Sur `Preconisation` :** conserver `confiance: number`, ajouter `niveau?: "signal_fort" \| "a_verifier"` (rendu qualitatif optionnel, cf. E4). L'affichage peut préférer `niveau` au chiffre.

**Progression (état d'exécution, pas fixture) :** un ensemble de numéros traités ; le compteur ventile les irrecevables par gravité en croisant les décisions loguées et `MOTIF_GRAVITE`.

**Corrections de contenu à passer dans les fixtures et libellés :** remplacer toute mention LFSS « sous-objectif » par « objectif de dépenses par branche ou ONDAM » ; ne pas afficher de volumes non vérifiés ; ne pas s'appuyer sur un comportement JavaScript natif du DSFR pour la sélection de ligne (gérer la sélection par `Checkbox` contrôlés en React).

---

## 5. Checklist finale ordonnée (brief de passation)

### P0 - indispensable au premier parcours complet
1. **A1** Adoucir le rail gauche (décision de couleur claire, item actif contrasté).
2. **A2** Élargir le bandeau droit à environ 384px ; zéro défilement horizontal de page (conteneurs à défilement propre).
3. **B2** Vue d'ensemble : `Table` `fr-table--sm` bordé, colonne figée `fr-cell--fixed` avec `Checkbox`, en-têtes triables (`aria-sort`), `caption` obligatoire ; la vue focus devient le zoom d'un item.
4. **B1** Recherche : `SearchBar`, filtrage en mémoire (numéro, auteur, article, section).
5. **J1b** Tri et navigation par **ordre d'appel** : ajouter `ordre_appel`, brancher `← →` et le tri par défaut dessus (remplacer l'index de dépôt dans `Cockpit.tsx`).
6. **J1a** Filtres : `SelectNext` (article, groupe, étape), `Checkbox`/`fieldset` (multicritère), `Tag pressed` (bascules), `TagsGroup` `dismissible` plus « Tout effacer » ; filtre signal article 40 **scindé charge/ressource**.
7. **J1c** Compteur de progression en `aria-live="polite"`, irrecevables ventilés charge/ressource.
8. **E3** Deux gravités de l'article 40 : charge en `error` bloquant, ressource en `warning` attention ; information jamais portée par la seule couleur (libellé plus forme).
9. **Aj1** Champ `gage` (présent/absent/insuffisant) et logique de bascule ressource vers irrecevabilité probable.
10. **E4** Refonte gravité dans Préconisation et Similaires ; stade du sort dans Similaires.
11. **E5** Décision loguée, motif obligatoire si défavorable, pré-motif éditable au vocabulaire exact ; `Input` zone de texte, étiquettes en `Tag pressed`.
12. **J4a** Export des irrecevables plus motifs et fondement, et dérouleur annoté (CSV côté client au minimum).
13. **Aj7 (part)** Accessibilité socle : `aria-live` sur les compteurs, information hors couleur seule.
14. **E1, E2** Préservés ; E2 rebranché sur l'ordre d'appel.

### P1 - justesse juridique et confort en volume
15. **Aj2** Sélecteur « lecture en cours » (`SegmentedControl`) conditionnant l'article 45.
16. **Aj3** Étiquettes IRR-41 et scission IRR-45 cavalier/entonnoir ; regroupement visuel par article ; IRR-41 en alerte discrète.
17. **Aj4** Garde anti-faux-positifs article 40 (charge de gestion, demande de rapport « hors champ »).
18. **Aj5** Justification sourcée et fondement réglementaire sous chaque signal et dans le motif.
19. **Aj6** Stade et lecture du sort dans Similaires (deux sorts distincts).
20. **J2a** Regroupement typé id/dc ; sort commun réservé aux identiques ; `ButtonsGroup` contextuel, confirmation et annulation.
21. **J2b** Navigation clavier étendue en vue d'ensemble (haut/bas, sélection, Entrée).
22. **J3a** Alerte de cohérence sur identité formelle stricte.
23. **J3b** Précédents fondus dans le module Similaires (pas de second écran).
24. **Aj7 (part)** Restauration du focus au retour de la vue focus ; confirmation et annulation des actions par lot.
25. **Corrections de contenu** : vocabulaire LFSS (ONDAM), retrait de tout chiffre non vérifié, sélection de ligne en React contrôlé.
26. **Pagination** (`Pagination`) à activer seulement si le volume réel l'impose (inutile sur quatre fixtures).

### P2 - différable (phase 2 ou après retour terrain)
27. **Aj8** Anticipation des « tombés » et chaîne de portée (`type_amendement`, `portee`).
28. **Aj9** Champ « avis du rapporteur » (couche de fond distincte de la recevabilité).
29. **Aj10** Ré-évaluation de la recevabilité au fil de la navette (mode suivi).
30. **E4 (option)** Rendu qualitatif de la confiance et de la ressemblance (bande plutôt que pourcentage brut) - décision d'implémentation, activable à tout moment.

### Charte non négociable (transversale, à tous les niveaux)
- DSFR via `@codegouvfr/react-dsfr` 1.32.4 ; décisions de couleur uniquement (zéro hexadécimal) ; Marianne et Spectral ; thèmes clair et sombre par jetons.
- RGAA : information hors couleur seule, `aria-live`, focus visible et restauré, `caption` de tableau, contrastes conformes.
- Bloc-marque réservé à l'État.
- Garde-fou n°4 : signaux strictement indicatifs, décision humaine loguée, disclaimer nommant l'autorité compétente selon le stade. L'outil pré-trie, ordonne et signale ; il ne juge pas.
---

## 6. Addendum autoritaire : slides du hackathon AN et API de similarite reelle

Ces cinq points proviennent de sources arrivees apres la recherche web : les slides officielles du
hackathon (repo `data/`, distillees dans `docs/metier/regles-recevabilite-hackathon-AN.md`) et le
smoke-test de l API de similarite. Ils priment sur la recherche web et modifient des recommandations
precises du rapport ci-dessus (identifiees par leur code).

### AD1. Lexique article 40 exact (modifie E3, Aj1, Aj5) - P0

Le surlignage des mots signalant l article 40 (E3) doit etre pilote par le **lexique reel des
administrateurs**, pas par une liste inventee. Source : `docs/metier/lexique-art40.ts`. Familles :
Finances (Financement, Financer, Financier) ; Subvention (Dotation, Allocation, Prime) ;
Accompagnement (Soutien, Prise en charge, Contribution) ; Contrat (Convention, Contractualisation) ;
Verser (Affecter, Transferer) ; Investissement ; Ressources. Liste d exemples, **editable** par les
administrateurs (issue #2), donc externalisee en donnee, jamais codee en dur dans un composant.
Portee metier : le lexique repere le **soupcon** (presence du mot) ; la qualification charge /
ressource / gage (Aj1) et la decision restent humaines. Cela respecte le garde-fou : l outil attire
l oeil, il ne juge pas.

### AD2. Precedents : trois degres de recherche (enrichit B, J3b, E4, Aj6) - P1

Le module Similaires / Precedents n est pas une simple liste : c est une recherche a **portee
reglable**, telle que les administrateurs la decrivent :
- **Degre 1** - meme texte a travers commission, seance et lectures successives, plus les textes
  adoptes (AN, Senat). C est la chaine des versions d un meme texte.
- **Degre 2** - textes similaires **cibles, choisis par l administrateur** (PLF et PLFSS successifs,
  textes thematiquement proches).
- **Degre 3** - tout l historique.
- **Regle transversale** : a chaque fois, signaler quand la base de reference (droit propose en
  discussion, ou droit existant) a evolue.
Implementation : un selecteur de portee (`SegmentedControl`) au-dessus du module Similaires, valeur
par defaut degre 2. En v1, les degres peuvent se limiter a un filtrage de la source disponible.

### AD3. API de similarite REELLE (modifie E4, Aj6, J3b, modele de donnees) - P0/P1

La similarite n est plus factice : le back-end `apps/api` expose une recherche vectorielle
operationnelle (OpenRouter embeddings plus pgvector), verifiee par smoke-test le 2026-07-03 :
- `GET /amendments/:id/similar` : quasi-duplications a 95-99,6 % sur le meme article (sert les degres
  2 et 3 pour un amendement donne).
- `POST /amendments/similar` (paraphrase libre) : proximite thematique a environ 62 % (alimente une
  recherche semantique, complement de la barre de recherche B1).
- `GET /ingestion/status` : etat du backfill (295/300 vectorises).
Consequences :
1. Le pourcentage de ressemblance du module Similaires (E4) devient **reel**. On conserve l option
   d affichage en bande qualitative (identique / proche / voisin) recommandee en E4, mais elle
   s appuie desormais sur un vrai score.
2. Seuil metier : distinguer la **quasi-duplication** (superieure a 90 %, qui releve du regime
   identiques / discussion commune de J2a) de la **proximite thematique** (environ 60 %, simple
   inspiration d un precedent). Le geste differe, l affichage doit le refleter.
3. Degre de liberte de perimetre : la v1 etait posee comme statique. L API etant prete et a faible
   risque, l implementeur **peut** brancher le module Similaires sur `GET /amendments/:id/similar`
   (recommande) et laisser le reste en fixtures. S il prefere garder un run 100 % front, il enrichit
   les fixtures `Similaire` (champ score reel simule). Dans les deux cas, distinguer clairement dans
   le code ce qui est branche sur l API de ce qui est statique.

### AD4. Fast-track des cas evidents (precise E5, Preconisation, compteur) - P1

Les slides posent deux exigences conjointes : **controle humain obligatoire sur chaque amendement**,
mais **utilite moindre voire redondance pour les cas dont l irrecevabilite ou la recevabilite est
evidente**. Traduction produit : l outil propose un **traitement rapide** des cas evidents (haute
confiance, signal fort) - validation du pre-sort en un geste - sans jamais retirer le geste humain,
et met en avant les cas **ambigus** (faible confiance) pour une revue approfondie. Le compteur de
progression (J1c) peut distinguer les cas evidents restants des cas a instruire. C est le levier de
vitesse principal sur un stock de plusieurs milliers d amendements, dans le respect strict du
garde-fou.

### AD5. Methode de proposition de sort (confirme le mapping du rapport)

Les slides confirment la structure : analyser au regard de (a) **regles** = article 40, lois
organiques LF et LFSS, rapports des presidents de la commission des finances (module Preconisation) ;
(b) **base de reference** = droit existant Legifrance et droit propose en discussion (module
Legifrance plus mark-change avant / apres) ; (c) **precedents** (module Similaires). Motifs types
reels a placer dans les pre-motifs : « creation d une allocation versee par l Etat », « diminution
non gagee du taux de la TVA ». Aucun changement de structure, confirmation.

---

## 7. Sources

- Recherche web verifiee (8 facettes, verification adversariale par facette) et 5 personas d usage :
  workflow `w9p0y265i`, 2026-07-03 (journal des agents conserve dans le repertoire de session).
- Slides du hackathon Assemblee nationale : `data/`, distillees dans
  `docs/metier/regles-recevabilite-hackathon-AN.md` et `docs/metier/lexique-art40.ts`.
- API de similarite : smoke-test `apps/api` du 2026-07-03.
- Etat du produit : `apps/web/src/app/administrateur/Cockpit.tsx`, `apps/web/src/data/fixtures.ts`,
  `docs/specs/2026-07-03-cockpit-admin-v1.md`, ADR 0009 et 0010 de `docs/decisions.md`.
