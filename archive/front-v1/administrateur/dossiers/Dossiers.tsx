"use client";

// Page « Dossiers législatifs » — portage du design claude.ai/design (Dossiers Législatifs.dc.html).
// Toutes les couleurs passent par des tokens DSFR (`fr.colors.decisions.*`) : zéro hex en dur,
// mode sombre préservé. Les 8 thématiques de commission sont mappées sur les familles
// illustratives DSFR (contrast + label).

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { fr } from "@codegouvfr/react-dsfr";

const c = fr.colors.decisions;

// ── palette structurelle (tokens) ──
const ink = c.text.title.grey.default;
const body = c.text.default.grey.default;
const mention = c.text.mention.grey.default;
const faint = c.text.disabled.grey.default;
const line = c.border.default.grey.default;
const panel = c.background.default.grey.default;
const canvas = c.background.alt.grey.default;
const blue = c.text.title.blueFrance.default;
const blueSoft = c.background.contrast.blueFrance.default;
const track = c.background.alt.grey.hover;

// href de la classification d'une liasse = cockpit administrateur existant
const CLASSIFICATION_HREF = "/administrateur";

type Fam = { label: string; fg: string; bg: string; icon: ReactNode };

const THEMES = {
  finances: {
    label: "Finances",
    fg: c.text.label.yellowMoutarde.default,
    bg: c.background.contrast.yellowMoutarde.default,
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M15.5 8.5a5 5 0 1 0 0 7" /><path d="M4 10.5h8" /><path d="M4 13.5h8" /></svg>,
  },
  culture: {
    label: "Affaires culturelles & éducation",
    fg: c.text.label.pinkMacaron.default,
    bg: c.background.contrast.pinkMacaron.default,
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M3 21h18" /><path d="M5 21V10" /><path d="M9.5 21V10" /><path d="M14.5 21V10" /><path d="M19 21V10" /><path d="M3 10l9-5.5 9 5.5" /></svg>,
  },
  economie: {
    label: "Affaires économiques",
    fg: c.text.label.blueEcume.default,
    bg: c.background.contrast.blueEcume.default,
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M3 21h18" /><path d="M4 21V8l5 3V8l5 3V6l6 4v11" /></svg>,
  },
  durable: {
    label: "Développement durable",
    fg: c.text.label.greenEmeraude.default,
    bg: c.background.contrast.greenEmeraude.default,
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M20 4C10 4 4 10 4 20c9 0 16-5 16-16Z" /><path d="M4.5 19.5c4-8 8.5-11.5 13-13.5" /></svg>,
  },
  social: {
    label: "Affaires sociales",
    fg: c.text.label.orangeTerreBattue.default,
    bg: c.background.contrast.orangeTerreBattue.default,
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="9" cy="7.5" r="3" /><circle cx="17" cy="9.5" r="2.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M15.5 20c0-2 1-3.5 3-3.5s3 1.5 3 3.5" /></svg>,
  },
  lois: {
    label: "Lois & justice",
    fg: c.text.label.blueFrance.default,
    bg: c.background.contrast.blueFrance.default,
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M12 3v18" /><path d="M7 21h10" /><path d="M5 7h14" /><path d="M9 4.4 12 3l3 1.4" /><path d="M5 7l-2.4 5.2a2.7 2.7 0 0 0 4.8 0L5 7Z" /><path d="M19 7l-2.4 5.2a2.7 2.7 0 0 0 4.8 0L19 7Z" /></svg>,
  },
  defense: {
    label: "Défense nationale",
    fg: c.text.label.blueCumulus.default,
    bg: c.background.contrast.blueCumulus.default,
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3Z" /></svg>,
  },
  etrangeres: {
    label: "Affaires étrangères",
    fg: c.text.label.brownCaramel.default,
    bg: c.background.contrast.brownCaramel.default,
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c3 3 3 15 0 18" /><path d="M12 3c-3 3-3 15 0 18" /></svg>,
  },
} as const satisfies Record<string, Fam>;

