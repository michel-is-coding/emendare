import { Module } from '@nestjs/common';
import { AmendmentsModule } from '../amendments/amendments.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GatesService } from './gates.service';
import { LlmReviewerService } from './llm-reviewer.service';
import { RecevabiliteController } from './recevabilite.controller';
import { RecevabiliteService } from './recevabilite.service';

/**
 * Agent de recevabilité des amendements (bloc iv du cockpit).
 * Pipeline traçable G0→G6 : docs/metier/procedure-recevabilite-agent.md.
 */
@Module({
  imports: [PrismaModule, AmendmentsModule],
  controllers: [RecevabiliteController],
  providers: [GatesService, LlmReviewerService, RecevabiliteService],
})
export class RecevabiliteModule {}
