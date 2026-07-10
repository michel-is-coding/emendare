import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';

function makeService(env: Record<string, string> = {}): EmbeddingService {
  const config = {
    get: (key: string) => env[key],
  } as unknown as ConfigService;
  return new EmbeddingService(config);
}

describe('EmbeddingService', () => {
  describe('configuration', () => {
    it('is not configured without EMBEDDING_API_KEY', () => {
      const service = makeService();
      expect(service.isConfigured).toBe(false);
    });

    it('rejects generateEmbeddings with 503 when unconfigured', async () => {
      const service = makeService();
      await expect(service.generateEmbeddings(['test'])).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('uses env model and dim', () => {
      const service = makeService({
        EMBEDDING_MODEL: 'openai/text-embedding-3-large',
        EMBEDDING_DIM: '3072',
      });
      expect(service.model).toBe('openai/text-embedding-3-large');
      expect(service.dim).toBe(3072);
    });
  });

  describe('buildEmbeddingText', () => {
    const service = makeService();

    it('joins article, dispositif and exposé, skipping empty parts', () => {
      const text = service.buildEmbeddingText({
        articleReference: 'Article 4',
        content: 'Supprimer cet article.',
        exposeSommaire: 'Cet article est superflu.',
      });
      expect(text).toBe(
        'Article visé: Article 4\n' +
          'Dispositif: Supprimer cet article.\n' +
          'Exposé sommaire: Cet article est superflu.',
      );
    });

    it('omits missing or blank fields', () => {
      const text = service.buildEmbeddingText({
        articleReference: null,
        content: 'Supprimer cet article.',
        exposeSommaire: '  ',
      });
      expect(text).toBe('Dispositif: Supprimer cet article.');
    });

    it('truncates very long inputs to the model window', () => {
      const text = service.buildEmbeddingText({
        content: 'x'.repeat(50_000),
      });
      expect(text.length).toBeLessThanOrEqual(24_000);
    });
  });

  describe('toVectorLiteral', () => {
    const service = makeService();

    it('formats a pgvector literal', () => {
      expect(service.toVectorLiteral([0.5, -1, 0.12345678912])).toBe(
        '[0.50000000,-1.00000000,0.12345679]',
      );
    });
  });
});
