import { createHash } from 'crypto';
import { Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { RagEvidence, RagVectorMetadata } from '../rag.types';
import type { VectorPoint, VectorStore } from './vector-store.interface';

function toPointId(id: string): string {
  const hex = createHash('sha256').update(id).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export class QdrantVectorStore implements VectorStore {
  readonly name = 'qdrant';
  private readonly logger = new Logger(QdrantVectorStore.name);
  private readonly client: QdrantClient;

  constructor(
    url: string,
    private readonly collection: string,
  ) {
    this.client = new QdrantClient({ url });
  }

  async ensureCollection(dimensions: number): Promise<void> {
    const existing = await this.client.getCollections();
    const found = existing.collections?.some((c) => c.name === this.collection);
    if (found) return;
    await this.client.createCollection(this.collection, {
      vectors: { size: dimensions, distance: 'Cosine' },
    });
    this.logger.log(
      `Created Qdrant collection ${this.collection} dim=${dimensions}`,
    );
  }

  async upsert(points: VectorPoint[]): Promise<number> {
    if (!points.length) return 0;
    await this.client.upsert(this.collection, {
      wait: true,
      points: points.map((p) => ({
        id: toPointId(p.id),
        vector: p.vector,
        payload: p.payload as unknown as Record<string, unknown>,
      })),
    });
    return points.length;
  }

  async search(vector: number[], limit: number): Promise<RagEvidence[]> {
    if (!vector.length) return [];
    const result = await this.client.query(this.collection, {
      query: vector,
      limit,
      with_payload: true,
    });
    return (result.points ?? []).map((hit) => {
      const payload = (hit.payload ?? {}) as unknown as RagVectorMetadata;
      return {
        skill: payload.skill ?? '',
        role: payload.role ?? '',
        importance: payload.importance ?? 'important',
        evidence: payload.evidence ?? '',
        sourceName: payload.sourceName ?? '',
        sourceUrl: payload.sourceUrl ?? '',
        score: hit.score ?? 0,
      };
    });
  }
}
