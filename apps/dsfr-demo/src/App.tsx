import { Header } from "@codegouvfr/react-dsfr/Header";
import { Badge } from "@codegouvfr/react-dsfr/Badge";
import { fr } from "@codegouvfr/react-dsfr/fr";
import type { ReactNode } from "react";

// ── Recette c. — surlignage red-flag « article 40 » ────────────────────────────
// Fond + texte = tokens DSFR uniquement (thème clair/sombre géré par le DS). Zéro hex.
function RedFlag({ children }: { children: ReactNode }) {
  return (
    <mark
      style={{
        backgroundColor: fr.colors.decisions.background.contrast.warning.default,
        color: fr.colors.decisions.text.default.warning.default,
        padding: "0 0.15em",
        borderRadius: "0.15em",
      }}
    >
      {children}
    </mark>
  );
}

export function App() {
  return (
    <>
      {/* ── Recette a. — En-tête officiel, bloc-marque RF / Assemblée nationale ── */}
      <Header
        brandTop={
          <>
            République
            <br />
            Française
          </>
        }
        homeLinkProps={{
          href: "/",
          title: "Accueil — emendare, Assemblée nationale",
        }}
        serviceTitle="Assemblée nationale"
        serviceTagline="emendare — triage d'amendements"
      />

      <main role="main" className="fr-container fr-py-6w">
        <h1 className="fr-h2">Triage d'un amendement</h1>
        <p className="fr-text--lead">
          Sort proposé, signaux de recevabilité (art. 40 / 45), red-flags surlignés.
        </p>

        {/* ── Recette b. — Badges de sort ─────────────────────────────────────── */}
        <h2 className="fr-h4 fr-mt-4w">Sort proposé</h2>
        <ul className="fr-badges-group">
          <li>
            <Badge severity="success">Recevable</Badge>
          </li>
          <li>
            <Badge severity="error">Irrecevable</Badge>
          </li>
          <li>
            <Badge severity="info">Point d'attention</Badge>
          </li>
        </ul>

        {/* ── Recette c. — Texte d'amendement avec red-flags art. 40 ──────────── */}
        <h2 className="fr-h4 fr-mt-4w">Texte de l'amendement</h2>
        <blockquote className="fr-quote">
          <p>
            Après l'article 3, il est inséré un article ainsi rédigé : « L'État{" "}
            <RedFlag>verse</RedFlag> à chaque collectivité concernée une{" "}
            <RedFlag>subvention</RedFlag> annuelle, ainsi qu'une{" "}
            <RedFlag>dotation</RedFlag> exceptionnelle destinée à{" "}
            <RedFlag>financer</RedFlag> les travaux de rénovation. »
          </p>
        </blockquote>
        <p className="fr-hint-text">
          Mots surlignés = charge potentielle pour les finances publiques (signal art. 40).
        </p>
      </main>
    </>
  );
}
