// Page 3 — Cockpit : analyse d'un amendement.
// Server component ; fetchs parallèles : détail + dernier verdict agent.
// Blocs (workflow.md) : (i) texte surligné lexique art. 40, (ii) renvois au droit
// consolidé, (iii) similaires (pgvector), (iv) verdict agent + décision humaine.

import { notFound } from "next/navigation";
import { fr } from "@codegouvfr/react-dsfr";
import Accordion from "@codegouvfr/react-dsfr/Accordion";
import Alert from "@codegouvfr/react-dsfr/Alert";
import Badge from "@codegouvfr/react-dsfr/Badge";
import Tag from "@codegouvfr/react-dsfr/Tag";
import { StartDsfrOnHydration } from "../../../../../dsfr-bootstrap";
import { FilDariane } from "../../../../../components/FilDariane";
import { BadgeSort } from "../../../../../components/BadgeSort";
import { TexteMarque } from "../../../../../components/RedFlag";
import {
  ApiError,
  dernierVerdict,
  detailAmendement,
  detailTexte,
} from "../../../../../lib/api";
import { htmlVersTexte } from "../../../../../lib/html";
import { marquerTexte } from "../../../../../lib/lexique";
import { dateFr } from "../../../../../lib/recevabilite";
import { PanneauAnalyse } from "./PanneauAnalyse";
import { PanneauDecision } from "./PanneauDecision";
import { Similaires } from "./Similaires";

export const dynamic = "force-dynamic";

export default async function PageAmendement({
  params,
}: {
  params: Promise<{ texteId: string; amendementId: string }>;
}) {
  const { texteId, amendementId } = await params;

  try {
    const [amendement, verdict, texte] = await Promise.all([
      detailAmendement(amendementId),
      dernierVerdict(amendementId).catch(() => null),
      detailTexte(texteId).catch(() => null),
    ]);

    const titreTexte =
      texte?.title ?? texte?.reference ?? amendement.texteRef ?? "Texte";
    const numero = amendement.numero ?? "—";
    const dispositif = marquerTexte(htmlVersTexte(amendement.content));
    const expose = amendement.exposeSommaire
      ? marquerTexte(htmlVersTexte(amendement.exposeSommaire))
      : null;
    const nbSignales = dispositif.filter((s) => s.kind === "redflag").length +
      (expose?.filter((s) => s.kind === "redflag").length ?? 0);

    return (
      <div className={fr.cx("fr-container", "fr-mb-6w")}>
        <StartDsfrOnHydration />
        <FilDariane
          segments={[
            { label: "Dossiers législatifs", href: "/dossiers" },
            { label: titreTexte, href: `/dossiers/${texteId}` },
          ]}
          courant={`Amendement n° ${numero}`}
        />

        <h1 className={fr.cx("fr-mb-1w")}>Amendement n° {numero}</h1>
        <ul className="fr-badges-group fr-mb-1w">
          <li>
            <BadgeSort sort={amendement.sort} />
          </li>
          {amendement.etat && (
            <li>
              <Badge noIcon>{amendement.etat}</Badge>
            </li>
          )}
          {amendement.soumisArticle40 && (
            <li>
              <Badge severity="warning" noIcon>
                soumis à l'article 40
              </Badge>
            </li>
          )}
        </ul>
        <ul className="fr-tags-group fr-mb-3w">
          {amendement.articleReference && (
            <li>
              <Tag small>{amendement.articleReference}</Tag>
            </li>
          )}
          {amendement.auteurRef && (
            <li>
              <Tag
                small
                title="Référence acteur de l'open data AN, libellé non résolu"
              >
                auteur : {amendement.auteurRef}
              </Tag>
            </li>
          )}
          {amendement.groupePolitiqueRef && (
            <li>
              <Tag
                small
                title="Référence organe de l'open data AN, libellé non résolu"
              >
                groupe : {amendement.groupePolitiqueRef}
              </Tag>
            </li>
          )}
          {amendement.dateDepot && (
            <li>
              <Tag small>déposé le {dateFr(amendement.dateDepot.slice(0, 10))}</Tag>
            </li>
          )}
        </ul>

        <div className={fr.cx("fr-grid-row", "fr-grid-row--gutters")}>
          <div className={fr.cx("fr-col-12", "fr-col-md-8")}>
            <h2 className={fr.cx("fr-h4")}>Dispositif</h2>
            {nbSignales > 0 && (
              <p className={fr.cx("fr-hint-text")}>
                {nbSignales} mot{nbSignales > 1 ? "s" : ""} du lexique article 40
                surligné{nbSignales > 1 ? "s" : ""}. La présence d'un mot fait
                naître un soupçon ; la qualification revient à l'administrateur.
              </p>
            )}
            <div
              className={fr.cx("fr-text--sm", "fr-mb-3w")}
              style={{ whiteSpace: "pre-wrap" }}
            >
              <TexteMarque segments={dispositif} />
            </div>

            {expose && (
              <Accordion label="Exposé sommaire" defaultExpanded>
                <div style={{ whiteSpace: "pre-wrap" }}>
                  <TexteMarque segments={expose} />
                </div>
              </Accordion>
            )}

            {amendement.references.length > 0 && (
              <Accordion label={`Renvois au droit en vigueur (${amendement.references.length})`}>
                <ul>
                  {amendement.references.map((r) => (
                    <li key={r.id} className={fr.cx("fr-mb-1w")}>
                      <p className={fr.cx("fr-mb-0")}>
                        {r.rawCitation}
                        {r.typeModification && (
                          <Badge as="span" className={fr.cx("fr-ml-1w")} small noIcon>
                            {r.typeModification}
                          </Badge>
                        )}
                      </p>
                      <p className={fr.cx("fr-hint-text", "fr-mb-0")}>
                        {r.consolidatedText
                          ? `Résolu : ${r.consolidatedText.title ?? r.consolidatedText.externalId}`
                          : "Texte consolidé non résolu (dump Légifrance non ingéré) ; le diff avant/après viendra avec lui (front-functionalities-tbd n°9)."}
                      </p>
                    </li>
                  ))}
                </ul>
              </Accordion>
            )}

            <PanneauAnalyse amendementId={amendementId} verdictInitial={verdict} />
          </div>

          <div className={fr.cx("fr-col-12", "fr-col-md-4")}>
            <PanneauDecision verdict={verdict} />
            <Similaires amendementId={amendementId} />
          </div>
        </div>
      </div>
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return (
      <div className={fr.cx("fr-container", "fr-mb-6w")}>
        <StartDsfrOnHydration />
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