type ThemeKey = keyof typeof THEMES;

type Stage = { label: string; bg: string; fg: string };
const STAGES = {
  seance: { label: "En séance", bg: c.background.contrast.info.default, fg: c.text.default.info.default },
  commission: { label: "En commission", bg: c.background.contrast.grey.default, fg: mention },
  avenir: { label: "À venir", bg: c.background.contrast.purpleGlycine.default, fg: c.text.label.purpleGlycine.default },
  cloture: { label: "Clôturé", bg: c.background.contrast.success.default, fg: c.text.default.success.default },
} as const satisfies Record<string, Stage>;

type StageKey = keyof typeof STAGES;

const PEOPLE = {
  laurent: { initials: "ML", name: "M. Laurent · vous", color: blue },
  roche: { initials: "CR", name: "Mme Roche", color: c.text.label.purpleGlycine.default },
  bassin: { initials: "PB", name: "M. Bassin", color: c.text.label.blueEcume.default },
  adjani: { initials: "SA", name: "Mme Adjani", color: c.text.label.orangeTerreBattue.default },
  moreau: { initials: "TM", name: "M. Moreau", color: c.text.label.greenEmeraude.default },
  petit: { initials: "LP", name: "Mme Petit", color: c.text.label.pinkMacaron.default },
  naim: { initials: "YN", name: "M. Naïm", color: c.text.label.blueCumulus.default },
} as const;

type PersonKey = keyof typeof PEOPLE;

type Dossier = {
  id: string;
  title: string;
  ref: string;
  lecture: string;
  theme: ThemeKey;
  stage: StageKey;
  total: number;
  traite: number;
  seance: string;
  daysLeft: number;
  team: PersonKey[];
};

const DOSSIERS: Dossier[] = [
  { id: "plf", title: "Projet de loi de finances pour 2026", ref: "PLF n°1680 · déposé le 10 oct. 2025", lecture: "1re lecture · Séance publique", theme: "finances", stage: "seance", total: 2450, traite: 1710, seance: "9 juin", daysLeft: 5, team: ["laurent", "bassin", "roche", "moreau"] },
  { id: "enr", title: "Accélération de la production d'énergies renouvelables", ref: "PJL n°443 · nouvelle lecture", lecture: "Nouvelle lecture · Aff. économiques", theme: "durable", stage: "seance", total: 1248, traite: 936, seance: "12 juin", daysLeft: 8, team: ["bassin", "roche"] },
  { id: "emploi", title: "Pour le plein emploi et l'accompagnement vers l'activité", ref: "PJL n°1528 · 1re lecture", lecture: "1re lecture · Aff. sociales", theme: "social", stage: "commission", total: 1120, traite: 560, seance: "15 juin", daysLeft: 11, team: ["roche", "adjani", "bassin"] },
  { id: "agri", title: "Souveraineté alimentaire & renouvellement agricole", ref: "PJL n°1290 · 1re lecture", lecture: "1re lecture · Aff. économiques", theme: "economie", stage: "commission", total: 960, traite: 480, seance: "16 juin", daysLeft: 12, team: ["adjani", "laurent"] },
  { id: "educ", title: "Refondation des savoirs fondamentaux à l'école", ref: "PPL n°982 · 1re lecture", lecture: "1re lecture · Aff. culturelles", theme: "culture", stage: "commission", total: 540, traite: 189, seance: "18 juin", daysLeft: 14, team: ["adjani"] },
  { id: "justice", title: "Simplification de la procédure & justice du quotidien", ref: "PJL n°1420 · 1re lecture", lecture: "1re lecture · Commission des lois", theme: "lois", stage: "avenir", total: 690, traite: 483, seance: "20 juin", daysLeft: 16, team: ["laurent", "naim"] },
  { id: "indus", title: "Souveraineté industrielle & réindustrialisation", ref: "PJL n°1350 · 1re lecture", lecture: "1re lecture · Aff. économiques", theme: "economie", stage: "avenir", total: 780, traite: 234, seance: "23 juin", daysLeft: 19, team: ["bassin"] },
  { id: "sante", title: "Amélioration de l'accès aux soins & permanence médicale", ref: "PJL n°1600 · 1re lecture", lecture: "1re lecture · Aff. sociales", theme: "social", stage: "avenir", total: 1340, traite: 402, seance: "30 juin", daysLeft: 26, team: ["roche", "bassin", "petit"] },
  { id: "lpm", title: "Programmation militaire 2025-2031", ref: "PJL n°1234 · lecture définitive", lecture: "Lecture définitive · Défense", theme: "defense", stage: "cloture", total: 870, traite: 870, seance: "2 juin", daysLeft: -3, team: ["bassin", "laurent"] },
  { id: "europe", title: "Coopération renforcée & mobilité européenne", ref: "PPL n°870 · 1re lecture", lecture: "1re lecture · Aff. étrangères", theme: "etrangeres", stage: "avenir", total: 210, traite: 63, seance: "25 juin", daysLeft: 21, team: ["roche", "petit"] },
];

