import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';

/**
 * Parsing des dumps XML officiels DILA (echanges.dila.gouv.fr/OPENDATA/) — fonds LEGI (droit
 * consolidé : codes/articles en vigueur) et JORF (textes promulgués : lois, dont les LFSS/LFI).
 * 100 % local et souverain : ni API PISTE, ni infra Tricoteuses, ni nodegit. On réutilise
 * fast-xml-parser (parsing) ; les types cibles suivent la structure DILA observée.
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Le corps d'un article est du HTML : on le garde en chaîne brute (pas d'arbre d'enfants).
  stopNodes: ['ARTICLE.BLOC_TEXTUEL.CONTENU'],
  processEntities: true,
  parseTagValue: false, // NUM "L811-2" / "1" restent des chaînes
});

export interface LegiArticle {
  /** LEGIARTI… — identifiant pérenne de la version d'article. */
  id: string;
  /** Numéro d'article tel que LEGI (ex: "L811-2", "R138-10"). */
  num: string;
  etat: string; // VIGUEUR | MODIFIE | ABROGE | …
  dateDebut?: string;
  dateFin?: string;
  /** Titre du code/texte porteur (ex: "Code de la sécurité sociale"). */
  codeTitre?: string;
  /** LEGITEXT… du code porteur. */
  codeCid?: string;
  /** Corps de l'article en texte brut (HTML nettoyé). */
  content: string;
}

export interface JorfTexte {
  /** JORFTEXT… — identifiant du texte au Journal Officiel. */
  id: string;
  nature?: string; // LOI | DECRET | ORDONNANCE | …
  titre?: string;
  titreFull?: string;
  /** Numéro de loi "2024-1306" quand présent. */
  numLoi?: string;
  date?: string;
  etat?: string;
}

/** Parse un fichier LEGI ARTICLE (LEGIARTI…xml). `null` si structure inattendue. */
export function parseLegiArticle(xml: string): LegiArticle | null {
  const obj = parser.parse(xml) as { ARTICLE?: Record<string, unknown> };
  const article = obj.ARTICLE;
  if (!article) return null;

  const meta = article.META as Record<string, unknown> | undefined;
  const id = str(
    (meta?.META_COMMUN as Record<string, unknown> | undefined)?.ID,
  );
  const metaArticle = (meta?.META_SPEC as Record<string, unknown> | undefined)
    ?.META_ARTICLE as Record<string, unknown> | undefined;
  const num = str(metaArticle?.NUM);
  if (!id || !num) return null;

  const titreTxt = firstOf(
    (article.CONTEXTE as Record<string, unknown> | undefined)?.TEXTE,
  );
  const titreNode = (titreTxt as Record<string, unknown> | undefined)
    ?.TITRE_TXT;
  const titre = firstOf(titreNode) as
    Record<string, unknown> | string | undefined;

  return {
    id,
    num,
    etat: str(metaArticle?.ETAT) ?? '',
    dateDebut: str(metaArticle?.DATE_DEBUT),
    dateFin: str(metaArticle?.DATE_FIN),
    codeTitre: typeof titre === 'object' ? str(titre['#text']) : str(titre),
    codeCid: typeof titre === 'object' ? str(titre['@_id_txt']) : undefined,
    content: stripHtml(str(blocContenu(article)) ?? ''),
  };
}

/** Parse un fichier JORF TEXTE_VERSION (texte promulgué). `null` si inattendu. */
export function parseJorfTexte(xml: string): JorfTexte | null {
  const obj = parser.parse(xml) as Record<string, unknown>;
  const root = (obj.TEXTE_VERSION ?? obj.ARTICLE ?? obj) as Record<
    string,
    unknown
  >;
  const meta = root.META as Record<string, unknown> | undefined;
  const commun = meta?.META_COMMUN as Record<string, unknown> | undefined;
  const spec = (meta?.META_SPEC as Record<string, unknown> | undefined)
    ?.META_TEXTE_VERSION as Record<string, unknown> | undefined;
  const chronicle = (meta?.META_SPEC as Record<string, unknown> | undefined)
    ?.META_TEXTE_CHRONICLE as Record<string, unknown> | undefined;
  const id = str(commun?.ID) ?? str(chronicle?.CID);
  if (!id) return null;

  return {
    id,
    nature: str(commun?.NATURE) ?? str(spec?.NATURE),
    titre: str(spec?.TITRE),
    titreFull: str(spec?.TITREFULL),
    numLoi: str(chronicle?.NUM),
    date: str(spec?.DATE_TEXTE) ?? str(spec?.DATE_PUBLI),
    etat: str(spec?.ETAT),
  };
}

