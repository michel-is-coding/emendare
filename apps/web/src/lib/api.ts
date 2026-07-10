// Client HTTP de l'API emendare (apps/api, NestJS, port 4000 par défaut).
// Types minces limités aux champs consommés par les pages : on n'importe pas les
// types Prisma d'apps/api — côté JSON les dates arrivent en chaîne et les Json
// ne sont pas typés. Base configurable par NEXT_PUBLIC_API_URL.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function fetchApi<T>(chemin: string, init?: RequestInit): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, { cache: "no-store", ...init });
  } catch {
    throw new ApiError(0, `API injoignable sur ${API_URL} (NEXT_PUBLIC_API_URL)`);
  }
  if (!reponse.ok) {
    let message = `${reponse.status} ${reponse.statusText}`;
    try {
      const corps = (await reponse.json()) as { message?: string | string[] };
      if (corps.message) message = String(corps.message);
    } catch {
      // corps non JSON : on garde le statut HTTP
    }
    throw new ApiError(reponse.status, message);
  }
  return (await reponse.json()) as T;
}

export type Page<T> = { total: number; items: T[] };

// ── Textes législatifs ──

export type TexteResume = {
  id: string;
  kind: "BILL" | "CONSOLIDATED";
  source: string;
  externalId: string;
  nature: string | null;
  legislature: number | null;
  reference: string | null;
  title: string | null;
  version: string | null;
  dossierRef: string | null;
  createdAt: string;
};

export type TexteListe = TexteResume & { _count: { amendments: number } };

export type TexteDetail = TexteResume & {
  content: string | null;
  priorYearText: TexteResume | null;
  references: {
    id: string;
    rawCitation: string;
    origin: string;
    texteSource: string | null;
    article: string | null;
    consolidatedText: TexteResume | null;
  }[];
  versions: TexteResume[];
  amendmentCount: number;
  amendments: {
    id: string;
    numero: string | null;
    articleReference: string | null;
    nature: string | null;
    sort: string | null;
    status: string;
  }[];
  referencedTexts: { texteSource: string; count: number }[];
};

export type StatsTexte = {
  total: number;
  parSort: { sort: string | null; count: number }[];
  parStatus: { status: string; count: number }[];
};

// ── Amendements ──

/** Dernier verdict agent joint à chaque ligne de liasse (pas de N+1). */
export type VerdictListe = {
  sort: "RECEVABLE" | "IRRECEVABLE" | null;
  motifCode: string | null;
  confidence: number;
  createdAt: string;
};

export type AmendementListe = {
  id: string;
  numero: string | null;
  articleReference: string | null;
  nature: string | null;
  sort: string | null;
  etat: string | null;
  status: "PENDING" | "RECEIVABLE" | "IRRECEIVABLE";
  dateDepot: string | null;
  verdict: VerdictListe | null;
};

export type AmendementDetail = AmendementListe & {
  texteRef: string | null;
  title: string | null;
  content: string;
  exposeSommaire: string | null;
  sousEtat: string | null;
  soumisArticle40: boolean | null;
  legislature: number | null;
  alineaNumero: string | null;
  articleAdditionnel: boolean | null;
  auteurRef: string | null;
  groupePolitiqueRef: string | null;
  cosignataireRefs: string[];
  lawText: TexteResume | null;
  references: {
    id: string;
    rawCitation: string;
    origin: string;
    texteSource: string | null;
    article: string | null;
    typeModification: string | null;
    consolidatedText: (TexteResume & { content?: string | null }) | null;
  }[];
};

export type SimilaireApi = {
  id: string;
  numero: string | null;
  legislature: number | null;
  texteRef: string | null;
  nature: string | null;
  articleReference: string | null;
  sort: string | null;
  etat: string | null;
  status: string;
  dateDepot: string | null;
  similarity: number;
  similarityPct: number;
};

// ── Recevabilité (agent G0→G6) ──

export type RegleExaminee = {
  code: string;
  avis: string;
  raisonnement: string;
  evidence?: string;
};

