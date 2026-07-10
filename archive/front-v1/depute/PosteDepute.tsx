"use client";

// Page député : assistant en quatre étapes, miroir amont du cockpit administrateur sur
// le même modèle de données (rapport député, sections 2 et 3). Le brouillon vit en état
// React éphémère ; seule la Notification (objet-pont de la boucle de recevabilité) est
// seedée en statique. L'outil signale un risque estimé ; l'autorité décide.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fr } from "@codegouvfr/react-dsfr";
import { Accordion } from "@codegouvfr/react-dsfr/Accordion";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Badge } from "@codegouvfr/react-dsfr/Badge";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { CallOut } from "@codegouvfr/react-dsfr/CallOut";
import { Header } from "@codegouvfr/react-dsfr/Header";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { Notice } from "@codegouvfr/react-dsfr/Notice";
import { SegmentedControl } from "@codegouvfr/react-dsfr/SegmentedControl";
import { Stepper } from "@codegouvfr/react-dsfr/Stepper";
import {
  amendements,
  MOTIF_GRAVITE,
  notifications,
  session,
  type Amendement,
  type Gage,
  type Lecture,
  type Notification,
  type Similaire,
} from "../../data/fixtures";
import { marquerTexte } from "../../lib/lexique";
import {
  dateFr,
  graviteArt40,
  LIBELLE_GAGE,
  LIBELLE_HORS_CHAMP,
  libelleLecture,
  ligneArt45,
  risqueArt45,
  verdict,
} from "../../lib/recevabilite";
import { Segments, Similaires } from "../administrateur/Focus";

const colors = fr.colors.decisions;

const ETAPES = [
  "Saisie du brouillon",
  "Contexte du dépôt",
  "Vérification guidée",
  "Verdict et précédents",
] as const;

// formules de gage reconnues (F3), prêtes à coller puis à adapter dans le dispositif
const FORMULES_GAGE = [
  {
    cible: "l'État",
    texte:
      "La perte de recettes résultant pour l'État du présent article est compensée, à due concurrence, par la création d'une taxe additionnelle à l'accise sur les tabacs.",
  },
  {
    cible: "les collectivités territoriales",
    texte:
      "La perte de recettes résultant pour les collectivités territoriales du présent article est compensée, à due concurrence, par la majoration de la dotation globale de fonctionnement et, corrélativement pour l'État, par la création d'une taxe additionnelle à l'accise sur les tabacs.",
  },
];

// corpus statique v1 (note API) : agrégat dédoublonné des précédents des fixtures.
// Raccordement futur : POST /amendments/similar (paraphrase libre, le brouillon n'a pas
// d'identifiant) ; jamais GET /amendments/:id/similar, réservé aux amendements déposés.
const CORPUS: Similaire[] = [
  ...new Map(
    amendements
      .flatMap((a) => a.similaires)
      // « identique » qualifie le couple d'origine, jamais le brouillon : neutralisé ici
      .map((s) => [s.numero, s.identique ? { ...s, identique: false } : s] as const),
  ).values(),
].sort((x, y) => y.ressemblance - x.ressemblance);

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

// échéance lisible, découpée depuis l'ISO même (déterministe, aucun objet Date au rendu)
function dateHeureFr(iso: string): string {
  const [date, heure] = iso.split("T");
  const [annee, mois, jour] = date.split("-");
  return `${Number(jour)} ${MOIS[Number(mois) - 1]} ${annee} à ${heure.slice(0, 2)} h ${heure.slice(3, 5)}`;
}

function libelleReste(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return "moins d'une minute";
  const jours = Math.floor(totalMinutes / 1440);
  const heures = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const lh = `${heures} heure${heures > 1 ? "s" : ""}`;
  if (jours > 0) {
    const lj = `${jours} jour${jours > 1 ? "s" : ""}`;
    return heures > 0 ? `${lj} et ${lh}` : lj;
  }
  const lm = `${minutes} minute${minutes > 1 ? "s" : ""}`;
  if (heures > 0) return minutes > 0 ? `${lh} et ${lm}` : lh;
  return lm;
}

const ECHEANCE_MS = Date.parse(session.delai_limite);

// horloge minute (F4bis) : useSyncExternalStore rafraîchit sans setState en effet
// (règle lint React 19) et rend null côté serveur (aucun décalage d'hydratation)
const sAbonnerMinute = (notifier: () => void) => {
  const id = setInterval(notifier, 60_000);
  return () => clearInterval(id);
};
const lireMinute = () => Math.floor(Date.now() / 60_000);
const lireMinuteServeur = () => null;

