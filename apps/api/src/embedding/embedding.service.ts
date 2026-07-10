import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/** Champs d'un amendement qui alimentent son texte d'embedding. */
export interface EmbeddableAmendment {
  articleReference?: string | null;
  content: string;
  exposeSommaire?: string | null;
}

/**
 * Le modèle accepte ~8191 tokens (~3 caractères/token en français) —
 * tronquer large plutôt que d'échouer sur les amendements-fleuves.
 */
const MAX_EMBED_CHARS = 24_000;

/**
 * Client d'embeddings via une gateway compatible OpenAI (OpenRouter aujourd'hui,
 * serveur souverain demain : seul EMBEDDING_BASE_URL change). Sans clé API le
 * service reste inerte et les features de similarité répondent 503 — même
 * contrat « intégration optionnelle » que le projet k-uriage de référence.
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly client: OpenAI | null;
  readonly model: string;
  readonly dim: number;
  private readonly batchSize: number;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('EMBEDDING_API_KEY');
    this.model =
      config.get<string>('EMBEDDING_MODEL') ?? 'openai/text-embedding-3-small';
    this.dim = Number(config.get<string>('EMBEDDING_DIM') ?? '1536');
    this.batchSize = Number(
      config.get<string>('EMBEDDING_BATCH_SIZE') ?? '200',
    );

    this.client = apiKey
      ? new OpenAI({
          apiKey,
          baseURL:
            config.get<string>('EMBEDDING_BASE_URL') ??
            'https://openrouter.ai/api/v1',
          // Le SDK retente les 429/5xx avec backoff exponentiel (Retry-After honoré).
          maxRetries: 5,
          timeout: 60_000,
        })
      : null;

    if (this.client) {
      this.logger.log(
        `Embedding client initialized (model=${this.model}, dim=${this.dim})`,
      );
    } else {
      this.logger.warn(
        'EMBEDDING_API_KEY not set — similarity features disabled (503)',
      );
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const [embedding] = await this.generateEmbeddings([text]);
    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Embedding provider not configured (EMBEDDING_API_KEY)',
      );
    }

    const all: number[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch,
      });
      // Remettre dans l'ordre d'entrée (l'API indexe chaque vecteur).
      const byIndex = [...response.data].sort((a, b) => a.index - b.index);
      if (byIndex.length !== batch.length) {
        throw new Error(
          `Embedding API returned ${byIndex.length} vectors for ${batch.length} inputs`,
        );
      }
      for (const item of byIndex) {
        if (item.embedding.length !== this.dim) {
          throw new Error(
            `Embedding dimension mismatch: got ${item.embedding.length}, expected ${this.dim} (EMBEDDING_DIM)`,
          );
        }
        all.push(item.embedding);
      }
    }
    return all;
  }

  /**
   * Texte vectorisé d'un amendement : désignation d'article + dispositif +
   * exposé sommaire. Les identifiants purs (uid, numéro, texteRef) sont exclus —
   * ils dégradent la similarité plus qu'ils ne l'aident.
   */
  buildEmbeddingText(a: EmbeddableAmendment): string {
    const parts = [
      a.articleReference?.trim()
        ? `Article visé: ${a.articleReference.trim()}`
        : null,
      a.content.trim() ? `Dispositif: ${a.content.trim()}` : null,
      a.exposeSommaire?.trim()
        ? `Exposé sommaire: ${a.exposeSommaire.trim()}`
        : null,
    ].filter((p): p is string => p !== null);
    return parts.join('\n').slice(0, MAX_EMBED_CHARS);
  }

  /** Littéral pgvector `[x1,x2,…]`, à passer en paramètre SQL casté `::vector`. */
  toVectorLiteral(embedding: number[]): string {
    return `[${embedding.map((x) => x.toFixed(8)).join(',')}]`;
  }
}
