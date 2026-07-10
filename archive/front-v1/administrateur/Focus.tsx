"use client";

import { useEffect, useState, type ReactNode } from "react";
import { fr } from "@codegouvfr/react-dsfr";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Badge } from "@codegouvfr/react-dsfr/Badge";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { Select } from "@codegouvfr/react-dsfr/SelectNext";
import { SegmentedControl } from "@codegouvfr/react-dsfr/SegmentedControl";
import { Tag } from "@codegouvfr/react-dsfr/Tag";
import { Tooltip } from "@codegouvfr/react-dsfr/Tooltip";
import {
  amendements,
  AUTRES_SORTS,
  MOTIF_FONDEMENT,
  MOTIF_GRAVITE,
  MOTIF_TYPES,
  type Amendement,
  type Decision,
  type DecisionSort,
  type Lecture,
  type MotifType,
  type Preconisation,
  type Segment,
  type Similaire,
  type SortReel,
} from "../../data/fixtures";
import { marquerLexique, marquerTexte } from "../../lib/lexique";
import {
  dateFr,
  graviteArt40,
  LIBELLE_GAGE,
  LIBELLE_HORS_CHAMP,
  libelleLecture,
  ligneArt45,
} from "../../lib/recevabilite";

const colors = fr.colors.decisions;

const libelleSort = (sort: SortReel | DecisionSort): string =>
  sort === "non-soutenu" ? "non soutenu" : sort;

// ── segments : mots du lexique art. 40 (survol) + passages rectifiés (clic → avant/après) ──
// exporté : la page député réutilise le même rendu sur le brouillon (rapport député, F2)
export function Segments({
  segments,
  gravite,
}: {
  segments: Segment[];
  gravite: "charge" | "ressource" | null;
}) {
  const [openModif, setOpenModif] = useState<number | null>(null);
  // charge = bloquant (error, bordure double) ; ressource et simple soupçon = attention
  // (warning, bordure pleine) ; la forme distingue en plus de la couleur (RGAA)
  const marque =
    gravite === "charge"
      ? {
          fond: colors.background.contrast.error.default,
          texte: colors.text.default.error.default,
          bordure: "3px double",
        }
      : {
          fond: colors.background.contrast.warning.default,
          texte: colors.text.default.warning.default,
          bordure: "2px solid",
        };
  return (
    <>
      <p style={{ lineHeight: 1.8, marginBottom: fr.spacing("2v") }}>
        {segments.map((s, i) => {
          if (s.kind === "text") return <span key={i}>{s.text}</span>;
          if (s.kind === "redflag")
            return (
              <Tooltip key={i} title={s.tip}>
                <mark
                  tabIndex={0}
                  style={{
                    backgroundColor: marque.fond,
                    color: marque.texte,
                    padding: "0 3px",
                    borderRadius: 3,
                    borderBottom: `${marque.bordure} ${marque.texte}`,
                    cursor: "help",
                  }}
                >
                  {s.text}
                  {/* restitution hors survol : l'infobulle DSFR est souris/focus seulement */}
                  <span className="fr-sr-only"> ({s.tip})</span>
                </mark>
              </Tooltip>
            );
          const ouvert = openModif === i;
          return (
            <Tooltip key={i} title={s.tip}>
              <mark
                role="button"
                tabIndex={0}
                aria-expanded={ouvert}
                onClick={() => setOpenModif(ouvert ? null : i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenModif(ouvert ? null : i);
                  }
                }}
                style={{
                  backgroundColor: colors.background.contrast.info.default,
                  color: colors.text.default.info.default,
                  padding: "0 3px",
                  borderRadius: 3,
                  borderBottom: `2px dashed ${colors.text.default.info.default}`,
                  cursor: "pointer",
                }}
              >
                {s.text}
                <span className="fr-sr-only"> (passage rectifié : afficher l&apos;avant/après)</span>
              </mark>
            </Tooltip>
          );
        })}
      </p>
      {segments.map((s, i) =>
        s.kind === "modif" && openModif === i ? (
          <div
            key={`d${i}`}
            style={{
              borderLeft: `3px solid ${colors.text.default.info.default}`,
              backgroundColor: colors.background.contrast.info.default,
              padding: fr.spacing("2v"),
              marginBottom: fr.spacing("2v"),
              fontSize: "0.875rem",
            }}
          >
            <strong>Modification</strong>
            <br />
            <del
              style={{
                backgroundColor: colors.background.contrast.error.default,
                color: colors.text.default.error.default,
              }}
            >
              {s.avant}
            </del>{" "}
            →{" "}
            <ins
              style={{
                backgroundColor: colors.background.contrast.success.default,
                color: colors.text.default.success.default,
                textDecoration: "none",
              }}
            >
              {s.apres}
            </ins>
            <br />
            <span style={{ color: colors.text.mention.grey.default }}>{s.note}</span>
          </div>
        ) : null,
      )}
    </>
  );
}

