// Badges de sort : sémantique couleur du cockpit v2 — irrecevable = error,
// adopté = success, sorts constatés (retiré, tombé, non soutenu) = neutre,
// rien d'instruit = info. Le verdict agent est toujours étiqueté « indicatif ».

import Badge from "@codegouvfr/react-dsfr/Badge";
import type { VerdictAgent, VerdictListe } from "../lib/api";

type Severite = "success" | "warning" | "error" | "info" | undefined;

function severiteSort(sort: string): Severite {
  const s = sort.toLowerCase();
  if (s.includes("irrecevable")) return "error";
  if (s.includes("adopté")) return "success";
  return undefined; // rejeté, retiré, tombé, non soutenu : constat, pas un risque
}

export function BadgeSort({
  sort,
  small,
}: {
  sort: string | null | undefined;
  small?: boolean;
}) {
  if (!sort || !sort.trim()) {
    return (
      <Badge as="span" severity="info" small={small} noIcon>
        à instruire
      </Badge>
    );
  }
  return (
    <Badge as="span" severity={severiteSort(sort)} small={small} noIcon>
      {sort}
    </Badge>
  );
}

/** Version compacte pour la colonne « Verdict agent » de la liasse. */
export function BadgeVerdictListe({ verdict }: { verdict: VerdictListe | null }) {
  if (!verdict?.sort) return <>—</>;
  const irrecevable = verdict.sort === "IRRECEVABLE";
  return (
    <Badge
      as="span"
      severity={irrecevable ? "error" : "success"}
      small
      noIcon
    >
      {irrecevable
        ? `Irrecevable${verdict.motifCode ? ` (${verdict.motifCode})` : ""}`
        : "Recevable"}
    </Badge>
  );
}

export function BadgeVerdict({
  verdict,
  small,
}: {
  verdict: VerdictAgent;
  small?: boolean;
}) {
  const irrecevable = verdict.sort === "IRRECEVABLE";
  return (
    <Badge as="span" severity={irrecevable ? "error" : "success"} small={small}>
      {irrecevable
        ? `Irrecevabilité probable${verdict.motifCode ? ` (${verdict.motifCode})` : ""}`
        : "Aucun motif d'irrecevabilité repéré"}
    </Badge>
  );
}
