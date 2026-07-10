import { Header } from "@codegouvfr/react-dsfr/Header";
import { Tile } from "@codegouvfr/react-dsfr/Tile";
import { StartDsfrOnHydration } from "../dsfr-bootstrap";

export default function Accueil() {
  return (
    <>
      <StartDsfrOnHydration />
      <Header
        brandTop={
          <>
            République
            <br />
            Française
          </>
        }
        homeLinkProps={{ href: "/", title: "Accueil : emendare, Assemblée nationale" }}
        serviceTitle="emendare"
        serviceTagline="Assemblée nationale · traitement des amendements"
      />
      <main className="fr-container fr-py-6w">
        <h1>Choisissez votre espace</h1>
        <p className="fr-text--lead">Deux entrées, deux métiers.</p>
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col-12 fr-col-md-6">
            <Tile
              title="Administrateur"
              titleAs="h2"
              desc="Dossiers législatifs puis cockpit de traitement : étudier chaque amendement, déterminer sa recevabilité, motiver le sort."
              linkProps={{ href: "/administrateur/dossiers" }}
              enlargeLinkOrButton
              orientation="vertical"
            />
          </div>
          <div className="fr-col-12 fr-col-md-6">
            <Tile
              title="Député"
              titleAs="h2"
              desc="Tester la fiabilité d'un amendement avant dépôt : risque de refus et raisons probables."
              linkProps={{ href: "/depute" }}
              enlargeLinkOrButton
              orientation="vertical"
            />
          </div>
        </div>
      </main>
    </>
  );
}
