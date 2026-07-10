# Objectif de l'application
L'application à vocation à simplifier la vie des administrateurs de l'assemblée nationale française dans le cadre du traitement de leurs amendements.

"Le cockpit de l'administrateur de l'assemblée"


L'applications est adressable via deux entrées : 
1. Députés 
2. Administrateurs

# Députés
Les députés peuvent utiliser l'application pour tester la fiabilité de leur amendement savoir s'il peut déjà être refusé ou pas et les éventuelles raisons du refus

# Administrateurs
Les administrateurs utilisent l'application pour étudier chaque amendement

L'enjeux pour eux est de déterminer la recevabilité de chaque amendement.

Pour se faire, ils sélectionnent un amendement --> ici il faut déterminer est-ce qu'il rentre un numéro et ça va scrapper ou est-ce qu'il upload un document (les deux sont possibles) on peut aussi imaginer un profil et il a des amendements qui lui sont affectés (phase 2)

Dès qu'un amendement est selectionné il y a un traitement :

(i) l'amendement est analysé et les mots clefs ou risqués sont immédiatements identifiés et mis en rouge ou surligné --> soit base de données de mots clefs (selon contexte : culture, budget, etc) --> soit via analyse llm (agent : amendement reviewer) 
(ii) ensuite dans le contexte il y a le texte de loi qui est concerné qui apparait en haut à droite et tu peux l'afficher et ça te révèle en mark change le texte qui est modifié par l'amendement avec le avant/après et la capacité à se déplacer dans le texte
(iii) en dessous on retrouve la liste des amendements similaires classifiés par % de ressemblance
(iv) en bas à droite on a le sort : recevable ou irrecevable avec le % de confiance 

Pour le (iv) : 
il faut identifier les article 40/41/38/45 de la fiche 51 (?) et les appliquer pour déterminer la recevabilité de l'amendement. puis ça peut être irrecevable (IRR) pour les raisons : IRR LFSS, IRR LOF, IRR, etc.
quand irrecevable il faut écrire un petit texte qui justifie l'irrecevabilité de l'amendement


# stack
- PostgresSQL
- pgvector
- redis (?) -- pour gérer les worker async?
- Nextjs 
- typescript 
- nestjs 
- prisma 
- postgresql 
- docker 
- gitea action


# pour plus tard
Avez-vous déjà un corpus d’amendements passés avec leur sort pour entraîner/calibrer la similarité et les scores ?
-> possible mais nécessite de rassembler beaucoup de données

Les règles 40/41/38/45 doivent-elles être codées strictement à la main avec un expert métier, ou veux-tu une première version heuristique rapidement ?

-> ça sera à faire mais très chronophrage pour la v2

Y a-t-il une contrainte de souveraineté / hébergement France / pas de données vers API externes ?
oui mais pas pour l'instant

# concrètement : 

(i) un harvester qui récupère via les données publiques les historiques des amendements de l'assemblée
(ii) un harvester qui récupère légifrance pour identifier les textes de lois -> peut être mieux de l'adresser via API qu'historiser tout legifrance et bosser par delta?
(iii) un crate api qui récupère les amendements spécifiques 



# Amendement :
(i) vérifier l'historique autour de cet amendement (amendement similaire, etc.)
(ii) vérifier rapidement les mots clefs 
(iii) identifier le texte legifrance associé & mode markup
(iv) 

après traitement proposer un sort avec un pré motif et enregistrer les décisions pour historisation et entrainement ultérieur

# admin
permettra d'afficher si les ingestor on bien bossé et si la db est à jour et potentiellement de lancer un scraping pour la mettre à jour avec log mais sinon cela doit être fait sans intervention utilisateur