// demande d'explication écrite (F10, article 89 alinéa 6) : pré-remplie depuis la
// notification, l'autorité est nommée selon le stade
const composerDemande = (numero: string, n: Notification): string =>
  `À l'attention ${
    n.stade === "commission"
      ? "du président de la commission saisie au fond"
      : "du Président de l'Assemblée nationale"
  }\n\nEn application de l'article 89, alinéa 6, du Règlement de l'Assemblée nationale, je vous prie de bien vouloir me communiquer par écrit l'explication de l'irrecevabilité opposée à mon amendement n° ${numero}, notifiée le ${dateFr(
    n.date,
  )} (${n.stade === "commission" ? "commission" : "séance"}, ${libelleLecture(n.lecture)}).\n\nMotif notifié : ${
    n.motifTexte
  }\nFondement : ${n.fondement}\n\nJe vous prie d'agréer l'expression de ma haute considération.`;

type Incidence = "aucune" | "ressource" | "charge";
type Lien45 = Amendement["signaux_recevabilite"]["article_45"];

export function PosteDepute() {
  const [etape, setEtape] = useState(0);
  // brouillon éphémère (jamais de fixture) : dispositif, exposé, article visé, gage proposé
  const [dispositif, setDispositif] = useState("");
  const [expose, setExpose] = useState("");
  const [articleVise, setArticleVise] = useState("");
  const [lecture, setLecture] = useState<Lecture>(session.lecture);
  const [incidence, setIncidence] = useState<Incidence>("aucune");
  const [gage, setGage] = useState<Gage>("absent");
  const [lien45, setLien45] = useState<Lien45>("lien_direct");
  const [horsChamp, setHorsChamp] = useState<Amendement["hors_champ_40"]>(undefined);
  const [demandeNumero, setDemandeNumero] = useState<string | null>(null);
  const [demandeTexte, setDemandeTexte] = useState("");
  const [copie, setCopie] = useState<"ok" | "echec" | null>(null);

  const minute = useSyncExternalStore<number | null>(
    sAbonnerMinute,
    lireMinute,
    lireMinuteServeur,
  );
  const reste = minute === null ? null : ECHEANCE_MS - minute * 60_000;

  // mêmes champs calculés que côté administrateur : la qualification (charge, ressource,
  // lien) reste humaine, guidée par les mots signalés ; le lexique repère, il ne juge pas
  const signaux: Amendement["signaux_recevabilite"] = {
    article_40:
      incidence === "charge"
        ? "signal_charge"
        : incidence === "ressource"
          ? "signal_ressource"
          : "aucun_signal",
    article_45: lien45,
    justification: "",
  };
  const v = verdict(signaux, gage, horsChamp, lecture);
  const risque45 = risqueArt45(lien45, lecture);
  const gravite = graviteArt40(signaux.article_40);

  // au changement d'étape, positionner le focus sur le contenu (RGAA) ; pas au montage.
  // Comparaison à l'étape précédente plutôt qu'un booléen : une garde « premier rendu »
  // serait consommée par le double effet du Strict Mode et volerait le focus en dev.
  const etapePrecedente = useRef(etape);
  useEffect(() => {
    if (etapePrecedente.current === etape) return;
    etapePrecedente.current = etape;
    document.getElementById("etape-contenu")?.focus();
  }, [etape]);

  const choisirIncidence = (valeur: Incidence) => {
    setIncidence(valeur);
    if (valeur !== "aucune") setHorsChamp(undefined);
  };

  const preremplir = () => {
    const exemple = amendements.find((a) => a.numero === "CD87");
    if (!exemple) return;
    setDispositif(exemple.dispositif.map((s) => s.text).join(""));
    setExpose(exemple.expose);
    setArticleVise(exemple.article_vise);
  };

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(demandeTexte);
      setCopie("ok");
    } catch {
      // presse-papiers indisponible (contexte non sécurisé, permission refusée) :
      // l'échec est dit dans la zone role="status", jamais silencieux
      setCopie("echec");
    }
  };

  const apercu = (titre: string, texte: string) =>
    texte.trim() === "" ? null : (
      <div style={{ marginBottom: fr.spacing("3v") }}>
        <p className="fr-text--sm" style={{ marginBottom: fr.spacing("1v") }}>
          <strong>{titre}</strong> (le lexique repère un soupçon, il ne juge pas) :
        </p>
        <Segments segments={marquerTexte(texte)} gravite={gravite} />
      </div>
    );

  return (
    <>
      <Header
        brandTop={
          <>
            République
            <br />
            Française
          </>
        }
        homeLinkProps={{ href: "/", title: "Accueil : emendare, Assemblée nationale" }}
        serviceTitle="emendare"
        serviceTagline="Espace député · vérifier un amendement avant de le déposer"
      />
      {/* garde-fou de posture (F5), non fermable : l'outil estime, l'autorité décide */}
      <Notice
        title="Estimation indicative, avant dépôt."
        description="L'outil signale un risque estimé et prépare une correction ; il ne prononce jamais la recevabilité. La décision appartient au président de la commission saisie au fond en commission et au Président de l'Assemblée nationale en séance, après consultation éventuelle de la commission des finances. Il n'existe aucun recours interne ; seule la demande d'explication écrite de l'article 89, alinéa 6, est ouverte à l'auteur."
      />
      <main className="fr-container fr-py-4w">
        <h1 className="fr-h3">Vérifier un amendement avant dépôt</h1>
        <p className="fr-text--sm" style={{ color: colors.text.mention.grey.default }}>
          {session.texte.titre} · commission au fond : {session.texte.commission_fond} · stade :{" "}
          {session.stade_courant === "commission" ? "commission" : "séance"} ·{" "}
          {libelleLecture(lecture)} · session {session.session_ordinaire}
        </p>
        {/* compte à rebours vers le délai limite (F4) : le verdict devient un geste */}
        <p className="fr-text--sm">
          Délai limite de dépôt :{" "}
          <time dateTime={session.delai_limite}>
            <strong>{dateHeureFr(session.delai_limite)}</strong>
          </time>
          {reste !== null && reste > 0 && (
            <>
              {" "}
              · il reste <strong>{libelleReste(reste)}</strong> pour déposer, corriger le gage ou
              reformuler{" "}
              {reste < 72 * 3_600_000 && (
                <Badge severity="warning" small as="span">
                  échéance proche
                </Badge>
              )}
            </>
          )}
        </p>
        {reste !== null && reste <= 0 && (
          <Alert
            severity="error"
            small
            className="fr-mb-2v"
            title="Délai limite expiré"
            description="Le dépôt n'est plus possible à ce stade, et aucune correction postérieure au délai limite ne rattrape la recevabilité."
          />
        )}

        {/* verdict indicatif (F1), lisible en tête, recalculé à chaque modification */}
        <div aria-live="polite" role="status" className="fr-mb-3v">
          <Alert severity={v.severite} small title={v.titre} description={v.corps} />
          <div
            style={{
              display: "flex",
              gap: fr.spacing("1v"),
              flexWrap: "wrap",
              marginTop: fr.spacing("1v"),
            }}
          >
            {signaux.article_40 === "signal_charge" && (
              <Badge severity="error" small as="span">
                art. 40 · charge · bloquant
              </Badge>
            )}
            {signaux.article_40 === "signal_ressource" && (
              <Badge severity="warning" small as="span">
                art. 40 · ressources · attention
              </Badge>
            )}
            {signaux.article_40 === "aucun_signal" && horsChamp && (
              <Badge small noIcon as="span">
                hors champ art. 40
              </Badge>
            )}
            {signaux.article_40 === "aucun_signal" && !horsChamp && (
              <Badge small noIcon as="span">
                aucun signal art. 40
              </Badge>
            )}
            {risque45 ? (
              <Badge severity="warning" small as="span">
                {lecture === "premiere" ? "art. 45 · cavalier probable" : "art. 45 · entonnoir"}
              </Badge>
            ) : (
              <Badge small noIcon as="span">
                art. 45 · lien conforme à la lecture
              </Badge>
            )}
          </div>
          {etape < 2 && (
            <p
              className="fr-text--xs"
              style={{ color: colors.text.mention.grey.default, marginBottom: 0 }}
            >
              L&apos;estimation s&apos;affine avec la vérification guidée (étape 3).
            </p>
          )}
        </div>

        <Stepper
          currentStep={etape + 1}
          stepCount={ETAPES.length}
          title={ETAPES[etape]}
          nextTitle={ETAPES[etape + 1]}
        />

        <section id="etape-contenu" tabIndex={-1} aria-label={`Étape ${etape + 1} : ${ETAPES[etape]}`}>
          {etape === 0 && (
            <>
              <Input
                label="Dispositif"
                hintText="La partie normative : ce que l'amendement change dans le texte. Les mots à surveiller au titre de l'article 40 sont signalés dans la relecture, au fil de la saisie."
                textArea
                nativeTextAreaProps={{
                  rows: 6,
                  value: dispositif,
                  onChange: (e) => setDispositif(e.target.value),
                }}
              />
              {apercu("Relecture du dispositif avec les mots signalés", dispositif)}
              <Input
                label="Exposé sommaire"
                hintText="Les motifs de l'amendement ; cet exposé nourrit la trame de défense de deux minutes (étape 4)."
                textArea
                nativeTextAreaProps={{
                  rows: 4,
                  value: expose,
                  onChange: (e) => setExpose(e.target.value),
                }}
              />
              {apercu("Relecture de l'exposé avec les mots signalés", expose)}
              <Button priority="tertiary" size="small" onClick={preremplir}>
                Pré-remplir depuis un exemple (CD87)
              </Button>
            </>
          )}

          {etape === 1 && (
            <>
              <Input
                label="Article visé"
                hintText="Exemple : Article 2 du PLF 2027. Un amendement se rattache à un article du texte ou en insère un nouveau."
                nativeInputProps={{
                  value: articleVise,
                  onChange: (e) => setArticleVise(e.target.value),
                }}
              />
              {/* sélecteur de lecture (F7) : pilote la règle de l'article 45 */}
              <SegmentedControl
                legend="Lecture en cours"
                segments={[
                  {
                    label: "Première lecture",
                    nativeInputProps: {
                      name: "lecture-depute",
                      checked: lecture === "premiere",
                      onChange: () => setLecture("premiere"),
                    },
                  },
                  {
                    label: "Lectures ultérieures",
                    nativeInputProps: {
                      name: "lecture-depute",
                      checked: lecture === "ulterieure",
                      onChange: () => setLecture("ulterieure"),
                    },
                  },
                ]}
              />
              <p className="fr-text--sm" style={{ marginTop: fr.spacing("2v") }}>
                {lecture === "premiere"
                  ? "En première lecture, un lien même indirect avec le texte suffit (article 45)."
                  : "En lecture ultérieure, la règle de l'entonnoir exige un lien direct avec les dispositions restant en discussion (article 45)."}
              </p>
            </>
          )}

          {etape === 2 && (
            <>
              <SegmentedControl
                legend="Incidence de l'amendement sur les finances publiques"
                segments={[
                  {
                    label: "Aucune incidence",
                    nativeInputProps: {
                      name: "incidence",
                      checked: incidence === "aucune",
                      onChange: () => choisirIncidence("aucune"),
                    },
                  },
                  {
                    label: "Diminue une ressource",
                    nativeInputProps: {
                      name: "incidence",
                      checked: incidence === "ressource",
                      onChange: () => choisirIncidence("ressource"),
                    },
                  },
                  {
                    label: "Crée ou aggrave une charge",
                    nativeInputProps: {
                      name: "incidence",
                      checked: incidence === "charge",
                      onChange: () => choisirIncidence("charge"),
                    },
                  },
                ]}
              />
              <p
                className="fr-text--xs"
                style={{ color: colors.text.mention.grey.default, marginTop: fr.spacing("1v") }}
              >
                Repère : une charge est une dépense publique nouvelle ou aggravée (jamais
                compensable) ; une ressource est une recette publique diminuée (compensable par un
                gage). Les mots signalés à l&apos;étape de saisie aident à qualifier.
              </p>

              {incidence === "charge" && (
                <Alert
                  severity="error"
                  small
                  className="fr-my-2v"
                  title="Aucun gage possible"
                  description="Une charge publique ne peut pas être compensée : le gage ne couvre que les diminutions de ressources (fiche n° 51). Réécrire le dispositif pour supprimer la charge, ou renoncer au dépôt, sont les seules voies."
                />
              )}

              {incidence === "ressource" && (
                <>
                  {/* champ gage actionnable (F3) : tester avec et sans gage, voir basculer */}
                  <SegmentedControl
                    legend="Gage de compensation"
                    segments={[
                      {
                        label: "Présent",
                        nativeInputProps: {
                          name: "gage",
                          checked: gage === "present",
                          onChange: () => setGage("present"),
                        },
                      },
                      {
                        label: "Absent",
                        nativeInputProps: {
                          name: "gage",
                          checked: gage === "absent",
                          onChange: () => setGage("absent"),
                        },
                      },
                      {
                        label: "Insuffisant",
                        nativeInputProps: {
                          name: "gage",
                          checked: gage === "insuffisant",
                          onChange: () => setGage("insuffisant"),
                        },
                      },
                    ]}
                  />
                  <p className="fr-text--sm" style={{ marginTop: fr.spacing("2v") }}>
                    {LIBELLE_GAGE[gage]}
                  </p>
                  <p className="fr-text--xs" style={{ color: colors.text.mention.grey.default }}>
                    Rappel : seul le Gouvernement peut lever le gage en séance ; le député ne le
                    peut pas.
                  </p>
                  <CallOut title="Formules de gage reconnues" bodyAs="div">
                    {FORMULES_GAGE.map((f) => (
                      <span
                        key={f.cible}
                        style={{ display: "block", marginBottom: fr.spacing("3v") }}
                      >
                        « {f.texte} »
                        <br />
                        <Button
                          size="small"
                          priority="secondary"
                          onClick={() =>
                            setDispositif((d) => (d.trim() === "" ? f.texte : `${d} ${f.texte}`))
                          }
                        >
                          Insérer dans le dispositif (perte pour {f.cible})
                        </Button>
                      </span>
                    ))}
                    <span className="fr-text--xs" style={{ display: "block" }}>
                      Formules éditables après insertion (étape 1) : adaptez la personne publique
                      touchée. Le gage doit rester certain, chiffrable et intégral.
                    </span>
                  </CallOut>
                </>
              )}

              {incidence === "aucune" && (
                <>
                  {/* garde anti-découragement (F6) : hors champ explicité, jamais un silence */}
                  <SegmentedControl
                    legend="Cas hors champ de l'article 40"
                    segments={[
                      {
                        label: "Aucun",
                        nativeInputProps: {
                          name: "hors-champ",
                          checked: horsChamp === undefined,
                          onChange: () => setHorsChamp(undefined),
                        },
                      },
                      {
                        label: "Demande de rapport",
                        nativeInputProps: {
                          name: "hors-champ",
                          checked: horsChamp === "demande_de_rapport",
                          onChange: () => setHorsChamp("demande_de_rapport"),
                        },
                      },
                      {
                        label: "Charge de gestion",
                        nativeInputProps: {
                          name: "hors-champ",
                          checked: horsChamp === "charge_de_gestion",
                          onChange: () => setHorsChamp("charge_de_gestion"),
                        },
                      },
                    ]}
                  />
                  {horsChamp && (
                    <Alert
                      severity="success"
                      small
                      className="fr-my-2v"
                      description={LIBELLE_HORS_CHAMP[horsChamp]}
                    />
                  )}
                </>
              )}

              <SegmentedControl
                legend="Lien de l'amendement avec le texte examiné (article 45)"
                segments={[
                  {
                    label: "Lien direct",
                    nativeInputProps: {
                      name: "lien45",
                      checked: lien45 === "lien_direct",
                      onChange: () => setLien45("lien_direct"),
                    },
                  },
                  {
                    label: "Lien indirect",
                    nativeInputProps: {
                      name: "lien45",
                      checked: lien45 === "lien_indirect",
                      onChange: () => setLien45("lien_indirect"),
                    },
                  },
                  {
                    label: "Aucun lien",
                    nativeInputProps: {
                      name: "lien45",
                      checked: lien45 === "lien_absent",
                      onChange: () => setLien45("lien_absent"),
                    },
                  },
                ]}
              />
              <p className="fr-text--sm" style={{ marginTop: fr.spacing("2v") }}>
                {ligneArt45(lien45, lecture)}
              </p>
            </>
          )}

          {etape === 3 && (
            <>
              {/* trame de défense de deux minutes (F9) : aucune donnée nouvelle */}
              <Accordion label="Trame de défense de deux minutes (article 100)" defaultExpanded>
                <ol className="fr-text--sm" style={{ marginBottom: 0 }}>
                  <li>
                    <strong>Annoncer l&apos;objet.</strong>{" "}
                    {expose.trim() !== ""
                      ? expose
                      : "Complétez l'exposé sommaire (étape 1) : il fournit la première minute."}
                  </li>
                  <li>
                    <strong>Désamorcer la recevabilité.</strong> {v.corps}
                  </li>
                  <li>
                    <strong>Être présent à l&apos;appel.</strong> Un amendement dont aucun
                    signataire n&apos;est présent est déclaré non soutenu (article 100 du
                    Règlement).
                  </li>
                </ol>
              </Accordion>

              {/* similaires et précédents (F8) : source statique v1, cf. CORPUS ci-dessus */}
              <div className="fr-mt-3v">
                <p className="fr-text--sm" style={{ marginBottom: fr.spacing("1v") }}>
                  Précédents observés sur ce texte et les textes voisins (corpus de
                  démonstration). Un précédent identique déjà déclaré irrecevable est
                  l&apos;indice prédictif le plus fort, jamais une garantie ; une
                  quasi-duplication invite à cosigner ou à changer de rédaction.
                </p>
                <Similaires similaires={CORPUS} />
              </div>

              {/* boucle de recevabilité (F10) : la notification de l'administrateur, lue par
                  l'auteur ; à ne jamais confondre avec la navette entre assemblées */}
              <section
                className="fr-mt-3v"
                style={{
                  border: `1px solid ${colors.border.default.grey.default}`,
                  padding: fr.spacing("3v"),
                }}
              >
                <h2
                  className="fr-text--sm"
                  style={{ textTransform: "uppercase", letterSpacing: ".04em" }}
                >
                  Boucle de recevabilité · vos amendements notifiés
                </h2>
                <p className="fr-text--xs" style={{ color: colors.text.mention.grey.default }}>
                  Quand l&apos;autorité déclare un amendement irrecevable, le motif notifié
                  apparaît ici. Le seul droit formel de l&apos;auteur est de demander une
                  explication écrite (article 89, alinéa 6).
                </p>
                {Object.entries(notifications).map(([numero, n]) => (
                  <div key={numero}>
                    <p style={{ marginBottom: fr.spacing("1v") }}>
                      <strong>{numero}</strong> · notifié le {dateFr(n.date)} ·{" "}
                      {n.stade === "commission" ? "commission" : "séance"},{" "}
                      {libelleLecture(n.lecture)}{" "}
                      <Badge
                        severity={MOTIF_GRAVITE[n.motifType] === "bloquant" ? "error" : "warning"}
                        small
                        as="span"
                      >
                        {n.motifType} ·{" "}
                        {MOTIF_GRAVITE[n.motifType] === "bloquant" ? "bloquant" : "attention"}
                      </Badge>
                    </p>
                    <p className="fr-text--sm" style={{ marginBottom: fr.spacing("1v") }}>
                      {n.motifTexte}
                    </p>
                    {n.voie_de_passage && (
                      <p className="fr-text--sm" style={{ marginBottom: fr.spacing("1v") }}>
                        <strong>Voie de passage :</strong> {n.voie_de_passage}
                      </p>
                    )}
                    <p className="fr-text--xs" style={{ color: colors.text.mention.grey.default }}>
                      Fondement : {n.fondement}.
                    </p>
                    <Button
                      size="small"
                      priority="secondary"
                      onClick={() => {
                        setDemandeNumero(numero);
                        setDemandeTexte(composerDemande(numero, n));
                        setCopie(null);
                      }}
                    >
                      Demander l&apos;explication écrite (article 89, alinéa 6)
                    </Button>
                    {demandeNumero === numero && (
                      <div className="fr-mt-2v">
                        <Input
                          label="Demande pré-remplie, éditable avant envoi"
                          textArea
                          nativeTextAreaProps={{
                            rows: 8,
                            value: demandeTexte,
                            onChange: (e) => {
                              setDemandeTexte(e.target.value);
                              setCopie(null);
                            },
                          }}
                        />
                        <Button size="small" onClick={copier}>
                          Copier le texte
                        </Button>
                        <span role="status" className="fr-text--xs fr-ml-1v">
                          {copie === "ok"
                            ? "Texte copié."
                            : copie === "echec"
                              ? "La copie a échoué : sélectionnez et copiez le texte ci-dessus."
                              : ""}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </section>
            </>
          )}
        </section>

        <div style={{ display: "flex", gap: fr.spacing("2v"), marginTop: fr.spacing("4v") }}>
          <Button priority="secondary" disabled={etape === 0} onClick={() => setEtape(etape - 1)}>
            Étape précédente
          </Button>
          <Button disabled={etape === ETAPES.length - 1} onClick={() => setEtape(etape + 1)}>
            Étape suivante
          </Button>
        </div>
      </main>
    </>
  );
}
