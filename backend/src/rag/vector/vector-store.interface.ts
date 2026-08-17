import type { RagEvidence, RagVectorMetadata } from '../rag.types';

export const RAG_VECTOR_STORE = Symbol('RAG_VECTOR_STORE');

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: RagVectorMetadata;
}

export interface VectorStore {
  readonly name: string;
  ensureCollection(dimensions: number): Promise<void>;
  upsert(points: VectorPoint[]): Promise<number>;
  search(vector: number[], limit: number): Promise<RagEvidence[]>;
}
