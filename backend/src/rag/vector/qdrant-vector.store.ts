import { createHash } from 'crypto';
import { Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { RagEvidence, RagVectorMetadata } from '../rag.types';
import type {
  CorpusMeta,
  VectorPoint,
  VectorStore,
  VectorStoreDescription,
} from './vector-store.interface';

/** Reserved payload marker so corpus metadata is never returned as evidence. */
export const CORPUS_META_KIND = 'corpus_meta';
const CORPUS_META_ID = '__rag_corpus_meta__';

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
    apiKey?: string,
  ) {
    this.client = new QdrantClient({
      url,
      apiKey: apiKey || undefined,
      checkCompatibility: false,
    });
  }

  /**
   * Reports the collection's real shape. A missing collection is a normal
   * "not ingested yet" state, so it is reported rather than thrown.
   */
  async describe(): Promise<VectorStoreDescription> {
    try {
      const info = await this.client.getCollection(this.collection);
      const vectors = info.config?.params?.vectors;
      const dimensions =
        vectors && typeof vectors === 'object' && 'size' in vectors
          ? Number(vectors.size)
          : undefined;
      return {
        exists: true,
        dimensions,
        pointCount: info.points_count ?? 0,
        embeddingProvider: await this.readCorpusProvider(),
      };
    } catch (err) {
      if (isNotFound(err)) return { exists: false };
      throw err;
    }
  }

  async ensureCollection(dimensions: number): Promise<void> {
    const existing = await this.client.getCollections();
    const found = existing.collections?.some((c) => c.name === this.collection);
    if (!found) {
      await this.client.createCollection(this.collection, {
        vectors: { size: dimensions, distance: 'Cosine' },
      });
      this.logger.log(
        `Created Qdrant collection ${this.collection} dim=${dimensions}`,
      );
    }
    await this.ensureKindIndex();
  }

  /**
   * Writes a reserved point that `describe()` can read without searching.
   * Dimension mismatches are still caught from the collection vector size;
   * this records *which* embedding provider produced those vectors.
   */
  async writeCorpusMeta(meta: CorpusMeta): Promise<void> {
    const unit = 1 / Math.sqrt(meta.dimensions);
    await this.client.upsert(this.collection, {
      wait: true,
      points: [
        {
          id: toPointId(CORPUS_META_ID),
          vector: new Array(meta.dimensions).fill(unit),
          payload: {
            kind: CORPUS_META_KIND,
            embeddingProvider: meta.embeddingProvider,
            dimensions: meta.dimensions,
          },
        },
      ],
    });
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
    let points;
    try {
      points = await this.queryPoints(vector, limit + 1, true);
    } catch (err) {
      if (!isMissingPayloadIndex(err)) throw err;
      this.logger.warn(
        'Qdrant Cloud requires a payload index to filter on "kind"; retrying without the filter.',
      );
      await this.ensureKindIndex();
      points = await this.queryPoints(vector, limit + 1, false);
    }
    return points
      .filter((hit) => {
        const payload = (hit.payload ?? {}) as { kind?: unknown };
        return payload.kind !== CORPUS_META_KIND;
      })
      .slice(0, limit)
      .map((hit) => {
        const payload = (hit.payload ?? {}) as unknown as RagVectorMetadata;
        return {
          skill: payload.skill ?? '',
          role: payload.role ?? '',
          importance: payload.importance ?? 'important',
          evidence: payload.evidence ?? '',
          sourceName: payload.sourceName ?? '',
          sourceUrl: payload.sourceUrl ?? '',
          score: hit.score ?? 0,
          embeddingProvider: payload.embeddingProvider ?? '',
        };
      });
  }

  private async queryPoints(
    vector: number[],
    limit: number,
    excludeMeta: boolean,
  ) {
    const result = await this.client.query(this.collection, {
      query: vector,
      limit,
      with_payload: true,
      ...(excludeMeta
        ? {
            filter: {
              must_not: [{ key: 'kind', match: { value: CORPUS_META_KIND } }],
            },
          }
        : {}),
    });
    return result.points ?? [];
  }

  /**
   * Qdrant Cloud refuses filtered queries until the field has a payload index.
   */
  private async ensureKindIndex(): Promise<void> {
    try {
      await this.client.createPayloadIndex(this.collection, {
        wait: true,
        field_name: 'kind',
        field_schema: 'keyword',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/already exists|duplicate/i.test(message)) return;
      this.logger.warn(`Could not index payload field "kind": ${message}`);
    }
  }

  private async readCorpusProvider(): Promise<string | undefined> {
    try {
      const points = await this.client.retrieve(this.collection, {
        ids: [toPointId(CORPUS_META_ID)],
        with_payload: true,
      });
      const payload = points[0]?.payload as
        | { embeddingProvider?: unknown }
        | undefined;
      return typeof payload?.embeddingProvider === 'string'
        ? payload.embeddingProvider
        : undefined;
    } catch {
      return undefined;
    }
  }
}

function isMissingPayloadIndex(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const data =
    typeof err === 'object' && err && 'data' in err
      ? JSON.stringify((err as { data?: unknown }).data)
      : '';
  return /Index required but not found/i.test(`${message} ${data}`);
}

function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const status = (err as { status?: unknown }).status;
  if (status === 404) return true;
  const message = err instanceof Error ? err.message : '';
  return /not found|doesn't exist|does not exist/i.test(message);
}
