import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { IngestionService } from './ingestion.service';

/**
 * Schedules the automatic ingestion runs — no user intervention needed.
 * Default: every Sunday 03:00 (open data dumps are refreshed weekly).
 * Override with INGESTION_CRON, disable with INGESTION_CRON="off".
 */
@Injectable()
export class IngestionScheduler implements OnModuleInit {
  private readonly logger = new Logger(IngestionScheduler.name);

  constructor(
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly ingestion: IngestionService,
  ) {}

  onModuleInit(): void {
    const expression = this.config.get<string>('INGESTION_CRON') ?? '0 3 * * 0';
    if (expression === 'off') {
      this.logger.warn('Scheduled ingestion disabled (INGESTION_CRON=off)');
      return;
    }

    const job = new CronJob(expression, () => {
      this.logger.log('Scheduled ingestion starting');
      void this.ingestion
        .runAll('SCHEDULED')
        .catch((error: unknown) =>
          this.logger.error(
            `Scheduled ingestion failed: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
    });

    this.schedulerRegistry.addCronJob('ingestion', job);
    job.start();
    this.logger.log(`Scheduled ingestion registered (cron: ${expression})`);
  }
}