/** Itère récursivement les fichiers d'extension donnée sous `dir`. */
export async function* walkFilesByExt(
  dir: string,
  ext: string,
): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFilesByExt(fullPath, ext);
    } else if (entry.name.endsWith(ext)) {
      yield fullPath;
    }
  }
}

/** Extrait un `.tar.gz` DILA dans `destDir` (dumps DILA = tar.gz, pas zip). */
export async function extractTarGz(
  tarGzPath: string,
  destDir: string,
): Promise<void> {
  const tar = await import('tar');
  await tar.x({ file: tarGzPath, cwd: destDir });
}

// --- Normalisation pour le matching renvoi ↔ texte consolidé ---

/** Acronymes de codes courants → intitulé complet (matching renvoi AN ↔ titre LEGI). */
const CODE_ACRONYMS: Record<string, string> = {
  cgi: 'code general des impots',
  cgct: 'code general des collectivites territoriales',
  css: 'code de la securite sociale',
  csp: 'code de la sante publique',
  ct: 'code du travail',
  cch: 'code de la construction et de habitation',
  casf: 'code de action sociale et des familles',
  cja: 'code de justice administrative',
  cpp: 'code de procedure penale',
  crpa: 'code des relations entre le public et administration',
};

/**
 * Clé de code normalisée : minuscule, sans accents, acronymes étendus, "c " → "code",
 * stopwords retirés. "Code de la sécurité sociale", "c sécurité sociale" (abréviation AN) et
 * "CSS" → "securite sociale". "CGI" et "Code général des impôts" → "general impots".
 */
export function normalizeCodeName(name: string): string {
  let s = stripAccents(name.toLowerCase().trim());
  const acronym = CODE_ACRONYMS[s.replace(/[^a-z]/g, '')];
  if (acronym) s = acronym;
  s = s.replace(/^c\s+/, 'code '); // abréviation AN "c " → "code "
  s = s.replace(/\bcode\b/g, ' ');
  s = s.replace(/\b(de|du|des|la|le|les|l|d|a|au|aux|et|en)\b/g, ' ');
  return s
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "L. 138-10" / "L138-10" / "Art. L. 138-10" → "l138-10". */
export function normalizeArticleNum(num: string): string {
  return stripAccents(num.toLowerCase())
    .replace(/\bart(icle)?\.?\b/g, '')
    .replace(/[\s.]/g, '')
    .trim();
}

function stripAccents(s: string): string {
  // Retire les diacritiques combinants (U+0300–U+036F) sans classe regex littérale.
  return Array.from(s.normalize('NFD'))
    .filter((c) => {
      const cp = c.codePointAt(0) ?? 0;
      return cp < 0x0300 || cp > 0x036f;
    })
    .join('');
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&(?:rsquo|apos);/g, '’')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function blocContenu(article: Record<string, unknown>): unknown {
  const bloc = article.BLOC_TEXTUEL as Record<string, unknown> | undefined;
  const contenu = bloc?.CONTENU;
  if (Array.isArray(contenu)) return contenu.find((c) => str(c)) ?? contenu[0];
  return contenu;
}

function firstOf(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function str(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const s = value.trim();
    return s.length > 0 ? s : undefined;
  }
  // Avec parseTagValue:false les valeurs XML sont des chaînes ; on ne stringifie que des
  // primitifs (jamais un objet → pas de "[object Object]").
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}
