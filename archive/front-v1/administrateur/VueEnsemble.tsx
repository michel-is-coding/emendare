"use client";

import { useEffect, useState } from "react";
import { fr } from "@codegouvfr/react-dsfr";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Badge } from "@codegouvfr/react-dsfr/Badge";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { ButtonsGroup } from "@codegouvfr/react-dsfr/ButtonsGroup";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { SearchBar } from "@codegouvfr/react-dsfr/SearchBar";
import { SegmentedControl } from "@codegouvfr/react-dsfr/SegmentedControl";
import { Select } from "@codegouvfr/react-dsfr/SelectNext";
import { Tag } from "@codegouvfr/react-dsfr/Tag";
import {
  amendements,
  MOTIF_TYPES,
  type Amendement,
  type Decision,
  type Lecture,
  type MotifType,
} from "../../data/fixtures";
import { csvDerouleur, csvIrrecevables, progression, telecharger } from "../../lib/traitement";
import { SortBadge } from "./Focus";

const colors = fr.colors.decisions;

export type Filtres = {
  article: string;
  groupe: string;
  etape: "" | "commission" | "seance";
  charge: boolean;
  ressource: boolean;
  statut: "" | "a_traiter" | "traites";
};

export const FILTRES_VIDES: Filtres = {
  article: "",
  groupe: "",
  etape: "",
  charge: false,
  ressource: false,
  statut: "",
};

export type Tri = { col: "ordre_appel" | "numero" | "article_vise"; sens: 1 | -1 };

const LIBELLE_GAGE: Record<string, string> = {
  present: "présent",
  absent: "absent",
  insuffisant: "insuffisant",
};

const pluriel = (n: number, mot: string): string => (n > 1 ? `${mot}s` : mot);

// ── en-tête de colonne triable (aria-sort porté par le th, tri en état React) ──
function ThTriable({
  col,
  label,
  tri,
  onTri,
}: {
  col: Tri["col"];
  label: string;
  tri: Tri;
  onTri: (t: Tri) => void;
}) {
  const actif = tri.col === col;
  return (
    <th scope="col" aria-sort={actif ? (tri.sens === 1 ? "ascending" : "descending") : undefined}>
      <Button
        priority="tertiary no outline"
        size="small"
        onClick={() => onTri(actif ? { col, sens: tri.sens === 1 ? -1 : 1 } : { col, sens: 1 })}
      >
        {label}
        {actif ? (tri.sens === 1 ? " ↑" : " ↓") : ""}
      </Button>
    </th>
  );
}

function CelluleSignal({ a }: { a: Amendement }) {
  const s40 = a.signaux_recevabilite.article_40;
  if (s40 === "signal_charge")
    return (
      <Badge severity="error" small noIcon as="span">
        charge
      </Badge>
    );
  if (s40 === "signal_ressource")
    return (
      <>
        <Badge severity="warning" small noIcon as="span">
          ressources
        </Badge>
        {a.gage && (
          <span
            className="fr-text--xs"
            style={{ color: colors.text.mention.grey.default, display: "block" }}
          >
            gage {LIBELLE_GAGE[a.gage]}
          </span>
        )}
      </>
    );
  if (a.hors_champ_40)
    return (
      <Badge small noIcon as="span">
        hors champ
      </Badge>
    );
  return (
    <span className="fr-text--xs" style={{ color: colors.text.mention.grey.default }}>
      aucun
    </span>
  );
}

function CelluleStatut({ a, decision }: { a: Amendement; decision: Decision | undefined }) {
  if (decision) return <SortBadge sort={decision.sort} />;
  return (
    <span className="fr-text--xs">
      à instruire
      <br />
      <span style={{ color: colors.text.mention.grey.default }}>
        IA : {a.preconisation.preSort}
        {a.preconisation.niveau === "a_verifier" ? " (à vérifier)" : ""}
      </span>
    </span>
  );
}

