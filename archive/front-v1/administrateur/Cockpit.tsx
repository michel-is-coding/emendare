"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fr } from "@codegouvfr/react-dsfr";
import {
  amendements,
  type Amendement,
  type Decision,
  type Lecture,
} from "../../data/fixtures";
import { normaliser } from "../../lib/lexique";
import { Focus } from "./Focus";
import { FILTRES_VIDES, VueEnsemble, type Filtres, type Tri } from "./VueEnsemble";

const colors = fr.colors.decisions;

type Vue = { mode: "liste" } | { mode: "focus"; numero: string };

function correspond(
  a: Amendement,
  recherche: string,
  filtres: Filtres,
  decisions: Record<string, Decision>,
): boolean {
  if (recherche.trim()) {
    const q = normaliser(recherche.trim());
    const cible = normaliser(
      `${a.numero} ${a.auteur} ${a.groupe} ${a.article_vise} ${a.objet_resume}`,
    );
    if (!cible.includes(q)) return false;
  }
  if (filtres.article && a.article_vise !== filtres.article) return false;
  if (filtres.groupe && a.groupe !== filtres.groupe) return false;
  if (filtres.etape && a.etape !== filtres.etape) return false;
  if (filtres.charge || filtres.ressource) {
    const s40 = a.signaux_recevabilite.article_40;
    const garde =
      (filtres.charge && s40 === "signal_charge") ||
      (filtres.ressource && s40 === "signal_ressource");
    if (!garde) return false;
  }
  if (filtres.statut === "a_traiter" && decisions[a.numero]) return false;
  if (filtres.statut === "traites" && !decisions[a.numero]) return false;
  return true;
}

const comparer =
  (tri: Tri) =>
  (a: Amendement, b: Amendement): number => {
    if (tri.col === "numero")
      return a.numero.localeCompare(b.numero, "fr", { numeric: true }) * tri.sens;
    if (tri.col === "article_vise")
      return (
        (a.article_vise.localeCompare(b.article_vise, "fr", { numeric: true }) ||
          a.ordre_appel - b.ordre_appel) * tri.sens
      );
    return (a.ordre_appel - b.ordre_appel) * tri.sens;
  };

