import { Inject, Injectable } from '@nestjs/common';
import {
  AmendmentCitationInput,
  CITATION_EXTRACTORS,
  CitationExtractor,
  ParsedReference,
} from './citation-extractor.interface';

/**
 * Agrège tous les extracteurs enregistrés (port pluggable) et déduplique leurs renvois.
 * Ajouter un extracteur = l'inscrire dans CitationsModule ; aucun autre changement requis.
 */
@Injectable()
export class CitationExtractionService {
  constructor(
    @Inject(CITATION_EXTRACTORS)
    private readonly extractors: CitationExtractor[],
  ) {}

  /** Lance chaque extracteur et déduplique par (origin, rawCitation). */
  extract(input: AmendmentCitationInput): ParsedReference[] {
    const seen = new Set<string>();
    const out: ParsedReference[] = [];
    for (const extractor of this.extractors) {
      for (const ref of extractor.extract(input)) {
        const key = `${ref.origin}::${ref.rawCitation.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(ref);
      }
    }
    return out;
  }

  /** Les `origin` gérées — sert à purger idempotemment les renvois avant re-création. */
  get origins(): string[] {
    return this.extractors.map((extractor) => extractor.origin);
  }
}
