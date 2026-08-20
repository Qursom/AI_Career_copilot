import type { RagEvidence, RagVectorMetadata } from '../rag.types';

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: RagVectorMetadata;
}

/** What a store can tell us about its collection before we query it. */
export interface VectorStoreDescription {
  exists: boolean;
  /** Vector width the collection was created with, when known. */
  dimensions?: number;
  pointCount?: number;
  /**
   * Embedding provider recorded as collection metadata at ingest time.
   * Absent on collections that predate metadata writes.
   */
  embeddingProvider?: string;
}

export interface CorpusMeta {
  embeddingProvider: string;
  dimensions: number;
}

export interface VectorStore {
  readonly name: string;
  describe(): Promise<VectorStoreDescription>;
  ensureCollection(dimensions: number): Promise<void>;
  writeCorpusMeta(meta: CorpusMeta): Promise<void>;
  upsert(points: VectorPoint[]): Promise<number>;
  search(vector: number[], limit: number): Promise<RagEvidence[]>;
}
