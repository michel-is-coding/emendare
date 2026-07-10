import { Injectable } from '@nestjs/common';
import type {
  AmendmentCitationInput,
  CitationExtractor,
  ParsedReference,
} from './citation-extractor.interface';

/**
 * Exploite le champ officiel AN `loiReference` (code consolidé visé par l'amendement),
 * aujourd'hui émis par le cleaner mais jeté par l'ingestor. Renvoi le plus fiable : il vient
 * de la donnée structurée, pas d'une heuristique de texte.
 */
@Injectable()
export class AnLoiReferenceExtractor implements CitationExtractor {
  readonly origin = 'an_loiReference';

  extract(input: AmendmentCitationInput): ParsedReference[] {
    const codeLoi = input.loiReference?.codeLoi?.trim();
    // codeLoi="0" (+ division "sN") = renvoi INTERNE au projet lui-même (section N), pas au droit
    // consolidé ; codeLoi="sN"/numérique = même bruit. On ne garde que les vrais codes/textes.
    if (!codeLoi || codeLoi === '0' || /^s?\d/i.test(codeLoi)) return [];
    const division = input.loiReference?.divisionCodeLoi?.trim() || undefined;
    const isLegi = /^LEGI(TEXT|ARTI)\d+/.test(codeLoi);
    return [
      {
        rawCitation: division ? `${codeLoi} ${division}` : codeLoi,
        origin: this.origin,
        texteSource: codeLoi,
        article: division,
        identifiantLegi: isLegi ? codeLoi : undefined,
      },
    ];
  }
}
