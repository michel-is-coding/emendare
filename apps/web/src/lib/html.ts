// Le dispositif et l'exposé des amendements AN arrivent en HTML (dumps open
// data). On les rend en texte brut : le surlignage lexical travaille sur du
// texte, et on n'injecte jamais de HTML tiers dans le DOM.

const ENTITES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  laquo: "«",
  raquo: "»",
  hellip: "…",
  rsquo: "’",
  oelig: "œ",
  eacute: "é",
  egrave: "è",
  ecirc: "ê",
  agrave: "à",
  acirc: "â",
  ccedil: "ç",
  icirc: "î",
  ocirc: "ô",
  ucirc: "û",
  ugrave: "ù",
};

export function htmlVersTexte(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/li|\/tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m: string, n: string) => ENTITES[n.toLowerCase()] ?? m)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
