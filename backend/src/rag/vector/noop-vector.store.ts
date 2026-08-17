import type { RagEvidence } from '../rag.types';
import type { VectorStore } from './vector-store.interface';

export class NoopVectorStore implements VectorStore {
  readonly name = 'noop';

  ensureCollection(): Promise<void> {
    return Promise.resolve();
  }

  upsert(): Promise<number> {
    return Promise.resolve(0);
  }

  search(): Promise<RagEvidence[]> {
    return Promise.resolve([]);
  }
}
