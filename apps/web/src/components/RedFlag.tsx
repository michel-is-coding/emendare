// Surlignage des mots du lexique article 40 (recette c du skill dsfr) : tokens
// DSFR uniquement, angles droits (le zéro border-radius est un signal de marque).

import type { ReactNode } from "react";
import { fr } from "@codegouvfr/react-dsfr";
import type { Segment } from "../data/fixtures";

export function RedFlag({ children, tip }: { children: ReactNode; tip?: string }) {
  return (
    <mark
      title={tip}
      style={{
        backgroundColor: fr.colors.decisions.background.contrast.warning.default,
        color: fr.colors.decisions.text.default.warning.default,
        padding: "0 0.15em",
      }}
    >
      {children}
    </mark>
  );
}

// rendu d'un texte segmenté par lib/lexique.ts (marquerTexte / marquerLexique)
export function TexteMarque({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        s.kind === "redflag" ? (
          <RedFlag key={i} tip={s.tip}>
            {s.text}
          </RedFlag>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}
