import { Module } from '@nestjs/common';
import { AnLoiReferenceExtractor } from './an-loi-reference.extractor';
import { CitationExtractionService } from './citation-extraction.service';
import {
  CITATION_EXTRACTORS,
  CitationExtractor,
} from './citation-extractor.interface';
import { RegexDispositifExtractor } from './regex-dispositif.extractor';

@Module({
  providers: [
    AnLoiReferenceExtractor,
    RegexDispositifExtractor,
    {
      provide: CITATION_EXTRACTORS,
      // Enregistrer ici chaque nouvel extracteur (ex: extracteur LLM, origin="llm").
      useFactory: (...extractors: CitationExtractor[]) => extractors,
      inject: [AnLoiReferenceExtractor, RegexDispositifExtractor],
    },
    CitationExtractionService,
  ],
  exports: [CitationExtractionService],
})
export class CitationsModule {}
