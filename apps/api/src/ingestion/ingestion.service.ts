import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IngestionLogLevel,
  IngestionTrigger,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service';
import {
  INGESTORS,
  Ingestor,
  IngestionContext,
  IngestionCounters,
  IngestorRunOptions,
} from './ingestor.interface';

const LOG_LEVEL_PRIORITY: Record<IngestionLogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

@Injectable()
export class IngestionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IngestionService.name);
  /** In-process concurrency guard: one run per ingestor at a time. */
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(INGESTORS) private readonly ingestors: Ingestor[],
  ) {}

  /** Runs left RUNNING by a previous process crash are marked FAILED. */
  async onApplicationBootstrap(): Promise<void> {
    const { count } = await this.prisma.ingestionRun.updateMany({
      where: { status: 'RUNNING' },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        error: 'Interrupted (process restarted while run was in progress)',
      },
    });
    if (count > 0) {
      this.logger.warn(`Marked ${count} orphaned RUNNING run(s) as FAILED`);
    }
  }

  getIngestor(name: string): Ingestor {
    const ingestor = this.ingestors.find((i) => i.name === name);
    if (!ingestor) {
      throw new NotFoundException(
        `Unknown ingestor "${name}". Available: ${this.ingestors
          .map((i) => i.name)
          .join(', ')}`,
      );
    }
    return ingestor;
  }

  listIngestors(): Ingestor[] {
    return this.ingestors;
  }

  isRunning(name: string): boolean {
    return this.running.has(name);
  }

  /**
   * Start a run for one ingestor. Returns the run id immediately;
   * the ingestion itself executes in the background.
   */
  async triggerRun(
    name: string,
    trigger: IngestionTrigger,
    options?: IngestorRunOptions,
  ): Promise<{ runId: string }> {
    const ingestor = this.getIngestor(name);
    if (this.running.has(name)) {
      throw new ConflictException(`Ingestor "${name}" is already running`);
    }
    this.running.add(name);

    const run = await this.prisma.ingestionRun.create({
      data: { ingestor: name, trigger },
    });

    // Fire and forget — status is tracked in DB.
    void this.executeRun(ingestor, run.id, options).finally(() => {
      this.running.delete(name);
    });

    return { runId: run.id };
  }

  /** Run every registered ingestor sequentially (scheduled runs). */
  async runAll(trigger: IngestionTrigger): Promise<void> {
    for (const ingestor of this.ingestors) {
      if (ingestor.autoRun === false) {
        this.logger.log(
          `Skipping "${ingestor.name}" in scheduled run (manual trigger only)`,
        );
        continue;
      }
      if (this.running.has(ingestor.name)) {
        this.logger.warn(
          `Skipping scheduled run of "${ingestor.name}": already running`,
        );
        continue;
      }
      this.running.add(ingestor.name);
      try {
        const run = await this.prisma.ingestionRun.create({
          data: { ingestor: ingestor.name, trigger },
        });
        await this.executeRun(ingestor, run.id);
      } finally {
        this.running.delete(ingestor.name);
      }
    }
  }

  private async executeRun(
    ingestor: Ingestor,
    runId: string,
    options?: IngestorRunOptions,
  ): Promise<void> {
    const ctx = this.buildContext(ingestor.name, runId);
    try {
      await ctx.log('INFO', `Run started (ingestor: ${ingestor.name})`);
      await ingestor.run(ctx, options);
      await this.prisma.ingestionRun.update({
        where: { id: runId },
        data: { status: 'SUCCESS', finishedAt: new Date() },
      });
      await ctx.log('INFO', 'Run finished successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Run ${runId} (${ingestor.name}) failed: ${message}`);
      await this.prisma.ingestionRun
        .update({
          where: { id: runId },
          data: { status: 'FAILED', finishedAt: new Date(), error: message },
        })
        .catch(() => undefined);
      await ctx.log('ERROR', `Run failed: ${message}`).catch(() => undefined);
    }
  }

  private buildContext(name: string, runId: string): IngestionContext {
    const minLevel: IngestionLogLevel =
      (this.config.get<string>(
        'INGESTION_LOG_LEVEL',
      ) as IngestionLogLevel | null) ?? 'INFO';

    return {
      runId,
      log: async (level: IngestionLogLevel, message: string) => {
        if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[minLevel]) return;
        this.logger.log(`[${name}] ${level} ${message}`);
        await this.prisma.ingestionLog.create({
          data: { runId, level, message },
        });
      },
      progress: async (counters: IngestionCounters) => {
        await this.prisma.ingestionRun.update({
          where: { id: runId },
          data: {
            ...(counters.seen
              ? { itemsSeen: { increment: counters.seen } }
              : {}),
            ...(counters.upserted
              ? { itemsUpserted: { increment: counters.upserted } }
              : {}),
            ...(counters.failed
              ? { itemsFailed: { increment: counters.failed } }
              : {}),
          },
        });
      },
    };
  }

  // --- Queries for the (future) monitoring page ---

  /** Per-ingestor health: last run, last success, freshness. */
  async getStatus() {
    const staleHours = Number(
      this.config.get<string>('INGESTION_STALE_HOURS') ?? '192', // 8 jours (dumps hebdo + marge)
    );
    const now = Date.now();

    const ingestors = await Promise.all(
      this.ingestors.map(async (ingestor) => {
        const [lastRun, lastSuccess] = await Promise.all([
          this.prisma.ingestionRun.findFirst({
            where: { ingestor: ingestor.name },
            orderBy: { startedAt: 'desc' },
          }),
          this.prisma.ingestionRun.findFirst({
            where: { ingestor: ingestor.name, status: 'SUCCESS' },
            orderBy: { startedAt: 'desc' },
          }),
        ]);
        const isStale =
          !lastSuccess ||
          now - lastSuccess.startedAt.getTime() > staleHours * 3_600_000;
        return {
          name: ingestor.name,
          description: ingestor.description,
          running: this.running.has(ingestor.name),
          lastRun,
          lastSuccess,
          isStale,
          staleThresholdHours: staleHours,
        };
      }),
    );

    const [amendments, bills, consolidatedTexts, references] =
      await Promise.all([
        this.prisma.amendment.count(),
        this.prisma.legislativeText.count({ where: { kind: 'BILL' } }),
        this.prisma.legislativeText.count({ where: { kind: 'CONSOLIDATED' } }),
        this.prisma.textReference.count(),
      ]);

    return {
      ingestors,
      database: { amendments, bills, consolidatedTexts, references },
    };
  }

  async listRuns(ingestor?: string, take = 20) {
    return this.prisma.ingestionRun.findMany({
      where: ingestor ? { ingestor } : undefined,
      orderBy: { startedAt: 'desc' },
      take: Math.min(take, 100),
    });
  }

  async getRun(id: string) {
    const run = await this.prisma.ingestionRun.findUnique({
      where: { id },
      include: { logs: { orderBy: { createdAt: 'asc' } } },
    });
    if (!run) throw new NotFoundException(`Run "${id}" not found`);
    return run;
  }
}
