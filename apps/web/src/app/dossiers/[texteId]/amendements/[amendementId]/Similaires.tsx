// Bloc (iii) : amendements similaires (pgvector), classés par ressemblance.
// Server component ; sans embedding l'API répond 409 → alerte informative.

import { fr } from "@codegouvfr/react-dsfr";
import Alert from "@codegouvfr/react-dsfr/Alert";
import { BadgeSort } from "../../../../../components/BadgeSort";
import { ApiError, similaires } from "../../../../../lib/api";

export async function Similaires({ amendementId }: { amendementId: string }) {
  let contenu: React.ReactNode;

  try {
    const { items } = await similaires(amendementId, 8);
    contenu =
      items.length === 0 ? (
        <p className={fr.cx("fr-text--sm")}>Aucun amendement similaire trouvé.</p>
      ) : (
        <ul className={fr.cx("fr-raw-list")}>
          {items.map((s) => (
            <li
              key={s.id}
              className={fr.cx("fr-py-1w")}
              style={{
                borderBottom: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
              }}
            >
              <p className={fr.cx("fr-text--sm", "fr-mb-0")}>
                <strong>{s.similarityPct} %</strong> · n° {s.numero ?? "—"}
                {s.texteRef !== null && ` · ${s.texteRef}`}
              </p>
              <p className={fr.cx("fr-text--xs", "fr-mb-0")}>
                {s.articleReference ?? "article non précisé"} ·{" "}
                <BadgeSort sort={s.sort} small />
              </p>
            </li>
          ))}
        </ul>
      );
  } catch (e) {
    contenu =
      e instanceof ApiError && (e.status === 409 || e.status === 503) ? (
        <Alert
          severity="info"
          small
          description="Similarité indisponible : embeddings non calculés pour cet amendement (ingestion amendment-embeddings et clé EMBEDDING_API_KEY requises)."
        />
      ) : (
        <Alert
          severity="error"
          small
          description={
            e instanceof ApiError ? e.message : "Erreur lors de la recherche de similaires."
          }
        />
      );
  }

  return (
    <section aria-label="Amendements similaires">
      <h2 className={fr.cx("fr-h5")}>Similaires et précédents</h2>
      {contenu}
    </section>
  );
}
