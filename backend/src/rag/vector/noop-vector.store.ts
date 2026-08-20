import type { RagEvidence } from '../rag.types';
import type {
  CorpusMeta,
  VectorStore,
  VectorStoreDescription,
} from './vector-store.interface';

export class NoopVectorStore implements VectorStore {
  readonly name = 'noop';

  describe(): Promise<VectorStoreDescription> {
    return Promise.resolve({ exists: false });
  }

  ensureCollection(): Promise<void> {
    return Promise.resolve();
  }

  writeCorpusMeta(_meta: CorpusMeta): Promise<void> {
    return Promise.resolve();
  }

  upsert(): Promise<number> {
    return Promise.resolve(0);
  }

  search(): Promise<RagEvidence[]> {
    return Promise.resolve([]);
  }
}
