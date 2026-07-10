import type { IngestionLogLevel } from '../../generated/prisma/client.js';

/** Injection token: every provider bound to this token is a registered ingestor. */
export const INGESTORS = Symbol('INGESTORS');

export interface IngestorRunOptions {
  /** Restrict to specific legislatures (default: env AN_LEGISLATURES). */
  legislatures?: number[];
  /** Stop after N items — useful for smoke tests / dev runs. */
  maxItems?: number;
}

export interface IngestionCounters {
  seen?: number;
  upserted?: number;
  failed?: number;
}

/** Handed to an ingestor for the duration of one run. */
export interface IngestionContext {
  readonly runId: string;
  /**
   * Persist a log line (DB) + mirror it to the Nest logger.
   * Typé en propriété-fonction (pas méthode) : `ctx.log` est déjà lié (arrow dans buildContext)
   * et peut être passé en callback sans `unbound-method`.
   */
  log: (level: IngestionLogLevel, message: string) => Promise<void>;
  /** Increment run counters (itemsSeen / itemsUpserted / itemsFailed). */
  progress: (counters: IngestionCounters) => Promise<void>;
}

export interface Ingestor {
  /** Stable identifier, used in URLs and IngestionRun.ingestor. */
  readonly name: string;
  /** Human description, surfaced by the status endpoint. */
  readonly description: string;
  /**
   * false = exclu des runs planifiés (runAll) ; déclenchement manuel uniquement
   * via POST /ingestion/:name/run. Absent/true = inclus. (Ex : embeddings — coût API.)
   */
  readonly autoRun?: boolean;
  run(ctx: IngestionContext, options?: IngestorRunOptions): Promise<void>;
}
