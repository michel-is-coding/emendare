"use client";

// Liasse d'amendements : tableau DSFR, filtres SERVEUR sur toute la liasse
// (form GET → searchParams → API, tbd n°3), colonne verdict agent jointe par
// l'API (tbd n°4), export CSV de la page affichée. La colonne auteur attend
// le référentiel acteurs (tbd n°5).

import Link from "next/link";
import { fr } from "@codegouvfr/react-dsfr";
import Alert from "@codegouvfr/react-dsfr/Alert";
import Button from "@codegouvfr/react-dsfr/Button";
import SearchBar from "@codegouvfr/react-dsfr/SearchBar";
import Select from "@codegouvfr/react-dsfr/SelectNext";
import Table from "@codegouvfr/react-dsfr/Table";
import { BadgeSort, BadgeVerdictListe } from "../../../components/BadgeSort";
import type { AmendementListe, FiltresLiasse, StatsTexte } from "../../../lib/api";
import { dateFr } from "../../../lib/recevabilite";
import { enCsv, telecharger } from "../../../lib/traitement";

const SORT_VIDE = "à instruire";
/** Valeur sentinelle côté API pour « sans sort » (cf. texts.controller). */
const SORT_AUCUN = "aucun";

export function Liasse({
  texteId,
  titreTexte,
  items,
  total,
  stats,
  filtres,
}: {
  texteId: string;
  titreTexte: string;
  items: AmendementListe[];
  total: number;
  stats: StatsTexte;
  filtres: FiltresLiasse;
}) {
  // Options du filtre sort = sorts réels de TOUTE la liasse (stats), pas de la page.
  const sansSort = stats.parSort
    .filter((g) => !g.sort || !g.sort.trim())
    .reduce((n, g) => n + g.count, 0);
  const optionsSort = [
    { value: "", label: "Tous les sorts" },
    ...(sansSort > 0
      ? [{ value: SORT_AUCUN, label: `${SORT_VIDE} (${sansSort})` }]
      : []),
    ...stats.parSort
      .filter((g) => g.sort && g.sort.trim())
      .map((g) => ({ value: g.sort as string, label: `${g.sort} (${g.count})` })),
  ];

  const filtresActifs = Boolean(filtres.q || filtres.sort || filtres.verdict);

  const soumettre = (e: React.ChangeEvent<HTMLSelectElement>) =>
    e.target.form?.requestSubmit();

  const exporterCsv = () => {
    const lignes: (string | number | undefined)[][] = [
      [
        "Numéro",
        "Article visé",
        "Sort",
        "Verdict agent",
        "Motif",
        "Confiance",
        "Date de dépôt",
      ],
      ...items.map((a) => [
        a.numero ?? "",
        a.articleReference ?? "",
        a.sort && a.sort.trim() ? a.sort : SORT_VIDE,
        a.verdict?.sort ?? "",
        a.verdict?.motifCode ?? "",
        a.verdict ? `${Math.round(a.verdict.confidence * 100)} %` : "",
        a.dateDepot ? dateFr(a.dateDepot.slice(0, 10)) : "",
      ]),
    ];
    telecharger(`liasse-${texteId}.csv`, enCsv(lignes));
  };

  if (stats.total === 0) {
    return (
      <Alert
        severity="info"
        title="Liasse vide"
        description="Aucun amendement rattaché à ce texte pour l'instant. Lancez une ingestion des amendements si nécessaire (POST /ingestion/amendements-an/run)."
      />
    );
  }

  const donnees = items.map((a) => [
    <Link key={a.id} href={`/dossiers/${texteId}/amendements/${a.id}`}>
      {a.numero ?? "—"}
    </Link>,
    a.articleReference ?? "—",
    <BadgeSort key={`${a.id}-sort`} sort={a.sort} small />,
    <BadgeVerdictListe key={`${a.id}-verdict`} verdict={a.verdict} />,
    a.dateDepot ? dateFr(a.dateDepot.slice(0, 10)) : "—",
  ]);

  return (
    <section aria-label="Liasse d'amendements">
      <h2 className={fr.cx("fr-h4")}>Liasse d'amendements</h2>

      <form method="get" action={`/dossiers/${texteId}`}>
        <div
          className={fr.cx(
            "fr-grid-row",
            "fr-grid-row--bottom",
            "fr-grid-row--gutters",
            "fr-mb-2w",
          )}
        >
          <div className={fr.cx("fr-col-12", "fr-col-md-4")}>
            <SearchBar
              label="Rechercher dans la liasse (numéro, article)"
              renderInput={({ className, id, placeholder, type }) => (
                <input
                  className={className}
                  id={id}
                  placeholder={placeholder}
                  type={type}
                  name="q"
                  defaultValue={filtres.q ?? ""}
                />
              )}
            />
          </div>
          <div className={fr.cx("fr-col-12", "fr-col-md-3")}>
            <Select
              label="Sort"
              nativeSelectProps={{
                name: "sort",
                defaultValue: filtres.sort ?? "",
                onChange: soumettre,
              }}
              options={optionsSort}
            />
          </div>
          <div className={fr.cx("fr-col-12", "fr-col-md-3")}>
            <Select
              label="Verdict agent"
              nativeSelectProps={{
                name: "verdict",
                defaultValue: filtres.verdict ?? "",
                onChange: soumettre,
              }}
              options={[
                { value: "", label: "Tous" },
                { value: "IRRECEVABLE", label: "Irrecevable" },
                { value: "RECEVABLE", label: "Recevable" },
              ]}
            />
          </div>
          <div className={fr.cx("fr-col-12", "fr-col-md-2")}>
            <Select
              label="Tri"
              nativeSelectProps={{
                name: "orderBy",
                defaultValue: filtres.orderBy ?? "",
                onChange: soumettre,
              }}
              options={[
                { value: "", label: "Numéro" },
                { value: "dateDepot", label: "Date de dépôt" },
              ]}
            />
          </div>
        </div>
      </form>

      <p aria-live="polite" className={fr.cx("fr-text--sm", "fr-mb-2w")}>
        {items.length} amendement{items.length > 1 ? "s" : ""} affiché
        {items.length > 1 ? "s" : ""} sur {total} correspondant aux filtres ·{" "}
        {stats.total} au total pour ce texte.{" "}
        {filtresActifs && (
          <Link href={`/dossiers/${texteId}`}>Réinitialiser les filtres</Link>
        )}
      </p>

      {items.length === 0 ? (
        <Alert
          severity="info"
          title="Aucun amendement ne correspond aux filtres"
          description="Modifiez la recherche ou réinitialisez les filtres pour revenir à la liasse complète."
        />
      ) : (
        <>
          <Table
            caption={`Amendements de « ${titreTexte} »`}
            noCaption
            headers={[
              "Numéro",
              "Article visé",
              "Sort",
              "Verdict agent (indicatif)",
              "Déposé le",
            ]}
            data={donnees}
            bordered
          />
          <Button priority="secondary" onClick={exporterCsv}>
            Exporter la page (CSV)
          </Button>
        </>
      )}
    </section>
  );
}
