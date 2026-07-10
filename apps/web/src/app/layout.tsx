import type { Metadata } from "next";
import Header from "@codegouvfr/react-dsfr/Header";
import Footer from "@codegouvfr/react-dsfr/Footer";
import SkipLinks from "@codegouvfr/react-dsfr/SkipLinks";
import Notice from "@codegouvfr/react-dsfr/Notice";
import { getHtmlAttributes, DsfrHead } from "../dsfr-bootstrap/server-only-index";
import { DsfrProvider } from "../dsfr-bootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "emendare · analyse et recevabilité des amendements",
  description:
    "Assistant d'analyse et de recevabilité des amendements, Assemblée nationale",
};

const lang = "fr";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html {...getHtmlAttributes({ lang })}>
      <head>
        <DsfrHead
          preloadFonts={["Marianne-Regular", "Marianne-Medium", "Marianne-Bold"]}
        />
      </head>
      <body>
        <DsfrProvider lang={lang}>
          <SkipLinks
            links={[
              { label: "Contenu", anchor: "#contenu" },
              { label: "Pied de page", anchor: "#pied-de-page" },
            ]}
          />
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
              title: "Accueil : emendare, Assemblée nationale",
            }}
            serviceTitle="emendare"
            serviceTagline="Analyse et recevabilité des amendements"
            navigation={[
              {
                text: "Dossiers législatifs",
                linkProps: { href: "/dossiers" },
              },
            ]}
          />
          <Notice
            title="Prototype d'expérimentation."
            description="Les signaux et préconisations sont indicatifs : la décision appartient à l'autorité compétente."
          />
          <main id="contenu">{children}</main>
          <Footer
            id="pied-de-page"
            accessibility="non compliant"
            contentDescription="emendare assiste les administrateurs de l'Assemblée nationale dans l'analyse de la recevabilité des amendements. Prototype fondé sur les données ouvertes de l'Assemblée nationale et de la DILA."
          />
        </DsfrProvider>
      </body>
    </html>
  );
}
