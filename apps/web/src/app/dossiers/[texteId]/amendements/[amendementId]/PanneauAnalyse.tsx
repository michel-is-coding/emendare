"use client";

// Bloc (iv) : verdict de l'agent de recevabilité (G0→G6), relançable.
// Toujours présenté comme indicatif : l'autorité décide (garde-fou n°4).

import { useState } from "react";
import { fr } from "@codegouvfr/react-dsfr";
import Accordion from "@codegouvfr/react-dsfr/Accordion";
import Alert from "@codegouvfr/react-dsfr/Alert";
import Badge from "@codegouvfr/react-dsfr/Badge";
import Button from "@codegouvfr/react-dsfr/Button";
import CallOut from "@codegouvfr/react-dsfr/CallOut";
import Table from "@codegouvfr/react-dsfr/Table";
import { BadgeVerdict } from "../../../../../components/BadgeSort";
import { ApiError, lancerAnalyse, type VerdictAgent } from "../../../../../lib/api";

export function PanneauAnalyse({
  amendementId,
  verdictInitial,
}: {
  amendementId: string;
  verdictInitial: VerdictAgent | null;
}) {
  const [verdict, setVerdict] = useState<VerdictAgent | null>(verdictInitial);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const lancer = async () => {
    setEnCours(true);
    setErreur(null);
    try {
      setVerdict(await lancerAnalyse(amendementId));
    } catch (e) {
      setErreur(
        e instanceof ApiError ? e.message : "Erreur inattendue pendant l'analyse.",
      );
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section aria-label="Analyse de recevabilité" className={fr.cx("fr-mt-4w")}>
      <h2 className={fr.cx("fr-h4")}>Analyse de recevabilité</h2>

      {erreur && (
        <Alert
          severity="error"
          small
          description={erreur}
          className={fr.cx("fr-mb-2w")}
        />
      )}

      {verdict ? (
        <CallOut
          title={
            <>
              <BadgeVerdict verdict={verdict} />{" "}
              <Badge severity="new" small as="span">
                indicatif · agent
              </Badge>
            </>
          }
        >
          {verdict.justificatif}
          {verdict.motifLibelle && (
            <>
              <br />
              <strong>Motif :</strong> {verdict.motifLibelle}
            </>
          )}
          {verdict.fondement && (
            <>
              <br />
              <strong>Fondement :</strong> {verdict.fondement}
            </>
          )}
          <br />
          <strong>Confiance :</strong> {Math.round(verdict.confiance * 100)} %
          {verdict.fastTrack && " · circuit court (règles déterministes)"}
          {verdict.model && ` · modèle : ${verdict.model}`}
          <br />
          <em>
            Estimation indicative, sous réserve de l'appréciation de l'autorité
            compétente.
          </em>
        </CallOut>
      ) : (
        <CallOut title="Aucune analyse">
          Cet amendement n'a pas encore été analysé par l'agent de recevabilité.
        </CallOut>
      )}

      <Button onClick={lancer} disabled={enCours} priority="primary">
        {enCours
          ? "Analyse en cours…"
          : verdict
            ? "Relancer l'analyse"
            : "Lancer l'analyse"}
      </Button>

      {verdict && verdict.trace.length > 0 && (
        <div className={fr.cx("fr-mt-3w")}>
          <Accordion label={`Trace de l'analyse (${verdict.trace.length} étapes G0 à G6)`}>
            <Table
              caption="Trace de l'agent de recevabilité"
              noCaption
              headers={["Porte", "Règle", "Constat", "Effet"]}
              data={verdict.trace.map((t) => [
                t.gate,
                t.regle,
                t.constat,
                <Badge
                  key={`${t.gate}-${t.regle}`}
                  small
                  noIcon
                  severity={
                    t.effet === "CONCLUT"
                      ? "error"
                      : t.effet === "SIGNAL"
                        ? "warning"
                        : "info"
                  }
                >
                  {t.effet}
                </Badge>,
              ])}
              bordered
            />
          </Accordion>
        </div>
      )}
    </section>
  );
}
