import type { EmbeddingProvider } from './embedding.interface';

export class NoopEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'noop-embeddings';
  readonly dimensions = 0;

  embedText(): Promise<number[]> {
    return Promise.resolve([]);
  }
}
