import { Injectable } from '@nestjs/common';
import type {
  AmendmentCitationInput,
  CitationExtractor,
  ParsedReference,
} from './citation-extractor.interface';

/**
 * Renvois détectés dans le dispositif : article de code consolidé, LFSS/LFI antérieure.
 * Heuristique V1 assumée (déterministe, gratuit, ré-exécutable). L'agent LLM couvrira les
 * formulations libres que ces regex manquent (cf. port `CitationExtractor`, origin="llm").
 */
@Injectable()
export class RegexDispositifExtractor implements CitationExtractor {
  readonly origin = 'regex_dispositif';

  // "article L. 138-10 du code de la sécurité sociale" → article + nom du code (≤ 6 mots).
  private static readonly ARTICLE_CODE =
    /article\s+((?:L|R|D|A)\.?\s?\d[\w.-]*)\s+du\s+(code(?:\s+[\p{L}'’-]+){1,6})/giu;
  // LFSS/LFI antérieure identifiée par son numéro : "loi n° 2024-1306".
  private static readonly LOI_NUMERO = /loi\s+n[°ºo]\s*(\d{4}-\d+)/giu;
  // LFSS par année : "…de financement de la sécurité sociale pour 2025", "LFSS 2025".
  private static readonly LFSS_ANNEE =
    /(?:loi\s+de\s+financement\s+de\s+la\s+s[ée]curit[ée]\s+sociale|LFSS)\s+(?:rectificative\s+)?(?:pour\s+)?(\d{4})/giu;
  // LFI par année : "…loi de finances pour 2025", "LFI 2025".
  private static readonly LFI_ANNEE =
    /(?:loi\s+de\s+finances|LFI)\s+(?:rectificative\s+)?(?:pour\s+)?(\d{4})/giu;

  extract(input: AmendmentCitationInput): ParsedReference[] {
    const haystack = [input.content, input.exposeSommaire ?? '']
      .filter(Boolean)
      .join('\n');
    if (!haystack) return [];

    const refs: ParsedReference[] = [];

    for (const m of haystack.matchAll(RegexDispositifExtractor.ARTICLE_CODE)) {
      refs.push({
        rawCitation: normalizeSpace(m[0]),
        origin: this.origin,
        texteSource: normalizeSpace(m[2]).toLowerCase(),
        article: normalizeSpace(m[1]),
      });
    }
    for (const m of haystack.matchAll(RegexDispositifExtractor.LOI_NUMERO)) {
      refs.push({
        rawCitation: normalizeSpace(m[0]),
        origin: this.origin,
        texteSource: `loi n° ${m[1]}`,
      });
    }
    for (const m of haystack.matchAll(RegexDispositifExtractor.LFSS_ANNEE)) {
      refs.push({
        rawCitation: normalizeSpace(m[0]),
        origin: this.origin,
        texteSource: `LFSS ${m[1]}`,
      });
    }
    for (const m of haystack.matchAll(RegexDispositifExtractor.LFI_ANNEE)) {
      refs.push({
        rawCitation: normalizeSpace(m[0]),
        origin: this.origin,
        texteSource: `LFI ${m[1]}`,
      });
    }
    return refs;
  }
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
