import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startReactDsfr } from "@codegouvfr/react-dsfr/spa";
import "@codegouvfr/react-dsfr/main.css";
import { App } from "./App";

// react-dsfr SPA init — loads DSFR runtime, Marianne/Spectral fonts, theme tokens.
// Fonts + icons are served from /dsfr (copied by `copy-dsfr-to-public` postinstall).
startReactDsfr({ defaultColorScheme: "system" });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
