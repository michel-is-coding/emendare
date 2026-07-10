import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../embedding/embedding.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CitationsModule } from './citations/citations.module';
import { IngestionController } from './ingestion.controller';
import { IngestionScheduler } from './ingestion.scheduler';
import { IngestionService } from './ingestion.service';
import { AmendementsAnIngestor } from './ingestors/amendements-an.ingestor';
import { AmendmentEmbeddingsIngestor } from './ingestors/amendment-embeddings.ingestor';
import { TextesAnIngestor } from './ingestors/textes-an.ingestor';
import { TextesLegifranceIngestor } from './ingestors/textes-legifrance.ingestor';
import { INGESTORS, Ingestor } from './ingestor.interface';

@Module({
  imports: [PrismaModule, EmbeddingModule, CitationsModule],
  controllers: [IngestionController],
  providers: [
    AmendementsAnIngestor,
    TextesAnIngestor,
    TextesLegifranceIngestor,
    AmendmentEmbeddingsIngestor,
    {
      provide: INGESTORS,
      useFactory: (...ingestors: Ingestor[]) => ingestors,
      // L'ordre compte : runAll() est séquentiel. amendements-an (renvois) → textes-an
      // (nature précise + BILLs) → textes-legifrance (résout les renvois + relie N-1) → embeddings.
      inject: [
        AmendementsAnIngestor,
        TextesAnIngestor,
        TextesLegifranceIngestor,
        AmendmentEmbeddingsIngestor,
      ],
    },
    IngestionService,
    IngestionScheduler,
  ],
  exports: [IngestionService],
})
export class IngestionModule {}
