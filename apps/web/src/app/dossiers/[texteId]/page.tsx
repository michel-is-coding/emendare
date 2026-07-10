// Page 2 — Classification : un texte et sa liasse d'amendements.
// Server component : GET /texts/:id + /texts/:id/stats (compteurs sur toute la
// liasse) + /texts/:id/amendments filtré serveur par les searchParams.

import { notFound } from "next/navigation";
import { fr } from "@codegouvfr/react-dsfr";
import Alert from "@codegouvfr/react-dsfr/Alert";
import Badge from "@codegouvfr/react-dsfr/Badge";
import Pagination from "@codegouvfr/react-dsfr/Pagination";
import Tag from "@codegouvfr/react-dsfr/Tag";
import { StartDsfrOnHydration } from "../../../dsfr-bootstrap";
import { FilDariane } from "../../../components/FilDariane";
import {
  ApiError,
  amendementsDuTexte,
  detailTexte,
  statsTexte,
  type FiltresLiasse,
  type StatsTexte,
} from "../../../lib/api";
import { NATURE_LIBELLE, VERSION_LIBELLE } from "../../../lib/libelles";
import { Liasse } from "./Liasse";

export const dynamic = "force-dynamic";

const PAGE_TAILLE = 50;

type Recherche = {
  page?: string;
  q?: string;
  sort?: string;
  verdict?: string;
  orderBy?: string;
};

function versFiltres(sp: Recherche): FiltresLiasse {
  return {
    q: sp.q?.trim() || undefined,
    sort: sp.sort || undefined,
    verdict:
      sp.verdict === "RECEVABLE" || sp.verdict === "IRRECEVABLE"
        ? sp.verdict
        : undefined,
    orderBy: sp.orderBy === "dateDepot" ? "dateDepot" : undefined,
  };
}

/** Compteurs du bandeau : total / adoptés / irrecevables / à instruire (tbd n°2). */
function compteurs(stats: StatsTexte) {
  let adoptes = 0;
  let irrecevables = 0;
  let aInstruire = 0;
  for (const g of stats.parSort) {
    const s = g.sort?.trim().toLowerCase();
    if (!s) aInstruire += g.count;
    else if (s.includes("irrecevable")) irrecevables += g.count;
    else if (s.includes("adopté")) adoptes += g.count;
  }
  return { adoptes, irrecevables, aInstruire };
}

export default async function PageTexte({
  params,
  searchParams,
}: {
  params: Promise<{ texteId: string }>;
  searchParams: Promise<Recherche>;
}) {
  const { texteId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filtres = versFiltres(sp);

  try {
    const [texte, stats, liasse] = await Promise.all([
      detailTexte(texteId),
      statsTexte(texteId),
      amendementsDuTexte(texteId, {
        ...filtres,
        take: PAGE_TAILLE,
        skip: (page - 1) * PAGE_TAILLE,
      }),
    ]);

    const titre = texte.title ?? texte.reference ?? texte.externalId;
    const nbPages = Math.ceil(liasse.total / PAGE_TAILLE);
    const nb = compteurs(stats);

    const lienPage = (n: number) => {
      const q = new URLSearchParams();
      if (filtres.q) q.set("q", filtres.q);
      if (filtres.sort) q.set("sort", filtres.sort);
      if (filtres.verdict) q.set("verdict", filtres.verdict);
      if (filtres.orderBy) q.set("orderBy", filtres.orderBy);
      if (n > 1) q.set("page", String(n));
      const qs = q.toString();
      return `/dossiers/${texteId}${qs ? `?${qs}` : ""}`;
    };

    return (
      <div className={fr.cx("fr-container", "fr-mb-6w")}>
        <StartDsfrOnHydration />
        <FilDariane
          segments={[{ label: "Dossiers législatifs", href: "/dossiers" }]}
          courant={titre}
        />
        <h1 className={fr.cx("fr-mb-1w")}>{titre}</h1>
        <ul className="fr-badges-group fr-mb-2w">
          <li>
            <Badge severity="info" noIcon>
              {NATURE_LIBELLE[texte.nature ?? ""] ?? "Texte"}
            </Badge>
          </li>
          {texte.version && (
            <li>
              <Badge noIcon>{VERSION_LIBELLE[texte.version] ?? texte.version}</Badge>
            </li>
          )}
          {texte.legislature !== null && (
            <li>
              <Badge noIcon>{`${texte.legislature}e législature`}</Badge>
            </li>
          )}
          {texte.reference && (
            <li>
              <Badge noIcon>{texte.reference}</Badge>
            </li>
          )}
        </ul>

        {texte.versions.length > 0 && (
          <p className={fr.cx("fr-text--sm")}>
            Autres versions de la navette :{" "}
            {texte.versions.map((v, i) => (
              <span key={v.id}>
                {i > 0 && " · "}
                <a href={`/dossiers/${v.id}`}>
                  {VERSION_LIBELLE[v.version ?? ""] ?? v.version ?? v.externalId}
                </a>
              </span>
            ))}
          </p>
        )}

        {texte.referencedTexts.length > 0 && (
          <ul className="fr-tags-group fr-mb-3w" aria-label="Textes visés par les amendements">
            {texte.referencedTexts.slice(0, 12).map((r) => (
              <li key={r.texteSource}>
                <Tag small>
                  {r.texteSource} ({r.count})
                </Tag>
              </li>
            ))}
          </ul>
        )}

        <ul
          className="fr-badges-group fr-mb-3w"
          aria-label="Compteurs sur toute la liasse"
        >
          <li>
            <Badge noIcon>{`${stats.total} amendements`}</Badge>
          </li>
          <li>
            <Badge severity="success" noIcon>{`${nb.adoptes} adoptés`}</Badge>
          </li>
          <li>
            <Badge severity="error" noIcon>
              {`${nb.irrecevables} irrecevables`}
            </Badge>
          </li>
          <li>
            <Badge severity="info" noIcon>{`${nb.aInstruire} à instruire`}</Badge>
          </li>
        </ul>

        <Liasse
          texteId={texteId}
          titreTexte={titre}
          items={liasse.items}
          total={liasse.total}
          stats={stats}
          filtres={filtres}
        />

        {nbPages > 1 && (
          <Pagination
            className={fr.cx("fr-mt-4w")}
            count={nbPages}
            defaultPage={page}
            getPageLinkProps={(n) => ({ href: lienPage(n) })}
            showFirstLast
          />
        )}
      </div>
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return (
      <div className={fr.cx("fr-container", "fr-mb-6w")}>
        <StartDsfrOnHydration />
        <FilDariane
          segments={[{ label: "Dossiers législatifs", href: "/dossiers" }]}
          courant="Texte"
        />
        <Alert
          severity="error"
          title="API injoignable"
          description={
            e instanceof ApiError
              ? e.message
              : "Erreur inattendue lors de l'appel à l'API."
          }
        />
      </div>
    );
  }
}
