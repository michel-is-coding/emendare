import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../embedding/embedding.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AmendmentsController } from './amendments.controller';
import { AmendmentsService } from './amendments.service';

@Module({
  imports: [PrismaModule, EmbeddingModule],
  controllers: [AmendmentsController],
  providers: [AmendmentsService],
  exports: [AmendmentsService],
})
export class AmendmentsModule {}