const fmt = (n: number) => n.toLocaleString("fr-FR");

function IconBox({ children, bg, fg }: { children: ReactNode; bg: string; fg: string }) {
  return <span style={{ color: fg, background: bg, width: 32, height: 32, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{children}</span>;
}

function deadlineChip(d: Dossier): { style: CSSProperties; label: string } {
  const chip = (bg: string, fg: string): CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
    padding: "3px 8px", background: bg, color: fg,
  });
  if (d.stage === "cloture" || d.daysLeft < 0)
    return { style: chip(c.background.contrast.success.default, c.text.default.success.default), label: `Clôturé · ${d.seance}` };
  const label = `${d.seance} · J-${d.daysLeft}`;
  if (d.daysLeft <= 7) return { style: chip(c.background.contrast.error.default, c.text.default.error.default), label };
  if (d.daysLeft <= 14) return { style: chip(c.background.contrast.warning.default, c.text.default.warning.default), label };
  return { style: chip(c.background.contrast.grey.default, mention), label };
}

function Card({ d }: { d: Dossier }) {
  const th = THEMES[d.theme];
  const st = STAGES[d.stage];
  const pct = Math.round((d.traite / d.total) * 100);
  const dl = deadlineChip(d);
  const shown = d.team.slice(0, 3);
  const extra = d.team.length - shown.length;

  return (
    <article className="dsr-card" style={{ display: "flex", flexDirection: "column", background: panel, border: `1px solid ${line}`, animation: "dsrfade .16s ease" }}>
      <div style={{ height: 3, background: th.fg }} />

      <div style={{ padding: "13px 15px 0", display: "flex", alignItems: "center", gap: 9 }}>
        <IconBox bg={th.bg} fg={th.fg}>{th.icon}</IconBox>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".2px", color: th.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{th.label}</div>
          <div style={{ fontSize: 11, color: faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.lecture}</div>
        </div>
        <span style={{ flex: "0 0 auto", fontSize: 10.5, fontWeight: 600, padding: "2px 8px", background: st.bg, color: st.fg }}>{st.label}</span>
      </div>

      <Link href={CLASSIFICATION_HREF} className="dsr-title" style={{ display: "block", padding: "10px 15px 0", textDecoration: "none", backgroundImage: "none" }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: ink, lineHeight: 1.3 }}>{d.title}</h3>
      </Link>
      <div style={{ padding: "4px 15px 0", fontSize: 11.5, color: mention }}>{d.ref}</div>

      <div style={{ flex: 1, minHeight: 12 }} />

      <div style={{ padding: "12px 15px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
          <span style={{ fontSize: 11.5, color: mention }}>Amendements traités</span>
          <span style={{ fontSize: 11.5, color: faint }}>
            <b style={{ fontSize: 14, color: ink }}>{pct}%</b> · {fmt(d.traite)}/{fmt(d.total)}
          </span>
        </div>
        <div style={{ height: 7, background: track }}>
          <div style={{ height: "100%", width: `${pct}%`, background: th.fg }} />
        </div>
      </div>

      <div style={{ padding: "13px 15px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={dl.style}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><rect x="3" y="5" width="18" height="16" rx="1" /><path d="M3 9h18" /><path d="M8 3v4" /><path d="M16 3v4" /></svg>
          {dl.label}
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", paddingLeft: 7 }}>
          {shown.map((k) => {
            const p = PEOPLE[k];
            return (
              <span key={k} title={p.name} style={{ width: 26, height: 26, flex: "0 0 auto", marginLeft: -7, border: `2px solid ${panel}`, borderRadius: "50%", background: p.color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{p.initials}</span>
            );
          })}
          {extra > 0 && (
            <span style={{ width: 26, height: 26, marginLeft: -7, border: `2px solid ${panel}`, borderRadius: "50%", background: c.background.contrast.grey.default, color: mention, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>+{extra}</span>
          )}
        </div>
        <Link href={CLASSIFICATION_HREF} title="Ouvrir la classification de la liasse" className="dsr-go" style={{ flex: "0 0 auto", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: blue, color: "#fff", textDecoration: "none", backgroundImage: "none" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
        </Link>
      </div>
    </article>
  );
}

const NAV = {
  dossiers: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M4 5h16" /><rect x="4" y="9" width="16" height="12" rx="1" /><path d="M8 9V5" /><path d="M16 9V5" /></svg>,
  amend: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" /><path d="M14 3v5h5" /><circle cx="16.5" cy="16" r="3" /><path d="M21 20.5l-2.2-2.2" /></svg>,
  questionnaire: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><rect x="5" y="4" width="14" height="17" rx="1" /><path d="M9 4V3h6v1" /><path d="M8.5 9h2" /><path d="M13 9h2.5" /><path d="M8.5 13h2" /><path d="M13 13h2.5" /><path d="M8.5 17h2" /><path d="M13 17h2.5" /></svg>,
  parangon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M3 21h18" /><rect x="5" y="11" width="3.5" height="7" /><rect x="10.5" y="6.5" width="3.5" height="11.5" /><rect x="16" y="13.5" width="3.5" height="4.5" /></svg>,
  juridique: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M12 3v18" /><path d="M7 21h10" /><path d="M5 7h14" /><path d="M5 7l-2.6 5.6a3 3 0 0 0 5.2 0L5 7Z" /><path d="M19 7l-2.6 5.6a3 3 0 0 0 5.2 0L19 7Z" /><path d="M9 4.6 12 3l3 1.6" /></svg>,
};

const ALL_ICON = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;

function RailLink({ href, active, icon, children }: { href?: string; active?: boolean; icon: ReactNode; children: ReactNode }) {
  const base: CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", fontSize: 12.5, textDecoration: "none", backgroundImage: "none" };
  if (active)
    return (
      <span aria-current="page" style={{ ...base, paddingLeft: 11, color: blue, fontWeight: 600, background: blueSoft, borderLeft: `3px solid ${blue}` }}>
        {icon} <span>{children}</span>
      </span>
    );
  if (!href)
    return (
      <span title="Bientôt disponible" style={{ ...base, color: faint, cursor: "not-allowed" }}>
        {icon} <span>{children}</span>
      </span>
    );
  return (
    <Link href={href} className="dsr-nav" style={{ ...base, color: body }}>
      <span style={{ display: "inline-flex", flex: "0 0 auto" }}>{icon}</span> <span>{children}</span>
    </Link>
  );
}

type SortKey = "deadline" | "progress" | "volume" | "alpha";

export function Dossiers() {
  const [theme, setTheme] = useState<ThemeKey | "toutes">("toutes");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("deadline");
  const [mine, setMine] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSearchOpen((s) => !s);
        setQuery("");
      } else if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = query.trim().toLowerCase();
  const mineList = mine ? DOSSIERS.filter((d) => d.team.includes("laurent")) : DOSSIERS;
  const themeList = theme === "toutes" ? mineList : mineList.filter((d) => d.theme === theme);
  const searched = themeList.filter((d) => !q || `${d.title} ${d.ref}`.toLowerCase().includes(q));

  const sortFns: Record<SortKey, (a: Dossier, b: Dossier) => number> = {
    deadline: (a, b) => a.daysLeft - b.daysLeft,
    progress: (a, b) => b.traite / b.total - a.traite / a.total,
    volume: (a, b) => b.total - b.traite - (a.total - a.traite),
    alpha: (a, b) => a.title.localeCompare(b.title, "fr"),
  };
  const sorted = searched.slice().sort(sortFns[sortKey]);

  const counts: Record<string, number> = {};
  mineList.forEach((d) => (counts[d.theme] = (counts[d.theme] ?? 0) + 1));
  const chipDefs: { key: ThemeKey | "toutes"; label: string; fg: string; bg: string; icon: ReactNode; count: number }[] = [
    { key: "toutes", label: "Toutes", fg: blue, bg: blueSoft, icon: ALL_ICON, count: mineList.length },
    ...(Object.keys(THEMES) as ThemeKey[])
      .filter((k) => counts[k])
      .map((k) => ({ key: k, label: THEMES[k].label, fg: THEMES[k].fg, bg: THEMES[k].bg, icon: THEMES[k].icon, count: counts[k] })),
  ];

  const restants = DOSSIERS.reduce((s, d) => s + (d.total - d.traite), 0);
  const active = DOSSIERS.filter((d) => d.stage !== "cloture");
  const avg = Math.round((active.reduce((s, d) => s + d.traite / d.total, 0) / active.length) * 100);
  const urgents = DOSSIERS.filter((d) => d.stage !== "cloture" && d.daysLeft >= 0 && d.daysLeft <= 7).length;
  const next = active.slice().sort((a, b) => a.daysLeft - b.daysLeft)[0];
  const nextLine = next ? `${next.ref.split(" · ")[0]} · Séance le ${next.seance} (J-${next.daysLeft})` : "—";

  const searchField: CSSProperties = { width: "100%", height: 32, padding: "0 10px 0 30px", border: `1px solid ${line}`, background: panel, fontFamily: "inherit", fontSize: 12.5, color: ink, outline: "none" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: panel, fontSize: 13, color: body }}>
      <style>{`
        @keyframes dsrfade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .dsr-card:hover{border-color:var(--border-active-blue-france)!important;box-shadow:0 2px 10px rgba(0,0,20,.07)}
        .dsr-card:hover .dsr-title h3{color:var(--text-title-blue-france)}
        .dsr-go:hover{background:var(--background-action-high-blue-france-hover)!important}
        .dsr-nav:hover{background:var(--background-contrast-blue-france);color:var(--text-title-blue-france)!important}
        .dsr-scroll::-webkit-scrollbar{width:9px;height:9px}
        .dsr-scroll::-webkit-scrollbar-thumb{background:var(--border-default-grey);border:2px solid transparent;background-clip:content-box}
        .dsr-chips::-webkit-scrollbar{height:0}
      `}</style>

      {/* ===== TOP BAR ===== */}
      <header style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 16, height: 52, padding: "0 14px", background: panel, borderBottom: `1px solid ${line}`, boxShadow: `inset 0 -2px 0 ${blue}` }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, flex: "0 0 auto", textDecoration: "none", backgroundImage: "none" }}>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: ink, letterSpacing: ".2px" }}>ASSEMBLÉE NATIONALE</span>
            <span style={{ fontSize: 10.5, color: mention, fontWeight: 500, letterSpacing: ".3px", textTransform: "uppercase" }}>Le Cockpit</span>
          </span>
        </Link>

        <button onClick={() => { setSearchOpen(true); setQuery(""); }} style={{ marginLeft: 8, flex: "1 1 auto", maxWidth: 520, display: "flex", alignItems: "center", gap: 8, height: 34, padding: "0 10px", background: canvas, border: `1px solid ${line}`, color: mention, fontFamily: "inherit", fontSize: 13, cursor: "text", textAlign: "left" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <span style={{ flex: 1 }}>Rechercher un dossier, un texte, un amendement…</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: mention, background: panel, border: `1px solid ${line}`, padding: "2px 5px" }}>Ctrl K</span>
        </button>

        <div style={{ flex: "1 1 auto" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 9, height: 38, padding: "0 8px 0 6px" }}>
          <span style={{ width: 30, height: 30, background: blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>ML</span>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, textAlign: "left" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: ink }}>M. Laurent</span>
            <span style={{ fontSize: 10.5, color: mention }}>Administrateur · Séance</span>
          </span>
        </div>
      </header>

      {/* ===== BODY ROW ===== */}
      <div style={{ flex: "1 1 auto", display: "flex", minHeight: 0 }}>
        {/* LEFT RAIL */}
        <nav aria-label="Interface administrateur" className="dsr-scroll" style={{ flex: "0 0 218px", background: canvas, borderRight: `1px solid ${line}`, display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ padding: "14px 14px 6px" }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".7px", color: faint, textTransform: "uppercase" }}>Interface administrateur</span>
          </div>
          <RailLink active icon={NAV.dossiers}>Dossiers législatifs</RailLink>
          <RailLink href={CLASSIFICATION_HREF} icon={NAV.amend}>Analyse d&apos;amendement</RailLink>
          <RailLink icon={NAV.questionnaire}>Création questionnaire</RailLink>
          <RailLink icon={NAV.parangon}>Parangonnage</RailLink>
          <RailLink icon={NAV.juridique}>Analyse juridique</RailLink>
          <div style={{ flex: 1 }} />
          <div style={{ margin: 10, padding: "9px 11px", background: blueSoft, border: `1px solid ${c.border.default.blueFrance.default}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: blue, marginBottom: 2 }}>Prochaine séance</div>
            <div style={{ fontSize: 11, color: mention, lineHeight: 1.35 }}>{nextLine}</div>
          </div>
        </nav>

        {/* WORKSPACE */}
        <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", minWidth: 0, background: canvas }}>
          {/* breadcrumb */}
          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8, height: 42, padding: "0 14px", background: panel, borderBottom: `1px solid ${line}`, fontSize: 12, color: mention }}>
            <span style={{ color: ink, fontWeight: 600 }}>Textes &amp; dossiers législatifs</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11.5, color: faint }}>Législature en cours · {DOSSIERS.length} dossiers suivis</span>
          </div>

          <div className="dsr-scroll" style={{ flex: "1 1 auto", overflowY: "auto", padding: 14 }}>
            <div style={{ maxWidth: 1280, margin: "0 auto" }}>
              {/* PAGE HEADER */}
              <div style={{ marginBottom: 12 }}>
                <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: ink, lineHeight: 1.25 }}>Dossiers législatifs</h1>
                <div style={{ fontSize: 12.5, color: mention, maxWidth: 640 }}>Chaque dossier regroupe un texte en discussion, sa liasse d&apos;amendements et l&apos;équipe d&apos;administrateurs de la commission compétente. Sélectionnez un dossier pour accéder à la classification de sa liasse.</div>
              </div>

              {/* KPI STRIP */}
              <div style={{ display: "flex", marginBottom: 14, border: `1px solid ${line}`, background: panel }}>
                {[
                  { v: active.length, l: "Dossiers actifs", accent: blue, num: ink },
                  { v: fmt(restants), l: "Amendements à traiter", accent: c.text.default.warning.default, num: ink },
                  { v: urgents, l: "Échéance sous 7 jours", accent: c.text.default.error.default, num: c.text.default.error.default },
                  { v: `${avg}%`, l: "Avancement moyen", accent: c.text.default.success.default, num: ink },
                ].map((k, i) => (
                  <div key={k.l} style={{ flex: 1, padding: "11px 15px", borderRight: i < 3 ? `1px solid ${line}` : undefined, borderTop: `3px solid ${k.accent}` }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: k.num, lineHeight: 1 }}>{k.v}</div>
                    <div style={{ fontSize: 11.5, color: mention, marginTop: 3 }}>{k.l}</div>
                  </div>
                ))}
              </div>

              {/* THEMATIQUE CHIPS */}
              <div style={{ marginBottom: 9 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".6px", color: faint, textTransform: "uppercase", marginBottom: 6 }}>Trier par commission / thématique</div>
                <div className="dsr-chips" style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
                  {chipDefs.map((cd) => {
                    const on = theme === cd.key;
                    return (
                      <button key={cd.key} onClick={() => setTheme(cd.key)} style={{ display: "inline-flex", alignItems: "center", gap: 7, flex: "0 0 auto", height: 32, padding: "0 12px", fontFamily: "inherit", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", border: `1px solid ${on ? cd.fg : line}`, background: on ? cd.bg : panel, color: on ? cd.fg : body, fontWeight: on ? 700 : 500 }}>
                        {cd.icon}
                        <span>{cd.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: on ? cd.bg : canvas, color: on ? cd.fg : mention }}>{cd.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECONDARY TOOLBAR */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: "0 0 260px" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={faint} strokeWidth="1.8" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }} aria-hidden><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrer les dossiers…" aria-label="Filtrer les dossiers" style={searchField} />
                </div>
                <button onClick={() => setMine((m) => !m)} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 13px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: `1px solid ${mine ? blue : line}`, background: mine ? blue : panel, color: mine ? "#fff" : body }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" /></svg>
                  Mes dossiers
                </button>
                <div style={{ flex: 1 }} />
                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: mention }}>
                  Trier
                  <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} style={{ height: 32, padding: "0 8px", border: `1px solid ${line}`, background: panel, fontFamily: "inherit", fontSize: 12.5, color: ink, outline: "none", cursor: "pointer" }}>
                    <option value="deadline">Échéance (séance)</option>
                    <option value="progress">Avancement</option>
                    <option value="volume">Volume d&apos;amendements</option>
                    <option value="alpha">Alphabétique</option>
                  </select>
                </label>
              </div>

              {/* CARDS */}
              {sorted.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: faint, background: panel, border: `1px solid ${line}` }}>Aucun dossier ne correspond à ce filtre.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(352px,1fr))", gap: 12 }}>
                  {sorted.map((d) => <Card key={d.id} d={d} />)}
                </div>
              )}
              <div style={{ height: 20 }} />
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH PALETTE */}
      {searchOpen && (
        <div onClick={() => setSearchOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(22,22,22,.4)", zIndex: 50, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 96 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 600, maxWidth: "92vw", background: panel, border: `1px solid ${line}`, boxShadow: "0 8px 40px rgba(0,0,18,.25)", animation: "dsrfade .12s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${line}` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={blue} strokeWidth="1.8" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
              <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus placeholder="Rechercher un dossier, un texte, un article…" aria-label="Recherche globale" style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 15, color: ink, background: "transparent" }} />
              <span style={{ fontSize: 11, color: mention, border: `1px solid ${line}`, padding: "2px 6px" }}>Échap</span>
            </div>
            <div className="dsr-scroll" style={{ maxHeight: 360, overflowY: "auto" }}>
              {sorted.map((d) => {
                const th = THEMES[d.theme];
                const pct = Math.round((d.traite / d.total) * 100);
                return (
                  <Link key={d.id} href={CLASSIFICATION_HREF} className="dsr-nav" style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", borderBottom: `1px solid ${line}`, textDecoration: "none", backgroundImage: "none" }}>
                    <IconBox bg={th.bg} fg={th.fg}>{th.icon}</IconBox>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</span>
                      <span style={{ display: "block", fontSize: 11, color: faint }}>{d.ref}</span>
                    </span>
                    <span style={{ fontSize: 11.5, color: mention }}>{pct}%</span>
                  </Link>
                );
              })}
              {sorted.length === 0 && <div style={{ padding: 20, textAlign: "center", fontSize: 12.5, color: faint }}>Aucun résultat.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
