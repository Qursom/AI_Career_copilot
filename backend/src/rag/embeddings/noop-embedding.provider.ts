import type { EmbeddingProvider } from './embedding.interface';

export class NoopEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'noop-embeddings';

  embedText(): Promise<number[]> {
    return Promise.resolve([]);
  }
}