// ── rail gauche : fond apaisé (décision alt), item actif contrasté (bordure + fond) ──
function Rail({
  open,
  onToggle,
  mode,
  numeroCourant,
  onVueEnsemble,
}: {
  open: boolean;
  onToggle: () => void;
  mode: "liste" | "focus";
  numeroCourant: string | null;
  onVueEnsemble: () => void;
}) {
  const itemActif = {
    borderLeft: `3px solid ${colors.text.title.blueFrance.default}`,
    backgroundColor: colors.background.contrast.blueFrance.default,
    fontWeight: 700,
  } as const;
  const itemInactif = { borderLeft: "3px solid transparent" } as const;
  return (
    <nav
      aria-label="Navigation du cockpit"
      style={{
        backgroundColor: colors.background.alt.blueFrance.default,
        color: colors.text.default.grey.default,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <button
        onClick={onToggle}
        aria-label={open ? "Replier le menu" : "Déplier le menu"}
        style={{
          background: "none",
          border: 0,
          color: "inherit",
          fontSize: 18,
          cursor: "pointer",
          padding: fr.spacing("2v"),
          textAlign: "left",
        }}
      >
        ☰
      </button>
      {open && (
        <>
          <Link
            href="/"
            style={{
              color: colors.text.title.blueFrance.default,
              fontWeight: 700,
              padding: fr.spacing("2v"),
              backgroundImage: "none",
            }}
          >
            emendare
          </Link>
          <button
            onClick={onVueEnsemble}
            aria-current={mode === "liste" ? "page" : undefined}
            style={{
              ...(mode === "liste" ? itemActif : itemInactif),
              background: mode === "liste" ? itemActif.backgroundColor : "none",
              borderTop: 0,
              borderRight: 0,
              borderBottom: 0,
              color: "inherit",
              cursor: "pointer",
              padding: fr.spacing("2v"),
              textAlign: "left",
              fontSize: "0.8125rem",
              whiteSpace: "nowrap",
            }}
          >
            Vue d&apos;ensemble
          </button>
          <div
            aria-current={mode === "focus" ? "page" : undefined}
            style={{
              ...(mode === "focus" ? itemActif : itemInactif),
              padding: fr.spacing("2v"),
              fontSize: "0.8125rem",
              whiteSpace: "nowrap",
              color: mode === "focus" ? "inherit" : colors.text.mention.grey.default,
            }}
          >
            Traitement
            {mode === "focus" && numeroCourant && (
              <>
                <br />
                <span style={{ opacity: 0.7, fontSize: "0.6875rem" }}>{numeroCourant}</span>
              </>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ padding: fr.spacing("2v"), fontSize: "0.75rem", opacity: 0.8 }}>
            Administrateur
            <br />
            Commission des finances
          </div>
        </>
      )}
    </nav>
  );
}

export function Cockpit() {
  const [vue, setVue] = useState<Vue>({ mode: "liste" });
  const [railOpen, setRailOpen] = useState(true);
  const [lecture, setLecture] = useState<Lecture>("premiere");
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [recherche, setRecherche] = useState("");
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_VIDES);
  const [tri, setTri] = useState<Tri>({ col: "ordre_appel", sens: 1 });
  const [selection, setSelection] = useState<string[]>([]);
  const [retourNumero, setRetourNumero] = useState<string | null>(null);
  const [lot, setLot] = useState<{
    message: string;
    avant: Record<string, Decision | undefined>;
  } | null>(null);

  const visibles = amendements
    .filter((a) => correspond(a, recherche, filtres, decisions))
    .sort(comparer(tri));

  const courant =
    vue.mode === "focus" ? amendements.find((a) => a.numero === vue.numero) : undefined;
  const idx = courant ? visibles.findIndex((a) => a.numero === courant.numero) : -1;

  const ouvrir = (numero: string) => setVue({ mode: "focus", numero });
  const retour = () => {
    if (vue.mode === "focus") setRetourNumero(vue.numero);
    setVue({ mode: "liste" });
  };

  const enregistrerDecision = (numero: string, d: Decision | null) => {
    // toute décision manuelle invalide l'annulation du lot : l'instantané serait périmé
    setLot(null);
    setDecisions((prev) => {
      const suivant = { ...prev };
      if (d) suivant[numero] = d;
      else delete suivant[numero];
      return suivant;
    });
  };

  const appliquerLot = (numeros: string[], d: Decision, message: string) => {
    setLot({ message, avant: Object.fromEntries(numeros.map((n) => [n, decisions[n]])) });
    setDecisions((prev) => ({
      ...prev,
      ...Object.fromEntries(numeros.map((n) => [n, d])),
    }));
    setSelection([]);
  };

  const annulerLot = () => {
    if (!lot) return;
    setDecisions((prev) => {
      const suivant = { ...prev };
      for (const [numero, ancienne] of Object.entries(lot.avant)) {
        if (ancienne) suivant[numero] = ancienne;
        else delete suivant[numero];
      }
      return suivant;
    });
    setLot(null);
  };

  // navigation clavier : ← → et Échap en vue focus ; ↑ ↓ et « x » en vue d'ensemble.
  // Pas de tableau de dépendances : réabonnement à chaque rendu, fermeture toujours fraîche.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cible = e.target;
      if (
        cible instanceof HTMLInputElement ||
        cible instanceof HTMLTextAreaElement ||
        cible instanceof HTMLSelectElement
      )
        return;
      if (vue.mode === "focus") {
        if (e.key === "ArrowLeft" && idx > 0)
          setVue({ mode: "focus", numero: visibles[idx - 1].numero });
        if (e.key === "ArrowRight" && idx >= 0 && idx < visibles.length - 1)
          setVue({ mode: "focus", numero: visibles[idx + 1].numero });
        if (e.key === "Escape") retour();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const boutons = [
          ...document.querySelectorAll<HTMLButtonElement>("[data-ligne-ouvrir]"),
        ];
        if (boutons.length === 0) return;
        e.preventDefault();
        const actuel = boutons.findIndex(
          (b) => b === document.activeElement || b.closest("tr")?.contains(document.activeElement),
        );
        const suivant =
          e.key === "ArrowDown"
            ? Math.min(boutons.length - 1, actuel + 1)
            : Math.max(0, actuel <= 0 ? 0 : actuel - 1);
        boutons[suivant]?.focus();
      }
      if (e.key === "x" || e.key === "X") {
        const ligne = document.activeElement?.closest("tr");
        ligne?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${railOpen ? 200 : 48}px 1fr`,
        height: "100vh",
        transition: "grid-template-columns .2s",
      }}
    >
      <Rail
        open={railOpen}
        onToggle={() => setRailOpen(!railOpen)}
        mode={courant ? "focus" : "liste"}
        numeroCourant={courant?.numero ?? null}
        onVueEnsemble={retour}
      />
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {courant ? (
          <Focus
            key={courant.numero}
            a={courant}
            decision={decisions[courant.numero]}
            decisions={decisions}
            lecture={lecture}
            position={{ idx, total: visibles.length }}
            onPrecedent={() => idx > 0 && setVue({ mode: "focus", numero: visibles[idx - 1].numero })}
            onSuivant={() =>
              idx >= 0 &&
              idx < visibles.length - 1 &&
              setVue({ mode: "focus", numero: visibles[idx + 1].numero })
            }
            onRetour={retour}
            onDecision={(d) => enregistrerDecision(courant.numero, d)}
          />
        ) : (
          <VueEnsemble
            visibles={visibles}
            decisions={decisions}
            recherche={recherche}
            onRecherche={setRecherche}
            filtres={filtres}
            onFiltres={setFiltres}
            tri={tri}
            onTri={setTri}
            lecture={lecture}
            onLecture={setLecture}
            selection={selection}
            onSelection={setSelection}
            retourNumero={retourNumero}
            onOuvrir={ouvrir}
            onLot={appliquerLot}
            lot={lot}
            onAnnulerLot={annulerLot}
          />
        )}
      </div>
    </div>
  );
}
