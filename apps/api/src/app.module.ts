import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { AmendmentsModule } from './amendments/amendments.module';
import { TextsModule } from './texts/texts.module';
import { RecevabiliteModule } from './recevabilite/recevabilite.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    IngestionModule,
    AmendmentsModule,
    TextsModule,
    RecevabiliteModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