export function SortBadge({ sort }: { sort: SortReel | DecisionSort }) {
  const severity =
    sort === "adopté" || sort === "recevable"
      ? "success"
      : sort === "rejeté" || sort === "irrecevable"
        ? "error"
        : undefined;
  return (
    <Badge severity={severity} small noIcon as="span">
      {libelleSort(sort)}
    </Badge>
  );
}

function Module({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        backgroundColor: colors.background.default.grey.default,
        borderBottom: `1px solid ${colors.border.default.grey.default}`,
        padding: fr.spacing("3v"),
      }}
    >
      {/* l'action vit hors du h2 : un titre ne contient pas de contrôle interactif (RGAA) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: fr.spacing("2v"),
          marginBottom: fr.spacing("2v"),
        }}
      >
        <h2
          className="fr-text--sm"
          style={{ textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 0 }}
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── bannière des signaux : deux gravités art. 40, gage, hors champ, art. 45 selon lecture
// (lignes art. 45, libellés du gage et du hors champ partagés via lib/recevabilite.ts) ──
function Signaux({ a, lecture }: { a: Amendement; lecture: Lecture }) {
  const s40 = a.signaux_recevabilite.article_40;
  const bordure =
    s40 === "signal_charge"
      ? colors.text.default.error.default
      : s40 === "signal_ressource"
        ? colors.text.default.warning.default
        : colors.border.default.grey.default;
  return (
    <section
      style={{
        border: `1px solid ${colors.border.default.grey.default}`,
        borderLeft: `4px solid ${bordure}`,
        padding: fr.spacing("3v"),
        marginBottom: fr.spacing("3v"),
      }}
    >
      <h2 className="fr-sr-only">Signaux de recevabilité</h2>
      <div
        style={{
          display: "flex",
          gap: fr.spacing("2v"),
          alignItems: "baseline",
          flexWrap: "wrap",
          marginBottom: fr.spacing("1v"),
        }}
      >
        {s40 === "signal_charge" && (
          <Badge severity="error" small as="span">
            art. 40 · charge · bloquant
          </Badge>
        )}
        {s40 === "signal_ressource" && (
          <Badge severity="warning" small as="span">
            art. 40 · ressources · attention
          </Badge>
        )}
        {s40 === "aucun_signal" && a.hors_champ_40 && (
          <Badge small noIcon as="span">
            hors champ art. 40
          </Badge>
        )}
        {s40 === "aucun_signal" && !a.hors_champ_40 && (
          <Badge small noIcon as="span">
            aucun signal art. 40
          </Badge>
        )}
      </div>
      {s40 === "signal_charge" && (
        <p className="fr-text--sm" style={{ marginBottom: fr.spacing("1v") }}>
          Création ou aggravation d&apos;une charge publique : non gageable, irrecevabilité
          quasi certaine.
        </p>
      )}
      {s40 === "signal_ressource" && (
        <p className="fr-text--sm" style={{ marginBottom: fr.spacing("1v") }}>
          Diminution des ressources publiques : curable par un gage certain, chiffrable et
          intégral. {a.gage ? LIBELLE_GAGE[a.gage] : ""}
        </p>
      )}
      {a.hors_champ_40 && (
        <p className="fr-text--sm" style={{ marginBottom: fr.spacing("1v") }}>
          {LIBELLE_HORS_CHAMP[a.hors_champ_40]}
        </p>
      )}
      <p className="fr-text--sm" style={{ marginBottom: fr.spacing("1v") }}>
        {ligneArt45(a.signaux_recevabilite.article_45, lecture)}
      </p>
      <p
        className="fr-text--xs"
        style={{ color: colors.text.mention.grey.default, marginBottom: 0 }}
      >
        {a.signaux_recevabilite.justification}
        {a.signaux_recevabilite.fondement && (
          <> Fondement : {a.signaux_recevabilite.fondement}.</>
        )}
      </p>
    </section>
  );
}

// ── alerte de cohérence (identité formelle stricte, jamais la simple proximité) ──
function AlerteCoherence({
  a,
  decisions,
}: {
  a: Amendement;
  decisions: Record<string, Decision>;
}) {
  const precedent = a.similaires.find((s) => s.identique);
  const jumeau =
    a.regroupement?.type === "id"
      ? amendements.find(
          (autre) =>
            autre.numero !== a.numero &&
            autre.regroupement?.cle === a.regroupement?.cle &&
            decisions[autre.numero],
        )
      : undefined;
  if (!precedent && !jumeau) return null;
  return (
    <Alert
      severity="warning"
      small
      className="fr-mb-3v"
      description={
        <>
          {precedent && (
            <>
              Un amendement formellement identique ({precedent.numero}, {precedent.auteur}) a
              déjà reçu le sort « {libelleSort(precedent.sort)} »
              {precedent.stade &&
                ` (${precedent.stade === "seance" ? "séance" : "commission"}${
                  precedent.lecture ? `, ${libelleLecture(precedent.lecture)}` : ""
                })`}
              . Rappel : « tombé » et « non soutenu » ne sont pas des jugements au fond.{" "}
            </>
          )}
          {jumeau && (
            <>
              {jumeau.numero}, identique à cet amendement, a été marqué «{" "}
              {libelleSort(decisions[jumeau.numero].sort)} » dans cette session.
            </>
          )}
        </>
      }
    />
  );
}

// ── module Similaires et précédents : portée réglable (AD2), stade et lecture du sort ──
const bandeRessemblance = (s: Similaire): string => {
  if (s.identique) return "identique";
  if (s.ressemblance > 90) return "quasi identique";
  if (s.ressemblance >= 60) return "proche";
  return "voisin";
};

// exporté : la page député affiche le même module sur son corpus de précédents (F8)
export function Similaires({ similaires }: { similaires: Similaire[] }) {
  const [degre, setDegre] = useState<1 | 2 | 3>(2);
  const visibles = similaires.filter((s) => (s.degre ?? 3) <= degre);
  return (
    <Module
      title={`Similaires et précédents (${visibles.length})`}
      action={
        <SegmentedControl
          small
          hideLegend
          legend="Portée de la recherche de précédents"
          segments={[
            {
              label: "Texte",
              nativeInputProps: {
                name: "degre",
                checked: degre === 1,
                onChange: () => setDegre(1),
              },
            },
            {
              label: "Ciblés",
              nativeInputProps: {
                name: "degre",
                checked: degre === 2,
                onChange: () => setDegre(2),
              },
            },
            {
              label: "Tout",
              nativeInputProps: {
                name: "degre",
                checked: degre === 3,
                onChange: () => setDegre(3),
              },
            },
          ]}
        />
      }
    >
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {visibles.map((s) => (
          <li
            key={s.numero}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: fr.spacing("1v"),
              padding: `${fr.spacing("1v")} 0`,
              fontSize: "0.8125rem",
            }}
          >
            <span style={{ minWidth: 0 }}>
              <strong>{s.numero}</strong> {s.auteur} ({s.groupe})
              <br />
              <span className="fr-text--xs" style={{ color: colors.text.mention.grey.default }}>
                {s.stade === "seance" ? "séance" : "commission"}
                {s.lecture ? `, ${libelleLecture(s.lecture)}` : ""}
              </span>
            </span>
            <SortBadge sort={s.sort} />
            <span
              style={{
                fontWeight: 700,
                color: colors.text.title.blueFrance.default,
                whiteSpace: "nowrap",
              }}
            >
              {bandeRessemblance(s)}{" "}
              <span
                className="fr-text--xs"
                style={{
                  fontWeight: 400,
                  color: colors.text.mention.grey.default,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.ressemblance} %
              </span>
            </span>
          </li>
        ))}
      </ul>
      {visibles.length === 0 && (
        <p className="fr-text--xs" style={{ color: colors.text.mention.grey.default }}>
          Aucun précédent dans cette portée.
        </p>
      )}
      <p
        className="fr-text--xs"
        style={{
          color: colors.text.mention.grey.default,
          borderTop: `1px dashed ${colors.border.default.grey.default}`,
          paddingTop: fr.spacing("1v"),
          marginBottom: 0,
        }}
      >
        Scores indicatifs sur données de démonstration ; l&apos;appariement réel (recherche
        vectorielle) arrive avec le raccordement du service de données.
      </p>
    </Module>
  );
}

// ── décision humaine : état des brouillons remonté via key={numero} (reset au changement
// d'amendement, sans effet ni ref). La décision elle-même vit dans le Cockpit (compteur,
// export, cohérence). v1 : persistance avec apps/api (issue #3). ──
function DecisionBar({
  a,
  preconisation,
  lecture,
  decision,
  onDecision,
}: {
  a: Amendement;
  preconisation: Preconisation;
  lecture: Lecture;
  decision: Decision | undefined;
  onDecision: (d: Decision | null) => void;
}) {
  const [motifOpen, setMotifOpen] = useState(false);
  const [motifType, setMotifType] = useState<MotifType>(MOTIF_TYPES[0]);
  const [motifTexte, setMotifTexte] = useState("");
  // préremplir une seule fois : rouvrir le panneau ne doit jamais écraser une saisie
  // (remise à zéro par le remount key={numero})
  const [dejaPrerempli, setDejaPrerempli] = useState(false);

  // annonce et positionne le focus sur la confirmation quand une décision est loguée
  useEffect(() => {
    if (decision) document.getElementById(`decision-${a.numero}`)?.focus();
  }, [decision, a.numero]);

  if (decision) {
    return (
      <div id={`decision-${a.numero}`} tabIndex={-1}>
        <Alert
          severity="success"
          small
          role="status"
          description={
            <span
              style={{ display: "flex", gap: fr.spacing("2v"), alignItems: "center", flexWrap: "wrap" }}
            >
              Sort enregistré : {libelleSort(decision.sort).toUpperCase()} ({a.numero})
              {decision.motifType ? ` · ${decision.motifType}` : ""}
              <Button size="small" priority="tertiary" onClick={() => onDecision(null)}>
                Revenir sur la décision
              </Button>
            </span>
          }
        />
      </div>
    );
  }

  const ouvrirMotif = () => {
    if (!motifOpen && !dejaPrerempli) {
      setDejaPrerempli(true);
      const pre = preconisation;
      setMotifTexte(pre.preSort === "irrecevable" ? pre.preMotif : "");
      const parDefaut: MotifType =
        pre.motifType && (MOTIF_TYPES as readonly string[]).includes(pre.motifType)
          ? (pre.motifType as MotifType)
          : a.signaux_recevabilite.article_40 === "signal_charge"
            ? "IRR-40 charge"
            : a.signaux_recevabilite.article_40 === "signal_ressource"
              ? "IRR-40 ressource"
              : lecture === "premiere"
                ? "IRR-45 cavalier"
                : "IRR-45 entonnoir";
      setMotifType(parDefaut);
    }
    setMotifOpen(!motifOpen);
  };

  // étiquettes regroupées par article ; la variante art. 45 inapplicable à la lecture en
  // cours et l'IRR-41 (rarissime) sont reléguées dans « motifs rares »
  const principaux: MotifType[] = [
    "IRR-40 charge",
    "IRR-40 ressource",
    lecture === "premiere" ? "IRR-45 cavalier" : "IRR-45 entonnoir",
    "IRR LOLF",
    "IRR LFSS",
  ];
  const rares: MotifType[] = [
    lecture === "premiere" ? "IRR-45 entonnoir" : "IRR-45 cavalier",
    "IRR-41",
  ];

  const groupeTags = (types: MotifType[]) => (
    <ul
      className="fr-tags-group fr-tags-group--sm"
      style={{ justifyContent: "center", marginBottom: 0 }}
    >
      {types.map((t) => (
        <li key={t}>
          <Tag
            as="button"
            small
            pressed={motifType === t}
            nativeButtonProps={{ onClick: () => setMotifType(t) }}
          >
            {t}
          </Tag>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: fr.spacing("3v"),
          justifyContent: "center",
          alignItems: "flex-end",
        }}
      >
        <Button iconId="fr-icon-check-line" onClick={() => onDecision({ sort: "recevable" })}>
          Recevable
        </Button>
        <Button iconId="fr-icon-close-line" priority="secondary" onClick={ouvrirMotif}>
          Irrecevable
        </Button>
        <div style={{ marginLeft: "auto", width: 220 }}>
          <Select
            label="Constater un autre sort"
            options={[
              { value: "", label: "retiré, tombé…", disabled: true },
              ...AUTRES_SORTS.map((s) => ({ value: s as string, label: s })),
            ]}
            nativeSelectProps={{
              value: "",
              onChange: (e) => {
                if (e.target.value) onDecision({ sort: e.target.value as DecisionSort });
              },
            }}
          />
        </div>
      </div>
      {motifOpen && (
        <div style={{ maxWidth: 720, margin: `${fr.spacing("3v")} auto 0` }}>
          {groupeTags(principaux)}
          <p
            className="fr-text--xs"
            style={{
              color: colors.text.mention.grey.default,
              textAlign: "center",
              margin: `${fr.spacing("1v")} 0 0`,
            }}
          >
            motifs rares
          </p>
          {groupeTags(rares)}
          <Input
            label="Motif de l'irrecevabilité (obligatoire)"
            hintText="Pré-motif proposé par l'analyse, éditable ; notifié à l'auteur avec son fondement."
            textArea
            nativeTextAreaProps={{
              rows: 3,
              value: motifTexte,
              onChange: (e) => setMotifTexte(e.target.value),
            }}
          />
          <p className="fr-text--xs" style={{ color: colors.text.mention.grey.default }}>
            Fondement : {MOTIF_FONDEMENT[motifType]}.
          </p>
          <Button
            disabled={motifTexte.trim() === ""}
            onClick={() => onDecision({ sort: "irrecevable", motifType, motifTexte })}
          >
            Enregistrer le sort
          </Button>
        </div>
      )}
    </>
  );
}

// ── vue focus : zoom d'un amendement de la vue d'ensemble ──
export function Focus({
  a,
  decision,
  decisions,
  lecture,
  position,
  onPrecedent,
  onSuivant,
  onRetour,
  onDecision,
}: {
  a: Amendement;
  decision: Decision | undefined;
  decisions: Record<string, Decision>;
  lecture: Lecture;
  position: { idx: number; total: number };
  onPrecedent: () => void;
  onSuivant: () => void;
  onRetour: () => void;
  onDecision: (d: Decision | null) => void;
}) {
  const [legifGrand, setLegifGrand] = useState(false);
  const gravite = graviteArt40(a.signaux_recevabilite.article_40);

  // l'interprétation de l'article 45 dépend de la lecture : calcul dans l'interface,
  // jamais dans la donnée (rapport, section 4). En lecture ultérieure, un lien non
  // direct fait basculer le pré-sort dans le régime de l'entonnoir.
  const entonnoir =
    lecture === "ulterieure" && a.signaux_recevabilite.article_45 !== "lien_direct";
  const pre: Preconisation =
    entonnoir && a.preconisation.preSort === "recevable"
      ? {
          ...a.preconisation,
          preSort: "irrecevable",
          motifType: "IRR-45 entonnoir",
          niveau: "a_verifier",
          arguments: [
            "règle de l'entonnoir : lien direct exigé avec les dispositions restant en discussion",
            ...a.preconisation.arguments,
          ],
          preMotif:
            "L'amendement ne présente pas de lien direct avec les dispositions restant en discussion : irrecevable au titre de l'article 45 de la Constitution (règle de l'entonnoir, article 98 du Règlement de l'Assemblée nationale).",
        }
      : a.preconisation;
  const preRecalculee = pre !== a.preconisation;

  // à l'arrivée sur un amendement (ouverture ou navigation), positionner le focus sur
  // le titre : l'élément déclencheur a été démonté avec la vue précédente
  useEffect(() => {
    document.getElementById("titre-focus")?.focus();
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 384px",
        gridTemplateRows: "48px 1fr auto",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* ── en-tête navigateur, branché sur l'ordre d'appel ── */}
      <header
        style={{
          gridColumn: "1 / 3",
          display: "flex",
          alignItems: "center",
          gap: fr.spacing("2v"),
          padding: `0 ${fr.spacing("3v")}`,
          borderBottom: `1px solid ${colors.border.default.grey.default}`,
        }}
      >
        <Button priority="tertiary" size="small" onClick={onRetour}>
          Vue d&apos;ensemble
        </Button>
        <Button
          iconId="fr-icon-arrow-left-s-line"
          priority="tertiary"
          size="small"
          title="Amendement précédent dans l'ordre d'appel (←)"
          disabled={position.idx <= 0}
          onClick={onPrecedent}
        />
        <Button
          iconId="fr-icon-arrow-right-s-line"
          priority="tertiary"
          size="small"
          title="Amendement suivant dans l'ordre d'appel (→)"
          disabled={position.idx === -1 || position.idx === position.total - 1}
          onClick={onSuivant}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            gap: fr.spacing("1v"),
            alignItems: "baseline",
            backgroundColor: colors.background.default.grey.hover,
            borderRadius: 16,
            padding: `${fr.spacing("1v")} ${fr.spacing("3v")}`,
            fontSize: "0.8125rem",
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <strong style={{ color: colors.text.title.blueFrance.default }}>{a.numero}</strong>
          <span
            style={{
              color: colors.text.mention.grey.default,
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
          >
            {a.objet_resume} · {a.article_vise}
          </span>
        </div>
        <span
          style={{
            fontSize: "0.75rem",
            color: colors.text.mention.grey.default,
            whiteSpace: "nowrap",
          }}
        >
          {position.idx >= 0
            ? `${position.idx + 1} / ${position.total} · ordre d'appel ${a.ordre_appel} · ← → · Échap`
            : "hors du filtre courant · Échap"}
        </span>
      </header>

      {/* ── centre : l'amendement ── */}
      <main
        style={{
          gridColumn: "1 / 2",
          gridRow: "2 / 3",
          overflowY: "auto",
          minWidth: 0,
          padding: fr.spacing("4v"),
        }}
      >
        <div
          style={{ display: "flex", gap: fr.spacing("2v"), alignItems: "baseline", flexWrap: "wrap" }}
        >
          <h1 id="titre-focus" tabIndex={-1} className="fr-h4" style={{ marginBottom: 0 }}>
            Amendement n° {a.numero}
          </h1>
          {a.regroupement && (
            <Badge severity={undefined} small noIcon as="span">
              {a.regroupement.type === "id" ? "id · identiques" : "dc · discussion commune"}
            </Badge>
          )}
          {a.rectification && (
            <Badge severity="info" small as="span">
              rect. {a.rectification.version}
            </Badge>
          )}
        </div>
        <p className="fr-text--sm" style={{ color: colors.text.mention.grey.default }}>
          {a.auteur} ({a.groupe}) · {a.article_vise} · déposé le {dateFr(a.depose_le)} ·{" "}
          {a.etape === "seance" ? "séance" : "commission"}
        </p>

        <Signaux a={a} lecture={lecture} />
        <AlerteCoherence a={a} decisions={decisions} />

        <section
          style={{
            border: `1px solid ${colors.border.default.grey.default}`,
            padding: fr.spacing("3v"),
            marginBottom: fr.spacing("3v"),
          }}
        >
          <h2
            className="fr-text--sm"
            style={{ textTransform: "uppercase", color: colors.text.mention.grey.default }}
          >
            Exposé sommaire
          </h2>
          <Segments segments={marquerTexte(a.expose)} gravite={gravite} />
        </section>

        <section
          style={{
            border: `1px solid ${colors.border.default.grey.default}`,
            padding: fr.spacing("3v"),
          }}
        >
          <h2
            className="fr-text--sm"
            style={{ textTransform: "uppercase", color: colors.text.mention.grey.default }}
          >
            Dispositif
          </h2>
          <Segments segments={marquerLexique(a.dispositif)} gravite={gravite} />
        </section>
      </main>

      {/* ── bandeau droit : Légifrance, Similaires, Préconisation ── */}
      <aside
        style={{
          borderLeft: `1px solid ${colors.border.default.grey.default}`,
          backgroundColor: colors.background.alt.grey.default,
          overflowY: "auto",
          gridColumn: "2 / 3",
          gridRow: "2 / 4",
        }}
      >
        <Module
          title="Légifrance · textes liés"
          action={
            <Button
              priority="tertiary no outline"
              size="small"
              onClick={() => setLegifGrand(!legifGrand)}
            >
              {legifGrand ? "⤡ réduire" : "⤢ agrandir"}
            </Button>
          }
        >
          <div
            style={{
              maxHeight: legifGrand ? "60vh" : 130,
              overflowY: legifGrand ? "auto" : "hidden",
              transition: "max-height .25s",
              fontSize: "0.8125rem",
            }}
          >
            {a.textes_lies.map((t) => (
              <div key={t.ref}>
                <p
                  className="fr-text--sm"
                  style={{
                    color: colors.text.title.blueFrance.default,
                    fontWeight: 700,
                    marginBottom: fr.spacing("1v"),
                  }}
                >
                  {t.ref}
                </p>
                <Segments segments={t.extrait} gravite={gravite} />
              </div>
            ))}
          </div>
        </Module>

        <Similaires similaires={a.similaires} />

        <Module
          title="Préconisation"
          action={
            <Badge severity="info" small as="span">
              indicatif · IA
            </Badge>
          }
        >
          <p
            style={{
              fontWeight: 700,
              color:
                pre.preSort === "irrecevable"
                  ? colors.text.default.error.default
                  : colors.text.default.success.default,
              marginBottom: 0,
              display: "flex",
              gap: fr.spacing("1v"),
              alignItems: "baseline",
              flexWrap: "wrap",
            }}
          >
            {pre.preSort === "irrecevable" ? "Irrecevable" : "Recevable"}
            {pre.motifType && ` · ${pre.motifType}`}
            {pre.preSort === "irrecevable" && pre.motifType && (
              <Badge
                severity={
                  MOTIF_GRAVITE[pre.motifType as MotifType] === "bloquant" ? "error" : "warning"
                }
                small
                noIcon
                as="span"
              >
                {MOTIF_GRAVITE[pre.motifType as MotifType] === "bloquant"
                  ? "bloquant"
                  : "attention"}
              </Badge>
            )}
          </p>
          <p className="fr-text--xs" style={{ color: colors.text.mention.grey.default }}>
            {pre.niveau === "signal_fort" ? "signal fort" : "à vérifier"} ·{" "}
            {preRecalculee
              ? "recalculée selon la lecture en cours (entonnoir)"
              : `confiance ${pre.confiance} % (indicatif)`}{" "}
            · art. 40 : {a.signaux_recevabilite.article_40.replace(/_/g, " ")} · art. 45 :{" "}
            {a.signaux_recevabilite.article_45.replace(/_/g, " ")}
          </p>
          <ul
            className="fr-text--xs"
            style={{ paddingLeft: fr.spacing("4v"), marginBottom: fr.spacing("2v") }}
          >
            {pre.arguments.map((arg) => (
              <li key={arg}>{arg}</li>
            ))}
          </ul>
          {pre.niveau === "signal_fort" && !decision && (
            <div style={{ marginBottom: fr.spacing("2v") }}>
              <Button
                size="small"
                priority="secondary"
                onClick={() =>
                  onDecision(
                    pre.preSort === "recevable"
                      ? { sort: "recevable" }
                      : {
                          sort: "irrecevable",
                          motifType: pre.motifType as MotifType,
                          motifTexte: pre.preMotif,
                        },
                  )
                }
              >
                Valider la préconisation
              </Button>
              <p
                className="fr-text--xs"
                style={{ color: colors.text.mention.grey.default, marginBottom: 0 }}
              >
                Traitement rapide des cas évidents : la validation reste un geste humain,
                logué et réversible.
              </p>
            </div>
          )}
          <p
            className="fr-text--xs"
            style={{
              color: colors.text.mention.grey.default,
              borderTop: `1px dashed ${colors.border.default.grey.default}`,
              paddingTop: fr.spacing("1v"),
              marginBottom: 0,
            }}
          >
            Éléments d&apos;analyse indicatifs. La décision de recevabilité appartient{" "}
            {a.etape === "commission"
              ? "au président de la commission saisie au fond (stade commission)"
              : "au Président de l'Assemblée nationale (stade séance)"}{" "}
            ; l&apos;administrateur instruit et propose (garde-fou n° 4).
          </p>
        </Module>
      </aside>

      {/* ── décision humaine ── */}
      <footer
        style={{
          gridColumn: "1 / 2",
          gridRow: "3 / 4",
          borderTop: `1px solid ${colors.border.default.grey.default}`,
          padding: fr.spacing("3v"),
        }}
      >
        <DecisionBar
          a={a}
          preconisation={pre}
          lecture={lecture}
          decision={decision}
          onDecision={onDecision}
        />
      </footer>
    </div>
  );
}
