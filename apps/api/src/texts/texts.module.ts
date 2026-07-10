import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TextsController } from './texts.controller';
import { TextsService } from './texts.service';

@Module({
  imports: [PrismaModule],
  controllers: [TextsController],
  providers: [TextsService],
})
export class TextsModule {}
