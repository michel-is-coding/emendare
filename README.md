# Le Cockpit

**Le poste de pilotage de l'instruction des amendements à l'Assemblée nationale.**
Recevabilité assistée (art. 40, 41, 38, 45), côté administrateur comme côté député.

🔗 **Démo : [emendare.fr](https://emendare.fr)** &nbsp;·&nbsp; 📊 **[Présentation (PDF)](hackathon-an-2026/docs/presentation-le-cockpit.pdf)** &nbsp;·&nbsp; 📄 **[Dossier de défi](hackathon-an-2026/DEFI.md)**

<table>
  <tr>
    <td width="33%" valign="top"><img src="hackathon-an-2026/images/cockpit-flux-dossiers.png" alt="Le flux des dossiers"><br><sub><b>Niveau 1</b> · le flux des dossiers</sub></td>
    <td width="33%" valign="top"><img src="hackathon-an-2026/images/cockpit-classification-liasse.png" alt="La classification de la liasse"><br><sub><b>Niveau 2</b> · la classification de la liasse</sub></td>
    <td width="33%" valign="top"><img src="hackathon-an-2026/images/cockpit-analyse-amendement.png" alt="L'analyse d'un amendement"><br><sub><b>Niveau 3</b> · l'analyse d'un amendement</sub></td>
  </tr>
</table>

## Le problème

Chaque amendement déposé doit être jugé recevable ou non (art. 40, 41, 38, 45 - fiche 51) avant
tout examen en commission. Travail manuel et chronophage pour les administrateurs ; aucune visibilité
en amont pour les députés sur le risque d'irrecevabilité de leur propre amendement.

## Ce que fait Le Cockpit

Un amendement sélectionné (par numéro, données publiques AN, ou upload) déclenche :

1. **Analyse du texte** - mots-clés à risque surlignés (base de mots-clés par contexte, ou agent LLM).
2. **Texte de loi concerné** - diff avant/après apporté par l'amendement, navigable.
3. **Amendements similaires** - classés par % de ressemblance (pgvector).
4. **Sort** - recevable / irrecevable, % de confiance, motif (IRR LFSS, IRR LOF, IRR…) et texte
   justificatif si irrecevable.

Le principe : **l'outil préconise, l'administrateur décide.** Aucune décision automatique.

## Côté député - le dépôt augmenté

*En développement.* Le Cockpit ne sert pas que l'administrateur : il donne aussi au député un
pré-contrôle de recevabilité **au moment du dépôt**, pour savoir en amont si son amendement risque
d'être déclaré irrecevable, et pourquoi.

<p><img src="hackathon-an-2026/images/depute-precontrole.jpg" alt="Espace député - pré-contrôle de recevabilité" width="70%"><br><sub>Espace député · pré-contrôle de recevabilité avant dépôt</sub></p>

- **Un pré-contrôle automatique** - la recevabilité est vérifiée dès l'écriture, au regard des
  articles 40, 41 et 45 de la Constitution et des lois organiques (LOLF, LOLFSS).
- **Les obstacles signalés en amont** - le député voit si son amendement peut être déclaré
  irrecevable, et pourquoi.
- **Le dernier mot à l'administrateur** - le contrôle définitif reste humain : l'outil prépare,
  il ne décide pas.

## Stack

Next.js · NestJS · Prisma · PostgreSQL + pgvector · Redis · DSFR (`@codegouvfr/react-dsfr`) ·
harvesters données ouvertes AN + Légifrance (dumps DILA LEGI/JORF) · LLM agnostique
(OpenRouter ou self-hosted llama.cpp).

## Équipe

michel-is-coding & co-porteur

## Hackathon Assemblée nationale 2026

Dossier de défi complet : [`hackathon-an-2026/DEFI.md`](hackathon-an-2026/DEFI.md)
