"use client";

// Décision humaine motivée et réversible (axe cockpit v2). État local uniquement :
// l'API n'a pas d'écriture du sort (front-functionalities-tbd n°1), la bannière le dit.

import { useState } from "react";
import { fr } from "@codegouvfr/react-dsfr";
import Alert from "@codegouvfr/react-dsfr/Alert";
import Badge from "@codegouvfr/react-dsfr/Badge";
import Button from "@codegouvfr/react-dsfr/Button";
import Input from "@codegouvfr/react-dsfr/Input";
import RadioButtons from "@codegouvfr/react-dsfr/RadioButtons";
import Select from "@codegouvfr/react-dsfr/SelectNext";
import {
  AUTRES_SORTS,
  MOTIF_FONDEMENT,
  MOTIF_TYPES,
  type Decision,
  type DecisionSort,
  type MotifType,
} from "../../../../../data/fixtures";
import type { VerdictAgent } from "../../../../../lib/api";

export function PanneauDecision({ verdict }: { verdict: VerdictAgent | null }) {
  const [sort, setSort] = useState<DecisionSort>("recevable");
  const [motifType, setMotifType] = useState<MotifType | "">("");
  const [motifTexte, setMotifTexte] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);

  const valider = () => {
    if (sort === "irrecevable" && !motifType) return;
    setDecision({
      sort,
      motifType: sort === "irrecevable" && motifType ? motifType : undefined,
      motifTexte: sort === "irrecevable" ? motifTexte : undefined,
    });
  };

  const reprendrePreconisation = () => {
    if (!verdict || verdict.sort !== "IRRECEVABLE") return;
    setSort("irrecevable");
    setMotifTexte(verdict.justificatif);
  };

  if (decision) {
    return (
      <section aria-label="Décision" className={fr.cx("fr-mb-4w")}>
        <h2 className={fr.cx("fr-h5")}>Décision</h2>
        <p>
          <Badge
            as="span"
            severity={decision.sort === "irrecevable" ? "error" : decision.sort === "recevable" ? "success" : undefined}
            noIcon
          >
            {decision.sort}
          </Badge>
        </p>
        {decision.motifType && (
          <p className={fr.cx("fr-text--sm", "fr-mb-1w")}>
            <strong>{decision.motifType}</strong>
            <br />
            {MOTIF_FONDEMENT[decision.motifType]}
          </p>
        )}
        {decision.motifTexte && (
          <p className={fr.cx("fr-text--sm")}>{decision.motifTexte}</p>
        )}
        <Button priority="secondary" onClick={() => setDecision(null)}>
          Revenir sur la décision
        </Button>
        <Alert
          className={fr.cx("fr-mt-2w")}
          severity="warning"
          small
          description="Décision non persistée : elle sera perdue en quittant la page (écriture côté API à créer, voir front-functionalities-tbd n°1)."
        />
      </section>
    );
  }

  return (
    <section aria-label="Décision" className={fr.cx("fr-mb-4w")}>
      <h2 className={fr.cx("fr-h5")}>Décision</h2>

      {verdict?.sort === "IRRECEVABLE" && (
        <Button
          priority="tertiary"
          className={fr.cx("fr-mb-2w")}
          onClick={reprendrePreconisation}
        >
          Reprendre la préconisation de l'agent
        </Button>
      )}

      <RadioButtons
        legend="Sort de l'amendement"
        name="sort"
        small
        options={(["recevable", "irrecevable", ...AUTRES_SORTS] as DecisionSort[]).map(
          (s) => ({
            label: s,
            nativeInputProps: {
              checked: sort === s,
              onChange: () => setSort(s),
            },
          }),
        )}
      />

      {sort === "irrecevable" && (
        <>
          <Select
            label="Motif (obligatoire)"
            nativeSelectProps={{
              value: motifType,
              onChange: (e) => setMotifType(e.target.value as MotifType | ""),
            }}
            options={[
              { value: "", label: "Choisir un motif" },
              ...MOTIF_TYPES.map((m) => ({ value: m, label: m })),
            ]}
            state={motifType ? "default" : "error"}
            stateRelatedMessage={
              motifType
                ? undefined
                : "Une irrecevabilité se motive toujours."
            }
          />
          {motifType && (
            <p className={fr.cx("fr-hint-text")}>{MOTIF_FONDEMENT[motifType]}</p>
          )}
          <Input
            label="Motivation (notifiée à l'auteur)"
            textArea
            nativeTextAreaProps={{
              value: motifTexte,
              onChange: (e) => setMotifTexte(e.target.value),
              rows: 4,
            }}
          />
        </>
      )}

      <Button
        onClick={valider}
        disabled={sort === "irrecevable" && !motifType}
      >
        Valider la décision
      </Button>
    </section>
  );
}
