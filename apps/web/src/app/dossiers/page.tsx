// Page 1 — Dossiers législatifs : liste des textes (GET /texts, kind=BILL).
// Server component ; filtres portés par l'URL (formulaire GET, zéro JS client).

import { fr } from "@codegouvfr/react-dsfr";
import Alert from "@codegouvfr/react-dsfr/Alert";
import Badge from "@codegouvfr/react-dsfr/Badge";
import Button from "@codegouvfr/react-dsfr/Button";
import Card from "@codegouvfr/react-dsfr/Card";
import Pagination from "@codegouvfr/react-dsfr/Pagination";
import Select from "@codegouvfr/react-dsfr/SelectNext";
import Tag from "@codegouvfr/react-dsfr/Tag";
import { StartDsfrOnHydration } from "../../dsfr-bootstrap";
import { FilDariane } from "../../components/FilDariane";
import { ApiError, listeTextes, type TexteListe } from "../../lib/api";
import { NATURE_LIBELLE, VERSION_LIBELLE } from "../../lib/libelles";

export const dynamic = "force-dynamic";

const PAGE_TAILLE = 12;

function CarteTexte({ texte }: { texte: TexteListe }) {
  const nb = texte._count.amendments;
  return (
    <Card
      title={texte.title ?? texte.reference ?? texte.externalId}
      titleAs="h3"
      enlargeLink
      linkProps={{ href: `/dossiers/${texte.id}` }}
      start={
        <ul className="fr-badges-group">
          <li>
            <Badge severity="info" noIcon>
              {NATURE_LIBELLE[texte.nature ?? ""] ?? "Texte"}
            </Badge>
          </li>
          {texte.legislature !== null && (
            <li>
              <Badge noIcon>{`${texte.legislature}e législature`}</Badge>
            </li>
          )}
        </ul>
      }
      desc={texte.reference ?? undefined}
      detail={
        texte.version
          ? (VERSION_LIBELLE[texte.version] ?? texte.version)
          : undefined
      }
      end={
        <p className="fr-text--sm fr-mb-0">
          {nb === 0 ? "Aucun amendement" : `${nb} amendement${nb > 1 ? "s" : ""}`}
        </p>
      }
    />
  );
}

export default async function PageDossiers({
  searchParams,
}: {
  searchParams: Promise<{ nature?: string; legislature?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  let contenu: React.ReactNode;
  let pagination: React.ReactNode = null;

  try {
    const { total, items } = await listeTextes({
      nature: params.nature || undefined,
      legislature: params.legislature || undefined,
      take: PAGE_TAILLE,
      skip: (page - 1) * PAGE_TAILLE,
    });

    contenu =
      items.length === 0 ? (
        <Alert
          severity="info"
          title="Aucun texte"
          description="Aucun texte législatif ne correspond à ces critères. Si la base est vide, lancez une ingestion : POST /ingestion/textes-an/run."
        />
      ) : (
        <div className={fr.cx("fr-grid-row", "fr-grid-row--gutters")}>
          {items.map((t) => (
            <div key={t.id} className={fr.cx("fr-col-12", "fr-col-md-6", "fr-col-lg-4")}>
              <CarteTexte texte={t} />
            </div>
          ))}
        </div>
      );

    const nbPages = Math.ceil(total / PAGE_TAILLE);
    if (nbPages > 1) {
      const versPage = (n: number) => {
        const q = new URLSearchParams();
        if (params.nature) q.set("nature", params.nature);
        if (params.legislature) q.set("legislature", params.legislature);
        if (n > 1) q.set("page", String(n));
        const chaine = q.toString();
        return { href: `/dossiers${chaine ? `?${chaine}` : ""}` };
      };
      pagination = (
        <Pagination
          className={fr.cx("fr-mt-4w")}
          count={nbPages}
          defaultPage={page}
          getPageLinkProps={versPage}
          showFirstLast
        />
      );
    }
  } catch (e) {
    contenu = (
      <Alert
        severity="error"
        title="API injoignable"
        description={
          e instanceof ApiError
            ? e.message
            : "Erreur inattendue lors de l'appel à l'API."
        }
      />
    );
  }

  return (
    <div className={fr.cx("fr-container", "fr-mb-6w")}>
      <StartDsfrOnHydration />
      <FilDariane courant="Dossiers législatifs" />
      <h1>Dossiers législatifs</h1>
      <p className={fr.cx("fr-text--lead")}>
        Textes déposés à l'Assemblée nationale et leurs liasses d'amendements.
      </p>

      <form method="get" action="/dossiers" className={fr.cx("fr-grid-row", "fr-grid-row--bottom", "fr-grid-row--gutters", "fr-mb-3w")}>
        <div className={fr.cx("fr-col-12", "fr-col-md-4")}>
          <Select
            label="Nature du texte"
            nativeSelectProps={{ name: "nature", defaultValue: params.nature ?? "" }}
            options={[
              { value: "", label: "Toutes les natures" },
              ...Object.entries(NATURE_LIBELLE).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
        </div>
        <div className={fr.cx("fr-col-12", "fr-col-md-3")}>
          <Select
            label="Législature"
            nativeSelectProps={{
              name: "legislature",
              defaultValue: params.legislature ?? "",
            }}
            options={[
              { value: "", label: "Toutes" },
              { value: "17", label: "17e" },
              { value: "16", label: "16e" },
            ]}
          />
        </div>
        <div className={fr.cx("fr-col-12", "fr-col-md-3")}>
          <Button priority="secondary" nativeButtonProps={{ type: "submit" }}>
            Filtrer
          </Button>
        </div>
      </form>

      {(params.nature || params.legislature) && (
        <p>
          <Tag as="a" linkProps={{ href: "/dossiers" }}>
            Réinitialiser les filtres
          </Tag>
        </p>
      )}

      {contenu}
      {pagination}
    </div>
  );
}