export type TraceEntry = {
  gate: string;
  regle: string;
  fondement?: string;
  constat: string;
  evidence?: string;
  effet: "SIGNAL" | "CONCLUT" | "PASSE" | "INFO";
};

export type VerdictAgent = {
  sort: "RECEVABLE" | "IRRECEVABLE";
  motifCode: string | null;
  motifLibelle: string | null;
  fondement: string | null;
  confiance: number; // 0..1
  justificatif: string;
  fastTrack: boolean;
  model: string | null;
  regles?: RegleExaminee[];
  trace: TraceEntry[];
  analysisId?: string;
  createdAt?: string;
};

// ligne AmendmentAnalysis telle que persistée (GET .../review/latest) — noms de
// champs différents du verdict renvoyé par POST .../review, d'où la normalisation
type AnalysePersistee = {
  id: string;
  confidence: number;
  rationale: string;
  sort: "RECEVABLE" | "IRRECEVABLE" | null;
  motifCode: string | null;
  motifLibelle: string | null;
  fondement: string | null;
  fastTrack: boolean;
  model: string | null;
  trace: TraceEntry[] | null;
  createdAt: string;
};

const versVerdict = (a: AnalysePersistee): VerdictAgent => ({
  sort: a.sort ?? "RECEVABLE",
  motifCode: a.motifCode,
  motifLibelle: a.motifLibelle,
  fondement: a.fondement,
  confiance: a.confidence,
  justificatif: a.rationale,
  fastTrack: a.fastTrack,
  model: a.model,
  trace: a.trace ?? [],
  analysisId: a.id,
  createdAt: a.createdAt,
});

// ── Appels ──

export function listeTextes(
  params: { nature?: string; legislature?: string; take?: number; skip?: number } = {},
): Promise<Page<TexteListe>> {
  const q = new URLSearchParams({ kind: "BILL" });
  if (params.nature) q.set("nature", params.nature);
  if (params.legislature) q.set("legislature", params.legislature);
  if (params.take !== undefined) q.set("take", String(params.take));
  if (params.skip !== undefined) q.set("skip", String(params.skip));
  return fetchApi(`/texts?${q.toString()}`);
}

export const detailTexte = (id: string): Promise<TexteDetail> =>
  fetchApi(`/texts/${encodeURIComponent(id)}`);

export const statsTexte = (id: string): Promise<StatsTexte> =>
  fetchApi(`/texts/${encodeURIComponent(id)}/stats`);

/** Filtres serveur de la liasse — `sort: "aucun"` = sans sort (à instruire). */
export type FiltresLiasse = {
  q?: string;
  sort?: string;
  verdict?: "RECEVABLE" | "IRRECEVABLE";
  orderBy?: "numero" | "dateDepot";
};

export function amendementsDuTexte(
  id: string,
  params: FiltresLiasse & { take?: number; skip?: number } = {},
): Promise<Page<AmendementListe>> {
  const q = new URLSearchParams();
  if (params.take !== undefined) q.set("take", String(params.take));
  if (params.skip !== undefined) q.set("skip", String(params.skip));
  if (params.q) q.set("q", params.q);
  if (params.sort) q.set("sort", params.sort);
  if (params.verdict) q.set("verdict", params.verdict);
  if (params.orderBy) q.set("orderBy", params.orderBy);
  return fetchApi(`/texts/${encodeURIComponent(id)}/amendments?${q.toString()}`);
}

export const detailAmendement = (id: string): Promise<AmendementDetail> =>
  fetchApi(`/amendments/${encodeURIComponent(id)}`);

export const similaires = (
  id: string,
  take = 8,
): Promise<{ items: SimilaireApi[] }> =>
  fetchApi(`/amendments/${encodeURIComponent(id)}/similar?take=${take}`);

export async function dernierVerdict(id: string): Promise<VerdictAgent | null> {
  try {
    return versVerdict(
      await fetchApi(`/amendments/${encodeURIComponent(id)}/review/latest`),
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export const lancerAnalyse = (id: string): Promise<VerdictAgent> =>
  fetchApi(`/amendments/${encodeURIComponent(id)}/review`, { method: "POST" });