// ── barre d'actions par lot : sort commun réservé aux identiques (« id »), avec
// confirmation ; la discussion commune (« dc ») se traite amendement par amendement.
// Remontée via key={selection} : l'état de confirmation se réinitialise à chaque
// changement de sélection. ──
function BarreLot({
  selectionnes,
  onLot,
  onVider,
}: {
  selectionnes: Amendement[];
  onLot: (numeros: string[], d: Decision, message: string) => void;
  onVider: () => void;
}) {
  const [confirmation, setConfirmation] = useState<"recevable" | "irrecevable" | null>(null);
  const premier = selectionnes[0];
  const [motifType, setMotifType] = useState<MotifType>(
    premier.preconisation.motifType &&
      (MOTIF_TYPES as readonly string[]).includes(premier.preconisation.motifType)
      ? (premier.preconisation.motifType as MotifType)
      : MOTIF_TYPES[0],
  );
  const [motifTexte, setMotifTexte] = useState(premier.preconisation.preMotif);

  const numeros = selectionnes.map((a) => a.numero);
  const groupeIdentiques =
    selectionnes.length >= 2 &&
    selectionnes.every(
      (a) => a.regroupement?.type === "id" && a.regroupement.cle === premier.regroupement?.cle,
    );
  const contientDc = selectionnes.some((a) => a.regroupement?.type === "dc");

  return (
    <div
      style={{
        border: `1px solid ${colors.border.default.grey.default}`,
        borderLeft: `4px solid ${colors.text.title.blueFrance.default}`,
        padding: fr.spacing("2v"),
        marginBottom: fr.spacing("2v"),
      }}
    >
      <p className="fr-text--sm" style={{ marginBottom: fr.spacing("1v") }}>
        Sélection : {numeros.join(", ")}
      </p>
      {!groupeIdentiques && (
        <Alert
          severity="info"
          small
          description={
            contientDc
              ? "Discussion commune (« dc ») : rédactions concurrentes, votes et sorts séparés. Le sort commun est refusé ; traiter chaque amendement."
              : "Le sort commun est réservé à un groupe d'amendements identiques (badge « id ») : sélectionner au moins deux membres du même groupe."
          }
        />
      )}
      {groupeIdentiques && confirmation === null && (
        <ButtonsGroup
          inlineLayoutWhen="always"
          buttonsSize="small"
          buttons={[
            {
              children: "Sort commun : recevable",
              onClick: () => setConfirmation("recevable"),
            },
            {
              children: "Sort commun : irrecevable",
              priority: "secondary",
              onClick: () => setConfirmation("irrecevable"),
            },
            { children: "Désélectionner", priority: "tertiary", onClick: onVider },
          ]}
        />
      )}
      {groupeIdentiques && confirmation !== null && (
        <div style={{ maxWidth: 720 }}>
          {confirmation === "irrecevable" && (
            <>
              <Select
                label="Motif commun"
                options={MOTIF_TYPES.map((t) => ({ value: t, label: t }))}
                nativeSelectProps={{
                  value: motifType,
                  onChange: (e) => setMotifType(e.target.value as MotifType),
                }}
              />
              <Input
                label="Motif de l'irrecevabilité (obligatoire, appliqué aux amendements identiques)"
                textArea
                nativeTextAreaProps={{
                  rows: 2,
                  value: motifTexte,
                  onChange: (e) => setMotifTexte(e.target.value),
                }}
              />
            </>
          )}
          <Alert
            severity="warning"
            small
            className="fr-my-2v"
            description={`Appliquer le sort commun « ${confirmation} » aux ${numeros.length} amendements identiques (${numeros.join(", ")}) ? L'action est annulable immédiatement.`}
          />
          <ButtonsGroup
            inlineLayoutWhen="always"
            buttonsSize="small"
            buttons={[
              {
                children: "Confirmer le sort commun",
                disabled: confirmation === "irrecevable" && motifTexte.trim() === "",
                onClick: () =>
                  onLot(
                    numeros,
                    confirmation === "recevable"
                      ? { sort: "recevable" }
                      : { sort: "irrecevable", motifType, motifTexte },
                    `Sort commun « ${confirmation} » appliqué à ${numeros.join(", ")}.`,
                  ),
              },
              {
                children: "Abandonner",
                priority: "tertiary",
                onClick: () => setConfirmation(null),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}

// ── vue d'ensemble : la file de traitement, triée par ordre d'appel ──
export function VueEnsemble({
  visibles,
  decisions,
  recherche,
  onRecherche,
  filtres,
  onFiltres,
  tri,
  onTri,
  lecture,
  onLecture,
  selection,
  onSelection,
  retourNumero,
  onOuvrir,
  onLot,
  lot,
  onAnnulerLot,
}: {
  visibles: Amendement[];
  decisions: Record<string, Decision>;
  recherche: string;
  onRecherche: (v: string) => void;
  filtres: Filtres;
  onFiltres: (f: Filtres) => void;
  tri: Tri;
  onTri: (t: Tri) => void;
  lecture: Lecture;
  onLecture: (l: Lecture) => void;
  selection: string[];
  onSelection: (s: string[]) => void;
  retourNumero: string | null;
  onOuvrir: (numero: string) => void;
  onLot: (numeros: string[], d: Decision, message: string) => void;
  lot: { message: string } | null;
  onAnnulerLot: () => void;
}) {
  // restauration du focus au retour de la vue focus (RGAA) : focus DOM en effet
  // (aucun setState), rejoué seulement quand le numéro de retour change ; repli sur
  // le titre si la ligne d'origine est sortie du filtre courant
  useEffect(() => {
    if (!retourNumero) return;
    const cible =
      document.getElementById(`ouvrir-${retourNumero}`) ??
      document.getElementById("titre-liste");
    cible?.focus();
  }, [retourNumero]);

  const articles = [...new Set(amendements.map((a) => a.article_vise))].sort();
  const groupes = [...new Set(amendements.map((a) => a.groupe))].sort();
  const p = progression(visibles, decisions);
  const selectionnes = amendements.filter((a) => selection.includes(a.numero));

  const actifs: { label: string; retirer: () => void }[] = [
    ...(filtres.article
      ? [{ label: filtres.article, retirer: () => onFiltres({ ...filtres, article: "" }) }]
      : []),
    ...(filtres.groupe
      ? [{ label: `groupe ${filtres.groupe}`, retirer: () => onFiltres({ ...filtres, groupe: "" }) }]
      : []),
    ...(filtres.etape
      ? [
          {
            label: filtres.etape === "commission" ? "commission" : "séance",
            retirer: () => onFiltres({ ...filtres, etape: "" }),
          },
        ]
      : []),
    ...(filtres.charge
      ? [{ label: "art. 40 : charge", retirer: () => onFiltres({ ...filtres, charge: false }) }]
      : []),
    ...(filtres.ressource
      ? [
          {
            label: "art. 40 : ressources",
            retirer: () => onFiltres({ ...filtres, ressource: false }),
          },
        ]
      : []),
    ...(filtres.statut
      ? [
          {
            label: filtres.statut === "a_traiter" ? "à traiter" : "traités",
            retirer: () => onFiltres({ ...filtres, statut: "" }),
          },
        ]
      : []),
  ];

  const cocher = (numero: string, coche: boolean) =>
    onSelection(coche ? [...selection, numero] : selection.filter((n) => n !== numero));

  return (
    <div style={{ overflowY: "auto", minWidth: 0, padding: fr.spacing("4v") }}>
      <div
        style={{
          display: "flex",
          gap: fr.spacing("3v"),
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <h1 id="titre-liste" tabIndex={-1} className="fr-h4" style={{ marginBottom: fr.spacing("2v") }}>
          Amendements à instruire
        </h1>
        <SegmentedControl
          small
          legend="Lecture en cours"
          inlineLegend
          segments={[
            {
              label: "Première lecture",
              nativeInputProps: {
                name: "lecture",
                checked: lecture === "premiere",
                onChange: () => onLecture("premiere"),
              },
            },
            {
              label: "Lectures ultérieures",
              nativeInputProps: {
                name: "lecture",
                checked: lecture === "ulterieure",
                onChange: () => onLecture("ulterieure"),
              },
            },
          ]}
        />
        <ButtonsGroup
          inlineLayoutWhen="always"
          buttonsSize="small"
          buttons={[
            {
              children: "Exporter les irrecevables (CSV)",
              priority: "secondary",
              onClick: () => telecharger("irrecevables.csv", csvIrrecevables(amendements, decisions)),
            },
            {
              children: "Exporter le dérouleur annoté (CSV)",
              priority: "secondary",
              onClick: () => telecharger("derouleur-annote.csv", csvDerouleur(amendements, decisions)),
            },
          ]}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: fr.spacing("2v"),
          alignItems: "flex-end",
          flexWrap: "wrap",
          marginBottom: fr.spacing("2v"),
        }}
      >
        <div style={{ flex: "1 1 260px" }}>
          <SearchBar
            label="Rechercher un amendement (numéro, auteur, article, objet)"
            renderInput={({ id, className, placeholder, type }) => (
              <input
                id={id}
                className={className}
                placeholder={placeholder}
                type={type}
                value={recherche}
                onChange={(e) => onRecherche(e.target.value)}
              />
            )}
          />
        </div>
        <Select
          label="Article"
          options={[{ value: "", label: "Tous" }, ...articles.map((v) => ({ value: v, label: v }))]}
          nativeSelectProps={{
            value: filtres.article,
            onChange: (e) => onFiltres({ ...filtres, article: e.target.value }),
          }}
        />
        <Select
          label="Groupe"
          options={[{ value: "", label: "Tous" }, ...groupes.map((v) => ({ value: v, label: v }))]}
          nativeSelectProps={{
            value: filtres.groupe,
            onChange: (e) => onFiltres({ ...filtres, groupe: e.target.value }),
          }}
        />
        <Select
          label="Étape"
          options={[
            { value: "", label: "Toutes" },
            { value: "commission", label: "Commission" },
            { value: "seance", label: "Séance" },
          ]}
          nativeSelectProps={{
            value: filtres.etape,
            onChange: (e) => onFiltres({ ...filtres, etape: e.target.value as Filtres["etape"] }),
          }}
        />
        <Select
          label="Statut"
          options={[
            { value: "", label: "Tous" },
            { value: "a_traiter", label: "À traiter" },
            { value: "traites", label: "Traités" },
          ]}
          nativeSelectProps={{
            value: filtres.statut,
            onChange: (e) => onFiltres({ ...filtres, statut: e.target.value as Filtres["statut"] }),
          }}
        />
        {/* filtre signal art. 40 scindé : la charge (bloquante) d'abord, la ressource (curable) ensuite */}
        <ul className="fr-tags-group fr-tags-group--sm" style={{ marginBottom: fr.spacing("1v") }}>
          <li>
            <Tag
              as="button"
              small
              pressed={filtres.charge}
              nativeButtonProps={{
                onClick: () => onFiltres({ ...filtres, charge: !filtres.charge }),
              }}
            >
              Art. 40 : charge
            </Tag>
          </li>
          <li>
            <Tag
              as="button"
              small
              pressed={filtres.ressource}
              nativeButtonProps={{
                onClick: () => onFiltres({ ...filtres, ressource: !filtres.ressource }),
              }}
            >
              Art. 40 : ressources
            </Tag>
          </li>
        </ul>
      </div>

      {(actifs.length > 0 || recherche.trim() !== "") && (
        <div
          style={{
            display: "flex",
            gap: fr.spacing("2v"),
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: fr.spacing("2v"),
          }}
        >
          <ul className="fr-tags-group fr-tags-group--sm" style={{ marginBottom: 0 }}>
            {actifs.map((f) => (
              <li key={f.label}>
                <Tag
                  as="button"
                  small
                  dismissible
                  nativeButtonProps={{
                    "aria-label": `Retirer le filtre ${f.label}`,
                    onClick: f.retirer,
                  }}
                >
                  {f.label}
                </Tag>
              </li>
            ))}
          </ul>
          <Button
            priority="tertiary no outline"
            size="small"
            onClick={() => {
              onFiltres(FILTRES_VIDES);
              onRecherche("");
            }}
          >
            Tout effacer
          </Button>
        </div>
      )}

      <p className="fr-text--sm" aria-live="polite" style={{ marginBottom: fr.spacing("2v") }}>
        {visibles.length < amendements.length &&
          `${visibles.length} ${pluriel(visibles.length, "affiché")} sur ${amendements.length} · `}
        {p.traites}/{p.total} {pluriel(p.traites, "traité")} · {p.irrecevables}{" "}
        {pluriel(p.irrecevables, "irrecevable")} ({p.bloquants} charge, définitif ·{" "}
        {p.attention} attention, curable ou contestable) · reste {p.total - p.traites}, dont{" "}
        {p.evidentsRestants} cas {pluriel(p.evidentsRestants, "évident")}
      </p>

      {lot && (
        <Alert
          severity="success"
          small
          role="status"
          className="fr-mb-2v"
          description={
            <span
              style={{ display: "flex", gap: fr.spacing("2v"), alignItems: "center", flexWrap: "wrap" }}
            >
              {lot.message}
              <Button size="small" priority="tertiary" onClick={onAnnulerLot}>
                Annuler
              </Button>
            </span>
          }
        />
      )}

      {selectionnes.length > 0 && (
        <BarreLot
          key={selection.join(",")}
          selectionnes={selectionnes}
          onLot={onLot}
          onVider={() => onSelection([])}
        />
      )}

      {/* chaîne de balisage officielle du DSFR : les modificateurs --sm et fr-cell--fixed
          exigent l'ancêtre fr-table__content (vérifié dans le dsfr.css installé) */}
      <div className="fr-table fr-table--sm fr-table--bordered">
        <div className="fr-table__wrapper">
          <div className="fr-table__container">
            <div className="fr-table__content">
              <table>
          <caption className="fr-sr-only">
            Amendements du dossier, une ligne par amendement, triés par{" "}
            {tri.col === "ordre_appel" ? "ordre d'appel" : tri.col === "numero" ? "numéro" : "article"}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="fr-cell--fixed">
                <span className="fr-sr-only">Sélection</span>
              </th>
              <ThTriable col="ordre_appel" label="Ordre d'appel" tri={tri} onTri={onTri} />
              <ThTriable col="numero" label="Numéro" tri={tri} onTri={onTri} />
              <th scope="col">Auteur</th>
              <ThTriable col="article_vise" label="Article" tri={tri} onTri={onTri} />
              <th scope="col">Objet</th>
              <th scope="col">Signal art. 40</th>
              <th scope="col">Statut</th>
              <th scope="col">
                <span className="fr-sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((a) => (
              <tr key={a.numero}>
                <td className="fr-cell--fixed">
                  <div className="fr-checkbox-group fr-checkbox-group--sm">
                    <input
                      type="checkbox"
                      id={`sel-${a.numero}`}
                      checked={selection.includes(a.numero)}
                      onChange={(e) => cocher(a.numero, e.target.checked)}
                    />
                    <label className="fr-label" htmlFor={`sel-${a.numero}`}>
                      <span className="fr-sr-only">Sélectionner {a.numero}</span>
                    </label>
                  </div>
                </td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{a.ordre_appel}</td>
                <td>
                  <strong>{a.numero}</strong>
                  {a.regroupement && (
                    <>
                      {" "}
                      <Badge small noIcon as="span">
                        {a.regroupement.type}
                      </Badge>
                    </>
                  )}
                  {a.rectification && (
                    <>
                      {" "}
                      <Badge severity="info" small noIcon as="span">
                        rect.
                      </Badge>
                    </>
                  )}
                </td>
                <td>
                  {a.auteur} ({a.groupe})
                </td>
                <td>{a.article_vise.replace(" du PLF 2027", "")}</td>
                <td>{a.objet_resume}</td>
                <td>
                  <CelluleSignal a={a} />
                </td>
                <td>
                  <CelluleStatut a={a} decision={decisions[a.numero]} />
                </td>
                <td>
                  <Button
                    priority="secondary"
                    size="small"
                    nativeButtonProps={{
                      id: `ouvrir-${a.numero}`,
                      "data-ligne-ouvrir": true,
                    }}
                    onClick={() => onOuvrir(a.numero)}
                  >
                    Ouvrir
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {visibles.length === 0 && (
        <p className="fr-text--sm" style={{ color: colors.text.mention.grey.default }}>
          Aucun amendement ne correspond à la recherche ou aux filtres.
        </p>
      )}
      <p className="fr-text--xs" style={{ color: colors.text.mention.grey.default }}>
        Tri par défaut : ordre d&apos;appel du dérouleur (feuille jaune). Navigation clavier :
        flèches haut et bas pour parcourir, « x » pour cocher, Entrée pour ouvrir.
      </p>
    </div>
  );
}
