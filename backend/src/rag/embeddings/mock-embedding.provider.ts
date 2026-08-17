import { createHash } from 'crypto';
import type { EmbeddingProvider } from './embedding.interface';

/** Deterministic local embeddings so Qdrant works without a paid API. */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'mock-embeddings';

  constructor(private readonly dimensions: number) {}

  embedText(text: string): Promise<number[]> {
    const cleaned = text.trim();
    if (!cleaned) return Promise.resolve([]);
    const vector = new Array<number>(this.dimensions).fill(0);
    const tokens = cleaned.toLowerCase().split(/\s+/).slice(0, 64);
    for (const token of tokens) {
      const buf = createHash('sha256').update(token).digest();
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] += (buf[i % buf.length] - 128) / 128;
      }
    }
    const norm = Math.sqrt(vector.reduce((s, x) => s + x * x, 0)) || 1;
    return Promise.resolve(vector.map((x) => x / norm));
  }
}
